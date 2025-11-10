

import { getAllAccounts, getPrivateKey, getChain, addTransaction , getLastUsedAccount, addChain, setLastChain } from '../helpers/storage';
import { ethers } from 'ethers'; // ethers.js इंस्टॉल करो: npm install ethers
import { decryptData } from '../helpers/encryption.jsx';

// Global error handling to avoid noisy "Errors" badge in Chrome extensions UI
try {
    // Handle unhandled promise rejections gracefully
    self.addEventListener('unhandledrejection', (event) => {
        try { console.warn('Unhandled promise rejection in background:', event?.reason); } catch (_) {}
        try { event?.preventDefault?.(); } catch (_) {}
    });
    // Handle uncaught errors without surfacing as extension errors
    self.addEventListener('error', (event) => {
        try { console.warn('Uncaught error in background:', event?.error || event?.message); } catch (_) {}
        try { event?.preventDefault?.(); } catch (_) {}
    });
} catch (_) {}

// Downgrade console.error to console.warn so benign errors don't trigger Chrome's error badge
try {
    // eslint-disable-next-line no-console
    console.error = function(...args) {
        try { console.warn(...args); } catch (_) {}
    };
} catch (_) {}

// पेंडिंग रिक्वेस्ट्स ट्रैक करने के लिए
const pendingRequests = new Map();
let approvalWindowId = null;
let onboardingWindowId = null;
let currentChainHex = null; // Persist selected chain across requests
let signingWindowId = null; // Separate window id for signing if needed

// Initialize current chain from storage (fallback to BNB Testnet 0x61)
try {
    chrome.storage.local.get('lastChain').then(({ lastChain }) => {
        currentChainHex = lastChain || '0x61';
    }).catch(() => { currentChainHex = '0x61'; });
} catch (_) {
    currentChainHex = '0x61';
}

// chrome.runtime.onMessage लिसनर
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'CUSTOM_WALLET_REQUEST') {
        handleWalletRequest(request.payload, sender).then(response => {
            sendResponse({ result: response });
        }).catch(error => {
            sendResponse({ error: error.message });
        });
        return true; // एसिंक्रोनस रिस्पॉन्स के लिए
    }

    if (request.type === 'APPROVAL_DECISION') {
        const { id, approved} = request;
        const resolver = pendingRequests.get(id);
        if (resolver) {
            const { origin, type } = resolver;
            pendingRequests.delete(id);
            
            if (approved) {
                
                getAllAccounts().then(async list => {
                    const addrs = Array.isArray(list) ? list.map(a => a.address) : [];
                    // Prefer last-used account if available
                    let selected = [];
                    try {
                        const last = await getLastUsedAccount();
                        if (last && addrs.includes(last)) selected = [last];
                    } catch (_) {}
                    if (selected.length === 0 && addrs.length > 0) selected = [addrs[0]];

                    // Notify only tabs from the same origin about the account change
                    if (type === 'connect' && addrs.length > 0 && origin) {
                        chrome.tabs.query({}, (tabs) => {
                            tabs.forEach(tab => {
                                if (tab.url && tab.url.includes(origin)) {
                                    try {
                                        chrome.tabs.sendMessage(tab.id, {
                                            type: 'accountsChanged',
                                            accounts: selected
                                        });
                                    } catch (e) {}
                                }
                            });
                        });
                    }
                    // Update approvedOrigins map to bind origin -> selected account
                    try {
                        const { approvedOrigins = {} } = await chrome.storage.local.get('approvedOrigins');
                        if (origin) {
                            approvedOrigins[origin] = {
                                account: selected[0] || null,
                                timestamp: Date.now(),
                                type: type || 'connect'
                            };
                            await chrome.storage.local.set({ approvedOrigins });
                        }
                    } catch(_) {}
                    
                   // Clear pending approval so popup doesn't persist
                   try { await chrome.storage.session.remove('pendingApproval'); } catch (_) {}
                   resolver.resolve(selected);
                }).catch(() => resolver.resolve([]));
            } else {
                resolver.reject(new Error('User rejected'));
                try { chrome.storage.session.remove('pendingApproval'); } catch (_) {}
            }
        }
    }

    if (request.type === 'TRANSACTION_APPROVAL') {
        const { id, approved, gasPrice } = request;
        const resolver = pendingRequests.get(id);
        if (resolver) {
            pendingRequests.delete(id);
            if (approved) {
                // ट्रांजैक्शन को साइन और ब्रॉडकास्ट करो
                handleTransactionApproval(id, gasPrice, resolver);
                try { 
                    chrome.storage.session.remove('pendingApproval'); 
                    chrome.storage.session.remove('pendingTransaction'); // Clear pending tx so UI doesn't loop
                } catch (_) {}
            } else {
                resolver.reject(new Error('User rejected transaction'));
                try { 
                    chrome.storage.session.remove('pendingApproval');
                    chrome.storage.session.remove('pendingTransaction');
                } catch (_) {}
            }
        }
    }
});

// वॉलेट रिक्वेस्ट्स को हैंडल करने का फंक्शन
async function handleWalletRequest(payload, sender) {
    // डायनामिक चेन ID और RPC URL लाओ (डिफॉल्ट BNB Testnet)
    const chain = await getChain(payload.chainId || currentChainHex || '0x61');
    const explicitOrigin = (() => { try { return payload.__origin || ''; } catch(_) { return ''; } })();
    const provider = new ethers.providers.JsonRpcProvider(chain.rpcUrl);

    switch (payload.method) {
        case 'eth_requestAccounts':
            return await requestAccountsApproval(sender);
        case 'eth_accounts': {
                // Only return accounts if this origin is approved
                const origin = explicitOrigin || (() => { try { return new URL(sender?.url || '').origin; } catch (_) { return ''; } })();
                try {
                    const { approvedOrigins = {} } = await chrome.storage.local.get('approvedOrigins');
                    if (!approvedOrigins[origin]) {
                        return [];
                    }
                } catch (_) {
                    return [];
                }

                const accounts = await getAllAccounts();
                console.log('[background.js] eth_accounts requested, accounts:', accounts);
                if (!accounts || accounts.length === 0) return [];

                // Optional: return only last used account first
                let lastUsedAccount = await getLastUsedAccount();
                if (lastUsedAccount && accounts.find(a => a.address === lastUsedAccount)) {
                    console.log('[background.js] Returning last used account:', lastUsedAccount);
                    return [lastUsedAccount];
                }

                // Fallback: return first account
                console.log('[background.js] Returning first account:', accounts[0].address);
                return [accounts[0].address];
            }
            
        case 'eth_sendTransaction':
            return await sendTransaction(payload.params[0], sender, provider, chain);
        case 'eth_estimateGas':
            return await estimateGas(payload.params[0], provider);
        case 'eth_getTransactionReceipt':
            // Return raw JSON-RPC receipt (hex strings), not ethers-rich object
            return await provider.send('eth_getTransactionReceipt', [payload.params[0]]);
        case 'eth_getBalance':
            return await provider.getBalance(payload.params[0] || '0x0', payload.params[1] || 'latest').then(b => b.toHexString());
        case 'eth_call':
            return await provider.call(payload.params[0], payload.params[1] || 'latest');
        case 'eth_gasPrice':
            return await provider.getGasPrice().then(g => g.toHexString());
        case 'eth_blockNumber':
            return await provider.getBlockNumber().then(n => '0x' + n.toString(16));
        case 'eth_getCode':
            return await provider.getCode(payload.params[0], payload.params[1] || 'latest');
        case 'net_version':
            return String(parseInt(chain.hex, 16));
        case 'web3_clientVersion':
            return 'ApolloWallet/1.0.0 (ethers.js)';
        case 'eth_getTransactionByHash':
            // Return raw JSON-RPC response (hex strings), not ethers-rich objects
            return await provider.send('eth_getTransactionByHash', [payload.params[0]]);
        case 'eth_getLogs':
            return await provider.send('eth_getLogs', [payload.params[0] || {}]);
        case 'eth_chainId':
            return chain.hex; // डायनामिक चेन ID
        case 'wallet_switchEthereumChain':
            // Switch chain
            try {
                const { chainId } = payload.params[0];
                const newChain = await getChain(chainId);
                currentChainHex = chainId;
                try { await chrome.storage.local.set({ lastChain: chainId }); } catch (_) {}
                try { await setLastChain(chainId); } catch (_) {}
                
                // Notify all content scripts about the chain change
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(tab => {
                        if (tab.url && tab.url.startsWith('http')) {
                            try {
                                chrome.tabs.sendMessage(tab.id, {
                                    type: 'chainChanged',
                                    chainId
                                });
                            } catch (e) {}
                        }
                    });
                });
                
                return null;
            } catch (error) {
                console.warn('Error switching chain:', error);
                throw error;
            }
        case 'wallet_addEthereumChain':
            return await addEthereumChain(payload.params[0]);
        case 'wallet_watchAsset':
            return await watchAsset(payload.params[0]);
        case 'wallet_disconnect':
        case 'eth_disconnect':
            // Handle disconnect request from dApps
            try {
                const origin = explicitOrigin || (() => { try { return new URL(sender?.url || '').origin; } catch (_) { return ''; } })();
                // Remove the origin from approved origins
                const { approvedOrigins = {} } = await chrome.storage.local.get('approvedOrigins');
                if (approvedOrigins[origin]) {
                    delete approvedOrigins[origin];
                    await chrome.storage.local.set({ approvedOrigins });
                }
                
                // Notify content scripts about disconnection
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(tab => {
                        if (origin && tab.url && tab.url.includes(origin)) {
                            try {
                                chrome.tabs.sendMessage(tab.id, {
                                    type: 'accountsChanged',
                                    accounts: [] // Empty array indicates disconnection
                                });
                            } catch (e) {}
                        }
                    });
                });
                
                return true; // Success
            } catch (error) {
                console.warn('Error disconnecting wallet:', error);
                return false;
            }
        case 'personal_sign':
            return await requestSigningApproval({ method: 'personal_sign', params: payload.params, sender, chain });
        case 'eth_signTypedData_v4':
        case 'eth_signTypedData':
            return await requestSigningApproval({ method: 'eth_signTypedData_v4', params: payload.params, sender, chain });
        default:
            throw new Error('Method not supported');
    }
}

// Handle account connection requests
async function requestAccountsApproval(sender) {
    return new Promise(async (resolve, reject) => {
        // Check if wallet exists
        let allAccounts = await getAllAccounts();
        if (!allAccounts || allAccounts.length === 0) {
            openOnboardingWindow();
            const start = Date.now();
            const timeoutMs = 120000;
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            while (Date.now() - start < timeoutMs) {
                await sleep(1000);
                allAccounts = await getAllAccounts();
                if (allAccounts && allAccounts.length > 0) break;
            }
            if (!allAccounts || allAccounts.length === 0) {
                reject(new Error('No wallet found. Please create a wallet first.'));
                return;
            }
        }

        // Get origin information for approval
        const id = crypto.randomUUID();
        const origin = (() => {
            try { return new URL(sender?.url || '').origin; } catch (_) { return ''; }
        })();
        
        // Check if this origin is already approved
        try {
            // Special handling for file:// origins (for local testing)
            if (origin === 'file://') {
                console.log('Detected file:// origin in requestAccountsApproval - allowing for local testing');
                // Auto-approve file:// origins for local testing
                const { approvedOrigins = {} } = await chrome.storage.local.get('approvedOrigins');
                if (!approvedOrigins[origin]) {
                    approvedOrigins[origin] = { 
                        timestamp: Date.now(),
                        type: 'connect'
                    };
                    await chrome.storage.local.set({ approvedOrigins });
                    console.log(`Added ${origin} to approved origins for local testing`);
                }
                // Return only last-used or first account and bind approval to that
                try {
                    const addrs = allAccounts.map(a => a.address);
                    const last = await getLastUsedAccount();
                    const selected = (last && addrs.includes(last)) ? [last] : (addrs[0] ? [addrs[0]] : []);
                
                    return resolve(selected);
                } catch (_) {
                    return resolve([allAccounts[0].address]);
                }
            }
            
            const { approvedOrigins = {} } = await chrome.storage.local.get('approvedOrigins');
            
            // If origin is already approved, return accounts immediately
            if (approvedOrigins[origin]) {
                console.log(`Origin ${origin} is already approved, returning last used`);
               
                // Fallback if no binding saved
                try {
                    const addrs = allAccounts.map(a => a.address);
                    const last = await getLastUsedAccount();
                    const selected = (last && addrs.includes(last)) ? [last] : (addrs[0] ? [addrs[0]] : []);
                    return resolve(selected);
                } catch (_) {
                    return resolve([allAccounts[0].address]);
                }
            }
        } catch (error) {
            console.warn('Error checking approved origins:', error);
        }

        // Set up approval request
        pendingRequests.set(id, { 
            resolve, 
            reject, 
            type: 'connect',
            origin,
            accounts: allAccounts
        });
        
        try { 
            await chrome.storage.session.set({ 
                pendingApproval: { 
                    id, 
                    origin,
                    type: 'connect'
                } 
            }); 
        } catch (error) {
            console.warn('Error setting pendingApproval:', error);
        }
        
        // Open approval popup
        if (chrome?.action?.openPopup) {
            try { 
                await chrome.action.openPopup(); 
            } catch (_) { 
                openApprovalWindow({ id, origin, type: 'connect' }); 
            }
        } else {
            openApprovalWindow({ id, origin, type: 'connect' });
        }
    });
}

// ट्रांजैक्शन भेजने का फंक्शन
async function sendTransaction(params, sender, provider, chain) {
    return new Promise(async (resolve, reject) => {
        const id = crypto.randomUUID();
        const origin = (() => {
            try { return new URL(sender?.url || '').origin; } catch (_) { return ''; }
        })();
        
        console.log('Transaction request from origin:', origin);
        
        // Check if origin is approved for transactions
        try {
            // Special handling for file:// origins (for local testing)
            if (origin === 'file://') {
                console.log('Detected file:// origin - allowing for local testing');
                // Auto-approve file:// origins for local testing
                const { approvedOrigins = {} } = await chrome.storage.local.get('approvedOrigins');
                if (!approvedOrigins[origin]) {
                    approvedOrigins[origin] = { 
                        timestamp: Date.now(),
                        type: 'connect'
                    };
                    await chrome.storage.local.set({ approvedOrigins });
                    console.log(`Added ${origin} to approved origins for local testing`);
                }
                
                // For file:// origins, we'll auto-approve transactions without showing the approval window
                // This is only for local testing purposes
                console.log('Auto-approving transaction for file:// origin');
                const allAccounts = await getAllAccounts();
                const fromAccount = allAccounts.find(acc => acc.address.toLowerCase() === params.from.toLowerCase());
                
                if (!fromAccount) {
                    return reject(new Error('From address not found in wallet'));
                }
                
                // Get gas estimates
                const gasEstimate = await provider.estimateGas(params);
                const gasPrice = await provider.getGasPrice();
                
                // Auto-approve the transaction
                try {
                    handleTransactionApproval(id, gasPrice.toString(), { 
                        resolve, 
                        reject, 
                        params, 
                        provider, 
                        chain, 
                        type: 'transaction',
                        origin
                    });
                } catch (error) {
                    console.warn('Error in auto-approval transaction:', error);
                    reject(new Error(`Transaction signing error: ${error.message}`));
                }
                
                return; // Skip the approval window for file:// origins
            } else {
                const { approvedOrigins = {} } = await chrome.storage.local.get('approvedOrigins');
                console.log('Approved origins:', approvedOrigins);
                
                // Check if this origin is in the approved list
                if (!approvedOrigins[origin]) {
                    console.warn(`Origin ${origin} is not in the approved list`);
                    
                    // If we have accounts but origin isn't approved, try to approve it automatically
                    // This is a fallback for when the connection state isn't properly saved
                    const accounts = await getAllAccounts();
                    if (accounts && accounts.length > 0) {
                        // First check if we should try to auto-connect
                        const autoConnect = await requestAccountsApproval(sender);
                        if (Array.isArray(autoConnect) && autoConnect.length > 0) {
                            // Successfully auto-connected, proceed with transaction
                            console.log('Auto-connected origin for transaction');
                        } else {
                            return reject(new Error('Origin not connected. Please connect first.'));
                        }
                    } else {
                        return reject(new Error('Origin not connected. Please connect first.'));
                    }}
            }
        } catch (error) {
            console.warn('Error checking approved origins:', error);
        }
        
        // Get account details and reconcile from address if needed
        const allAccounts = await getAllAccounts();
        let fromAccount = allAccounts.find(acc => acc.address && acc.address.toLowerCase() === (params.from || '').toLowerCase());
        if (!fromAccount) {
            try {
                const { approvedOrigins = {} } = await chrome.storage.local.get('approvedOrigins');
                const bound = approvedOrigins[origin]?.account;
                if (bound) {
                    fromAccount = allAccounts.find(acc => acc.address && acc.address.toLowerCase() === String(bound).toLowerCase());
                }
            } catch (_) {}
        }
        if (!fromAccount) {
            try {
                const last = await getLastUsedAccount();
                if (last) {
                    fromAccount = allAccounts.find(acc => acc.address && acc.address.toLowerCase() === String(last).toLowerCase());
                }
            } catch (_) {}
        }
        if (!fromAccount && allAccounts.length > 0) {
            fromAccount = allAccounts[0];
        }
        if (!fromAccount) {
            return reject(new Error('From address not found in wallet'));
        }
        // Normalize from to the resolved account to avoid mismatches
        params.from = fromAccount.address;

        // गैस फीस अनुमान
        const gasEstimate = await provider.estimateGas(params);
        const gasPrice = await provider.getGasPrice();

        // पेंडिंग ट्रांजैक्शन स्टोर करो
        pendingRequests.set(id, { 
            resolve, 
            reject, 
            params, 
            provider, 
            chain, 
            type: 'transaction',
            origin
        });
        try {
            await chrome.storage.session.set({
                pendingTransaction: {
                    id,
                    origin,
                    params,
                    gasEstimate: gasEstimate.toString(),
                    gasPrice: gasPrice.toString(),
                    chain,
                    type: 'transaction'
                }
            });
        } catch (_) {}

        // Prefer opening the extension action popup instead of a separate window.
        // App.jsx will auto-route to approval using chrome.storage.session.pendingTransaction
        try {
            if (chrome?.action?.openPopup) {
                await chrome.action.openPopup();
            } else {
                // Minimal fallback: open the popup page directly (still within action view)
                const fallbackUrl = chrome.runtime.getURL('index.html');
                chrome.tabs.create({ url: fallbackUrl, active: true });
            }
        } catch (err) {
            // As a last resort, do nothing (the user can click the action icon manually)
            console.warn('openPopup failed; user may need to click the extension icon:', err);
        }

        // Safety timeout: if approval not completed in time, reject to avoid infinite processing
        setTimeout(() => {
            if (pendingRequests.has(id)) {
                console.warn('Transaction approval timed out, rejecting request');
                pendingRequests.delete(id);
                try { chrome.storage.session.remove('pendingTransaction'); } catch(_) {}
                reject(new Error('Transaction approval timed out'));
            }
        }, 120000);
    });
}

// ट्रांजैक्शन अप्रूवल हैंडल करने का फंक्शन
async function handleTransactionApproval(id, gasPrice, resolver) {
    try {
        const { params, provider, chain, origin } = resolver;
        // Get the encrypted private key
        const encryptedPrivateKey = await getPrivateKey(params.from);
        
        // Decrypt the private key before using it with ethers.js
        const privateKey = decryptData(encryptedPrivateKey);
        
        // Create wallet with the decrypted private key
        const wallet = new ethers.Wallet(privateKey, provider);
        console.log('Wallet created successfully');

        console.log(`Signing transaction from ${params.from} to ${params.to} with value ${params.value || '0'} on chain ${chain.hex}`);
        
        // Prepare transaction fields safely (ethers v6 expects bigint for quantities)
        // 1) Nonce: always fetch current pending nonce to avoid "nonce too low"
        const nonce = await provider.getTransactionCount(params.from, 'pending');
        // 2) Gas limit: prefer provided value; otherwise estimate on the fly
        let gasLimit = params.gas ? params.gas : await provider.estimateGas({
            from: params.from,
            to: params.to,
            value: params.value || '0x0',
            data: params.data || '0x'
        });
        // Normalize gasLimit to bigint
        try { if (typeof gasLimit !== 'bigint') gasLimit = BigInt(gasLimit.toString()); } catch(_) { gasLimit = BigInt(gasLimit); }
        // 3) Value normalization (default to 0x0)
        let value = params.value || '0x0';
        try { value = typeof value === 'string' ? BigInt(value) : BigInt(value.toString()); } catch(_) { value = 0n; }
        // 4) Gas price normalization from approval input
        let gasPriceBig;
        try {
            if (typeof gasPrice === 'bigint') gasPriceBig = gasPrice;
            else if (typeof gasPrice === 'number') gasPriceBig = BigInt(gasPrice);
            else if (typeof gasPrice === 'string') gasPriceBig = gasPrice.startsWith('0x') ? BigInt(gasPrice) : BigInt(gasPrice);
            else if (gasPrice && typeof gasPrice.hex === 'string') gasPriceBig = BigInt(gasPrice.hex);
        } catch(_) {}
        if (typeof gasPriceBig !== 'bigint') {
            // fallback to provider suggestion
            try { gasPriceBig = await provider.getGasPrice(); } catch(_) { gasPriceBig = 0n; }
            if (typeof gasPriceBig !== 'bigint') {
                try { gasPriceBig = BigInt(gasPriceBig.toString()); } catch(_) { gasPriceBig = 0n; }
            }
        }

        // ट्रांजैक्शन ऑब्जेक्ट बनाओ
        const tx = {
            to: params.to,
            nonce,
            value,
            gasLimit,
            gasPrice: gasPriceBig,
            data: params.data || '0x',
            chainId: parseInt(chain.hex, 16)
        };

        // ट्रांजैक्शन साइन और ब्रॉडकास्ट करो
        const signedTx = await wallet.signTransaction(tx);
        const txResponse = await provider.sendTransaction(signedTx);
        
        console.log(`Transaction sent with hash: ${txResponse.hash}`);

        // ट्रांजैक्शन स्टोर करो
        await addTransaction(params.from, {
            hash: txResponse.hash,
            to: params.to,
            value: value,
            gas: gasLimit,
            gasPrice: gasPriceBig,
            data: tx.data,
            chainId: chain.hex,
            timestamp: Date.now(),
            origin
        }, chain.name, ethers.utils.formatEther(value));

        // ट्रांजैक्शन हैश रिटर्न करो
        resolver.resolve(txResponse.hash);
        try { await chrome.storage.session.remove('pendingTransaction'); } catch (_) {}
        
        // Wait for transaction receipt
        getTransactionReceipt(txResponse.hash, provider).then(receipt => {
            if (receipt && receipt.status === 1) {
                console.log(`Transaction ${txResponse.hash} confirmed successfully`);
                
                // Notify content scripts about successful transaction
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(tab => {
                        // Special handling for file:// origins
                        if (origin === 'file://') {
                            if (tab.url && tab.url.startsWith('file://')) {
                                try {
                                    console.log(`Sending transaction confirmation to file:// tab: ${tab.id}`);
                                    chrome.tabs.sendMessage(tab.id, {
                                        type: 'transactionConfirmed',
                                        hash: txResponse.hash,
                                        receipt
                                    });
                                } catch (e) {
                                    console.warn('Error sending message to file:// tab:', e);
                                }
                            }
                        } else if (tab.url && tab.url.includes(origin)) {
                            try {
                                chrome.tabs.sendMessage(tab.id, {
                                    type: 'transactionConfirmed',
                                    hash: txResponse.hash,
                                    receipt
                                });
                            } catch (e) {}
                        }
                    });
                });

                // Also notify extension views (popup/options) directly (ignore no-listener errors)
                try {
                    chrome.runtime.sendMessage({ type: 'wallet_transactionConfirmed', hash: txResponse.hash, receipt }, () => {
                        try { void chrome.runtime.lastError; } catch (_) {}
                    });
                } catch (_) {}
            } else {
                console.warn(`Transaction ${txResponse.hash} failed`);
            }
        }).catch((error) => {
            console.warn(`Error getting receipt for ${txResponse.hash}:`, error);
        });
    } catch (error) {
        console.warn('Transaction signing error:', error);
        resolver.reject(new Error('Transaction failed: ' + error.message));
        try { await chrome.storage.session.remove('pendingTransaction'); } catch (_) {}
    }
}

// गैस अनुमान
async function estimateGas(params, provider) {
    try {
        const gas = await provider.estimateGas(params);
        return gas.toHexString();
    } catch (error) {
        throw new Error('Gas estimation failed: ' + error.message);
    }
}

// ट्रांजैक्शन रिसीट
async function getTransactionReceipt(txHash, provider) {
    try {
        const receipt = await provider.getTransactionReceipt(txHash);
        return receipt;
    } catch (error) {
        throw new Error('Failed to get transaction receipt: ' + error.message);
    }
}

// अप्रूवल विंडो खोलने का फंक्शन
function openApprovalWindow({ id, origin }) {
    const url = chrome.runtime.getURL(`index.html#/approve?id=${id}&origin=${encodeURIComponent(origin)}`);
    if (onboardingWindowId != null) {
        try {
            chrome.tabs.query({ windowId: onboardingWindowId, active: true }, (tabs) => {
                const tab = tabs && tabs[0];
                if (tab && tab.id != null) {
                    chrome.tabs.update(tab.id, { url }, () => {
                        try { chrome.windows.update(onboardingWindowId, { focused: true }); } catch (_) {}
                        approvalWindowId = onboardingWindowId;
                        onboardingWindowId = null;
                    });
                } else {
                    chrome.windows.create({ url, type: 'popup', width: 405, height: 600 }, (win) => {
                        if (win && win.id != null) attachApprovalWindowHandlers(win.id);
                    });
                }
            });
        } catch (_) {
            chrome.windows.create({ url, type: 'popup', width: 405, height: 600 }, (win) => {
                if (win && win.id != null) attachApprovalWindowHandlers(win.id);
            });
        }
        return;
    }
    if (approvalWindowId != null) {
        try { chrome.windows.update(approvalWindowId, { focused: true }); } catch (_) {}
        return;
    }
    chrome.windows.create({ url, type: 'popup', width: 405, height: 600 }, (win) => {
        if (win && win.id != null) attachApprovalWindowHandlers(win.id);
    });
}
// Signing approval flow
async function requestSigningApproval({ method, params, sender, chain }) {
    return new Promise(async (resolve, reject) => {
        const id = crypto.randomUUID();
        const origin = (() => { try { return new URL(sender?.url || '').origin; } catch (_) { return ''; } })();

        // Persist pending signing details for Approve UI
        try {
            await chrome.storage.session.set({
                pendingSigning: {
                    id,
                    origin,
                    method,
                    params,
                    chain
                }
            });
        } catch (_) {}

        pendingRequests.set(id, { resolve, reject, type: 'sign', origin, method, params, chain });

        // Open approval UI in same generic approve route
        const url = chrome.runtime.getURL(`index.html#approve?id=${id}&origin=${encodeURIComponent(origin)}`);
        chrome.windows.create({ url, type: 'popup', width: 405, height: 600 }, (win) => {
            if (win && win.id != null) {
                signingWindowId = win.id;
                chrome.windows.onRemoved.addListener(function handle(removedId) {
                    if (removedId === signingWindowId) {
                        signingWindowId = null;
                        chrome.windows.onRemoved.removeListener(handle);
                    }
                });
            }
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SIGNING_APPROVAL') {
        const { id, approved } = request;
        const resolver = pendingRequests.get(id);
        if (resolver) {
            pendingRequests.delete(id);
            if (!approved) {
                resolver.reject(new Error('User rejected'));
                try { chrome.storage.session.remove('pendingSigning'); } catch (_) {}
                return;
            }
            // Perform signing
            performSigning(resolver).then(sig => {
                resolver.resolve(sig);
                try { chrome.storage.session.remove('pendingSigning'); } catch (_) {}
            }).catch(err => {
                resolver.reject(err);
                try { chrome.storage.session.remove('pendingSigning'); } catch (_) {}
            });
        }
    }
});

async function performSigning(resolver) {
    const { method, params, chain } = resolver;
    // Determine address param
    let address;
    let message;
    if (method === 'personal_sign') {
        // personal_sign params order is [message, address] in some libs, others reverse; handle both
        const p0 = params[0];
        const p1 = params[1];
        const isHexMessage = typeof p0 === 'string' && p0.startsWith('0x') && p0.length >= 4;
        message = isHexMessage ? p0 : p1;
        address = isHexMessage ? p1 : p0;
        if (!address) throw new Error('personal_sign: missing address');
        // Normalize message to bytes
        const bytes = ethers.utils.isHexString(message) ? ethers.utils.arrayify(message) : ethers.utils.toUtf8Bytes(message);
        const encryptedPrivateKey = await getPrivateKey(address);
        const privateKey = decryptData(encryptedPrivateKey);
        const wallet = new ethers.Wallet(privateKey);
        const signature = await wallet.signMessage(bytes);
        return signature;
    } else {
        // eth_signTypedData_v4 (params: [address, typedDataJson])
        address = params[0];
        const typedDataJson = params[1];
        const typedData = typeof typedDataJson === 'string' ? JSON.parse(typedDataJson) : typedDataJson;
        const encryptedPrivateKey = await getPrivateKey(address);
        const privateKey = decryptData(encryptedPrivateKey);
        const wallet = new ethers.Wallet(privateKey);
        // Use _signTypedData(domain, types, value)
        const { domain, types, message: value } = normalizeEip712(typedData);
        const signature = await wallet._signTypedData(domain, types, value);
        return signature;
    }
}

function normalizeEip712(data) {
    // EIP-712 v4 includes EIP712Domain inside types; ethers expects it removed
    const { types, domain, message, primaryType } = data;
    const cleanTypes = { ...types };
    delete cleanTypes.EIP712Domain;
    return { domain: domain || {}, types: cleanTypes, message };
}

// wallet_addEthereumChain support (minimal)
async function addEthereumChain(params) {
    const { chainId, chainName, nativeCurrency, rpcUrls, blockExplorerUrls } = params || {};
    if (!chainId || !rpcUrls || !rpcUrls.length) throw new Error('wallet_addEthereumChain: chainId and rpcUrls required');
    const hex = chainId.toLowerCase();
    const name = chainName || hex;
    const ticker = nativeCurrency?.symbol || 'ETH';
    const rpcUrl = rpcUrls[0];
    const blockExplorerUrl = (blockExplorerUrls && blockExplorerUrls[0]) || '';
    await addChain(hex, name, ticker, rpcUrl, blockExplorerUrl, true);
    currentChainHex = hex;
    try { await chrome.storage.local.set({ lastChain: hex }); } catch (_) {}
    // Notify pages about chain change
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url && tab.url.startsWith('http')) {
                try { chrome.tabs.sendMessage(tab.id, { type: 'chainChanged', chainId: hex }); } catch (_) {}
            }
        });
    });
    return null;
}

// wallet_watchAsset (minimal acknowledgment)
async function watchAsset(params) {
    // Many dapps expect a boolean; we don't maintain a watchlist UI yet
    return true;
}

// ऑनबोर्डिंग विंडो खोलने का फंक्शन
function openOnboardingWindow() {
    const url = chrome.runtime.getURL('index.html#/yourwallet');
    if (onboardingWindowId != null) {
        try { chrome.windows.update(onboardingWindowId, { focused: true }); } catch (_) {}
        return;
    }
    chrome.windows.create({ url, type: 'popup', width: 405, height: 600 }, (win) => {
        if (win && win.id != null) {
            onboardingWindowId = win.id;
            chrome.windows.onRemoved.addListener(function handle(id) {
                if (id === onboardingWindowId) {
                    onboardingWindowId = null;
                    chrome.windows.onRemoved.removeListener(handle);
                }
            });
        }
    });
}

// अप्रूवल विंडो हैंडलर्स जोड़ने का फंक्शन
function attachApprovalWindowHandlers(id) {
    approvalWindowId = id;
    chrome.windows.onRemoved.addListener(function handle(removedId) {
        if (removedId === approvalWindowId) {
            approvalWindowId = null;
            chrome.windows.onRemoved.removeListener(handle);
        }
    });
}