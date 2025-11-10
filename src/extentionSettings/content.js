// src/extensionSettings/content.js
console.log('[content.js] Content script loaded');

// Inject the page script
const injectScript = () => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    (document.head || document.documentElement).appendChild(script);

    script.onload = () => {
        console.log('[content.js] Inject script loaded');
        script.remove();
    };
};
injectScript();

// State
let isConnected = false;
let connectedAccounts = [];
let currentChainId = null;

// Listen messages from page
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data.direction || event.data.direction !== 'from-page-script') return;

    const message = event.data.message;

    if (message && message.method === 'getAccounts') {
        window.postMessage({
            direction: 'from-content-script',
            type: 'accountsChanged',
            accounts: connectedAccounts,
            connected: connectedAccounts.length > 0
        }, '*');
        return;
    }

    // Wallet injected
    if (message.method === 'wallet_injected') {
        console.log('[content.js] AXT Wallet successfully injected');
        return;
    }

    // Forward request to background.js with explicit origin
    const origin = (() => { try { return window.location.origin; } catch(_) { return ''; } })();
    const runtimeAvailable = !!(typeof chrome !== 'undefined' && chrome && chrome.runtime && chrome.runtime.id);
    if (!runtimeAvailable) {
        // Extension was reloaded or context invalidated; fail gracefully to page
        window.postMessage({
            direction: 'from-content-script',
            message: { error: 'Extension context invalidated' }
        }, '*');
        return;
    }

    try {
        chrome.runtime.sendMessage({ type: 'CUSTOM_WALLET_REQUEST', payload: { ...message, __origin: origin } }, (response) => {
            // Handle runtime errors (e.g., context invalidated during callback)
            try { void chrome.runtime.lastError; } catch(_) {}
        if (!response) {
            window.postMessage({
                direction: 'from-content-script',
                message: { error: 'Extension communication error' }
            }, '*');
            return;
        }

        if (message.method === 'eth_requestAccounts' && response.result && Array.isArray(response.result)) {
            isConnected = true;
            connectedAccounts = response.result;
            console.log('[content.js] Connection established in content script:', connectedAccounts);

            window.postMessage({
                direction: 'from-content-script',
                type: 'accountsChanged',
                accounts: response.result,
                connected: true
            }, '*');
        }

        if (message.method === 'eth_accounts') {
            window.postMessage({
                direction: 'from-content-script',
                type: 'accountsChanged',
                accounts: response.result || [],
                connected: !!(response.result && response.result.length > 0)
            }, '*');
        }

        if (message.method === 'eth_chainId' && response.result) currentChainId = response.result;

        // Send back full response for other methods
        window.postMessage({ direction: 'from-content-script', message: response }, '*');
    });
    } catch (e) {
        // Final safety: if sendMessage throws synchronously
        window.postMessage({
            direction: 'from-content-script',
            message: { error: 'Extension context invalidated' }
        }, '*');
    }
});

// Listen messages from background.js
chrome.runtime.onMessage.addListener((message) => {
    if (!message) return;

    switch (message.type) {
        case 'accountsChanged':
            connectedAccounts = message.accounts;
            window.postMessage({ direction: 'from-content-script', type: 'accountsChanged', accounts: message.accounts }, '*');
            break;
        case 'chainChanged':
            currentChainId = message.chainId;
            window.postMessage({ direction: 'from-content-script', type: 'chainChanged', chainId: message.chainId }, '*');
            break;
        case 'CUSTOM_WALLET_DIRECT_RESPONSE':
            // Directly forward a fabricated RPC response back to the page to resolve pending Promise
            if (message.payload) {
                window.postMessage({ direction: 'from-content-script', message: message.payload }, '*');
            }
            break;
        case 'transactionConfirmed':
            // Forward explicit hash and receipt fields for page listeners
            window.postMessage({ 
                direction: 'from-content-script', 
                type: 'transactionConfirmed', 
                hash: message.hash,
                receipt: message.receipt
            }, '*');
            break;
    }

    // Handle getAccounts requests from inject.js
    if (message.method === 'getAccounts') {
        window.postMessage({ direction: 'from-content-script', type: 'accountsChanged', accounts: connectedAccounts }, '*');
    }

    return false;
});
