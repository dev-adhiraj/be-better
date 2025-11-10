// storage.jsx
// IndexedDB helper utilities for the wallet app
// Dependencies: idb (npm install idb)

import { openDB } from 'idb';

// --- Config ---
const dbName = 'cryptoWallet';
const dbVersion = 1;
const walletData = 'walletData';
const chainData = 'chainData';
const userData = 'userData';

export const walletDataColumnNames = ['name', 'connectedSites', 'address', 'transactions', 'tokens', 'Nfts', 'walletKey', 'pinned', 'imported'];

// --- DB Open / Upgrade ---
const dbPromise = openDB(dbName, dbVersion, {
    upgrade(db) {
        if (!db.objectStoreNames.contains(walletData)) {
            const store = db.createObjectStore(walletData, { keyPath: 'address' });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('connectedSites', 'connectedSites', { multiEntry: true });
            store.createIndex('transactions', 'transactions', { multiEntry: true });
            store.createIndex('tokens', 'tokens', { multiEntry: true });
            store.createIndex('Nfts', 'Nfts', { multiEntry: true });
            store.createIndex('walletKey', 'walletKey', { unique: true });
            store.createIndex('pinned', 'pinned', { unique: true });
            store.createIndex('imported', 'imported', { unique: true });
        }

        if (!db.objectStoreNames.contains(chainData)) {
            const store = db.createObjectStore(chainData, { keyPath: 'hex' });
            store.createIndex('name', 'name', { unique: true });
            store.createIndex('ticker', 'ticker', { unique: false });
            store.createIndex('rpcUrl', 'rpcUrl', { unique: false });
            store.createIndex('blockExplorerUrl', 'blockExplorerUrl', { unique: false });
            store.createIndex('userAdded', 'userAdded', { unique: false });
        }

        if (!db.objectStoreNames.contains(userData)) {
            const store = db.createObjectStore(userData, { keyPath: 'userId' });
            store.createIndex('lastChain', 'lastChain', { unique: false });
            store.createIndex('password', 'password', { unique: false });
            store.createIndex('childCount', 'childCount', { unique: false });
        }
    },
});

// --- Utility: normalize hex keys ---
const normalizeHex = (hex) => {
    if (hex === null || typeof hex === 'undefined') return null;
    return String(hex).toLowerCase();
};

// --- Local / Session Storage helpers ---
export const setLocalStorage = (key, value) => {
    localStorage.setItem(key, value);
};

export const deleteAccount = async (address) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readwrite');
        const store = tx.objectStore(walletData);

        // Get the actual stored account object
        const account = await store.get(address); // use exact case
        if (!account) {
            throw new Error(`No account found for address ${address}`);
        }

        await store.delete(account.address); // delete by the exact key
        await tx.done;
        console.log(`Account ${address} deleted from storage`);
    } catch (error) {
        console.error('Error deleting account from storage:', error);
        throw error;
    }
};



export const getLocalStorage = (key) => {
    return localStorage.getItem(key);
};

export const clearLocalStorage = () => {
    localStorage.clear();
};

export const setTemporaryLocalStorage = (key, value, expireInHours) => {
    const timestamp = Date.now() + expireInHours * 60 * 60 * 1000;
    localStorage.setItem(key, JSON.stringify({ value, timestamp }));
};

export const getTemporaryLocalStorage = (key) => {
    const item = localStorage.getItem(key);
    if (item) {
        try {
            const { value, timestamp } = JSON.parse(item);
            if (Date.now() < timestamp) {
                return value;
            } else {
                localStorage.removeItem(key);
            }
        } catch {
            localStorage.removeItem(key);
        }
    }
    return null;
};

export const deleteLocalStorageItem = (key) => {
    localStorage.removeItem(key);
};

export const setSessionStorage = (key, value) => {
    sessionStorage.setItem(key, JSON.stringify(value));
};

export const getSessionStorage = (key) => {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
};

// --- Single user id for simple apps ---
const userId = "KuchBhi";

// --- User data helpers ---
export const userDataSetField = async (field, value) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(userData, 'readwrite');
        const store = tx.objectStore(userData);
        const existing = await store.get(userId);
        const user = existing ? existing : { userId };
        user[field] = value;
        await store.put(user);
        await tx.done;
    } catch (error) {
        console.error('Error accessing database (userDataSetField):', error);
        throw error;
    }
};

export const setLastChain = (value) => userDataSetField('lastChain', value);
export const setPass = (value) => userDataSetField('password', value);
export const setChildCount = (value) => userDataSetField('childCount', value);

// --- Store the last used account ---
export const setLastUsedAccount = async (address) => {
    await userDataSetField('lastAccount', address);
};

// --- Get the last used account ---
export const getLastUsedAccount = async () => {
    return await userDataGetField('lastAccount');
};


export const userDataGetField = async (field) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(userData, 'readonly');
        const store = tx.objectStore(userData);
        const request = await store.get(userId);
        if (request) {
            return request[field];
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error accessing database (userDataGetField):', error);
        throw error;
    }
};

export const getLastChain = () => userDataGetField('lastChain');
export const getPass = () => userDataGetField('password');
export const getChildCount = () => userDataGetField('childCount');

// --- IndexedDB: Chain helpers (idempotent + normalized) ---
export const addChain = async (hex, name, ticker, rpcUrl, blockExplorerUrl, userAdded) => {
    try {
        if (!hex) throw new Error('hex is required');
        const normalizedHex = normalizeHex(hex);
        const db = await dbPromise;
        const tx = db.transaction(chainData, 'readwrite');
        const store = tx.objectStore(chainData);
        const existingChain = await store.get(normalizedHex);

        if (existingChain) {
            // Idempotent update: merge & keep userAdded if already true
            const merged = {
                hex: normalizedHex,
                name: name || existingChain.name,
                ticker: ticker || existingChain.ticker,
                rpcUrl: rpcUrl || existingChain.rpcUrl,
                blockExplorerUrl: blockExplorerUrl || existingChain.blockExplorerUrl,
                userAdded: typeof userAdded !== 'undefined' ? (existingChain.userAdded || userAdded) : existingChain.userAdded
            };
            await store.put(merged);
            await tx.done;
            return merged;
        }

        const record = { hex: normalizedHex, name, ticker, rpcUrl, blockExplorerUrl, userAdded };
        await store.put(record);
        await tx.done;
        return record;
    } catch (error) {
        console.error('Error adding chain in IndexedDB:', error);
        throw error;
    }
};

export const editChain = async (hex, name, ticker, blockExplorerUrl) => {
    try {
        const normalizedHex = normalizeHex(hex);
        const db = await dbPromise;
        const tx = db.transaction(chainData, 'readwrite');
        const store = tx.objectStore(chainData);
        const data = await store.get(normalizedHex);
        if (!data) {
            throw new Error(`No chain found for ID ${normalizedHex}`);
        }
        const newData = {
            hex: normalizedHex,
            name,
            ticker,
            rpcUrl: data.rpcUrl,
            blockExplorerUrl,
            userAdded: data.userAdded
        };
        await store.put(newData);
        await tx.done;
        return newData;
    } catch (error) {
        console.error('Error editing chain in IndexedDB:', error);
        throw error;
    }
};

export const deleteChain = async (hex) => {
    try {
        const normalizedHex = normalizeHex(hex);
        const db = await dbPromise;
        const tx = db.transaction(chainData, 'readwrite');
        const store = tx.objectStore(chainData);
        const existingChain = await store.get(normalizedHex);
        if (!existingChain) {
            throw new Error(`No chain found for ID ${normalizedHex}`);
        }
        await store.delete(normalizedHex);
        await tx.done;
        // Optionally update lastChain to a safe default
        await userDataSetField('lastChain', '0x38');
    } catch (error) {
        console.error('Error deleting chain from IndexedDB:', error);
        throw error;
    }
};

export const getChain = async (hex) => {
    try {
        if (!hex) return null;
        const normalizedHex = normalizeHex(hex);
        const db = await dbPromise;
        const tx = db.transaction(chainData, 'readonly');
        const store = tx.objectStore(chainData);
        const chain = await store.get(normalizedHex);
        // return null if not found (don't throw) — easier for callers
        return chain || null;
    } catch (error) {
        console.error('Error fetching chain from IndexedDB:', error);
        throw error;
    }
};

export const getAllChains = async () => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(chainData, 'readonly');
        const store = tx.objectStore(chainData);
        const allChains = await store.getAll();
        const chainsObject = allChains.reduce((acc, chain) => {
            if (chain && chain.hex) {
                acc[normalizeHex(chain.hex)] = chain;
            }
            return acc;
        }, {});
        return chainsObject;
    } catch (error) {
        console.error('Error fetching all chains from IndexedDB:', error);
        throw error;
    }
};

// --- Wallet accounts helpers ---
export const createAccountEntry = async (address, name, walletKey) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readwrite');
        const store = tx.objectStore(walletData);
        await store.put({ address, name, connectedSites: [], transactions: [], tokens: [], Nfts: [], walletKey });
        await tx.done;
    } catch (error) {
        console.error('Error creating account entry in IndexedDB:', error);
        throw error;
    }
};

export const updateAccountName = async (address, newName) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readwrite');
        const store = tx.objectStore(walletData);
        const data = await store.get(address);
        if (!data) {
            throw new Error(`No account found for address ${address}`);
        }
        data.name = newName;
        await store.put(data);
        await tx.done;
    } catch (error) {
        console.error('Error updating account name in IndexedDB:', error);
        throw error;
    }
};

export const setAccountPinned = async (address, pinned) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readwrite');
        const store = tx.objectStore(walletData);
        const data = await store.get(address);
        if (!data) {
            throw new Error(`No account found for address ${address}`);
        }
        data.pinned = !!pinned;
        await store.put(data);
        await tx.done;
    } catch (error) {
        console.error('Error updating pinned in IndexedDB:', error);
        throw error;
    }
};

export const setAccountHidden = async (address, hidden) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readwrite');
        const store = tx.objectStore(walletData);
        const data = await store.get(address);
        if (!data) {
            throw new Error(`No account found for address ${address}`);
        }
        data.hidden = !!hidden;
        await store.put(data);
        await tx.done;
    } catch (error) {
        console.error('Error updating hidden in IndexedDB:', error);
        throw error;
    }
};

export const getAccountName = async (address) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readonly');
        const store = tx.objectStore(walletData);
        const data = await store.get(address);
        if (!data) {
            return null;
        }
        return data.name;
    } catch (error) {
        console.error('Error fetching account name from IndexedDB:', error);
        throw error;
    }
};

export const countAccounts = async () => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readonly');
        const store = tx.objectStore(walletData);
        const allAccounts = await store.getAll();
        return allAccounts.length;
    } catch (error) {
        console.error('Error counting accounts in IndexedDB:', error);
        throw error;
    }
};


export const addTransaction = async (address, chainTransaction, chainName, amount) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readwrite');
        const store = tx.objectStore(walletData);
        const data = await store.get(address);
        if (!data) {
            throw new Error(`No account found for address ${address}`);
        }
        if (!data.transactions) {
            data.transactions = [];
        }
        chainTransaction['chainName'] = chainName;
        chainTransaction['amount'] = amount;
        chainTransaction['txHash'] = chainTransaction.hash;
        chainTransaction['status'] = 'pending';
        data.transactions.push(chainTransaction);
        await store.put(data);
        await tx.done;
    } catch (error) {
        console.error('Error adding transaction in IndexedDB:', error);
        throw error;
    }
};


// ---------- TRANSACTIONS ----------
export const getTransactions = async (address, chainName) => {
  try {
    if (!address) {
      throw new Error('Address is required to fetch transactions.');
    }
    const db = await dbPromise;
    const tx = db.transaction(walletData, 'readonly');
    const store = tx.objectStore(walletData);
    const data = await store.get(address);
    if (!data || !data.transactions) {
      return [];
    }
    // If chainName not provided, return all transactions
    if (!chainName) return data.transactions;

    // filter by chainName (string compare)
    const filtered = data.transactions.filter(txn => {
      try {
        const tChain = txn.chainName ? String(txn.chainName).toLowerCase() : '';
        return tChain === String(chainName).toLowerCase();
      } catch {
        return false;
      }
    });
    return filtered;
  } catch (error) {
    console.error('Error fetching transactions from IndexedDB:', error);
    throw error;
  }
};

export const getPrivateKey = async (address) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readonly');
        const store = tx.objectStore(walletData);
        // Try exact match first (keyPath)
        let data = await store.get(address);
        // Fallback: case-insensitive lookup if exact key not found
        if (!data) {
            try {
                const all = await store.getAll();
                const lower = String(address || '').toLowerCase();
                const match = all.find(a => a && a.address && String(a.address).toLowerCase() === lower);
                if (match) data = match;
            } catch (_) {}
        }
        if (!data || !data.walletKey) {
            throw new Error(`No private key found for address ${address}`);
        }
        return data.walletKey;
    } catch (error) {
        console.error('Error fetching private key:', error);
        throw error;
    }
};

// ---------- TOKENS (getTokens, addToken, removeToken) ----------

// Utility to compare tokens for duplication
function areTokensEqual(token1, token2) {
    return (
        token1.name === token2.name &&
        token1.symbol === token2.symbol &&
        token1.totalSupply === token2.totalSupply &&
        token1.decimals === token2.decimals &&
        token1.chain === token2.chain &&
        // include address equality to be safe
        token1.address === token2.address
    );
}

// Add token to an account (throws if duplicate)
export const addToken = async (address, token) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readwrite');
        const store = tx.objectStore(walletData);
        const data = await store.get(address);
        if (!data) {
            throw new Error(`No account found for address ${address}`);
        }
        if (!data.tokens) data.tokens = [];
        const isDuplicate = data.tokens.some(t => areTokensEqual(t, token));
        if (isDuplicate) {
            throw new Error(`Token already exists for address ${address}`);
        }
        data.tokens.push(token);
        await store.put(data);
        await tx.done;
        return token;
    } catch (error) {
        console.error('Error adding token in IndexedDB:', error);
        throw error;
    }
};

// Remove token
export const removeToken = async (address, tokenToRemove) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readwrite');
        const store = tx.objectStore(walletData);
        const data = await store.get(address);
        if (!data || !data.tokens) {
            throw new Error(`No tokens found for address ${address}`);
        }
        data.tokens = data.tokens.filter(token => !areTokensEqual(token, tokenToRemove));
        await store.put(data);
        await tx.done;
    } catch (error) {
        console.error('Error removing token from IndexedDB:', error);
        throw error;
    }
};

// Get tokens for an address filtered by chain (chain can be hex or your chain identifier)
export const getTokens = async (address, chain) => {
    try {
        if (!address) {
            throw new Error('Address is required to fetch tokens.');
        }
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readonly');
        const store = tx.objectStore(walletData);
        const data = await store.get(address);
        if (!data) {
            return [];
        }
        const tokens = data.tokens && Array.isArray(data.tokens)
            ? data.tokens.filter(token => {
                // If token.chain stored as hex normalize comparison; allow matching by selectedChain value
                if (!chain) return true;
                const tokenChain = token.chain ? String(token.chain).toLowerCase() : null;
                const requestedChain = String(chain).toLowerCase();
                return tokenChain === requestedChain;
            })
            : [];
        return tokens;
    } catch (error) {
        console.error('Error fetching tokens from IndexedDB:', error);
        throw error;
    }
};

// ---------- NFTs ----------
function areNFTsEqual(nft1, nft2) {
    return (
        nft1.name === nft2.name &&
        nft1.symbol === nft2.symbol &&
        nft1.tokenId === nft2.tokenId &&
        nft1.chain === nft2.chain &&
        nft1.nftId === nft2.nftId &&
        nft1.address === nft2.address
    );
}

export const addNFT = async (address, nft, nftId) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readwrite');
        const store = tx.objectStore(walletData);
        const data = await store.get(address);
        if (!data) {
            throw new Error(`No account found for address ${address}`);
        }
        if (!data.Nfts) data.Nfts = [];
        const isDuplicate = data.Nfts.some(n => areNFTsEqual(n, nft));
        if (isDuplicate) {
            throw new Error(`NFT already exists for address ${address}`);
        }
        data.Nfts.push(nft);
        await store.put(data);
        await tx.done;
    } catch (error) {
        console.error('Error adding NFT in IndexedDB:', error);
        throw error;
    }
};

export const removeNFT = async (address, nftToRemove) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readwrite');
        const store = tx.objectStore(walletData);
        const data = await store.get(address);
        if (!data || !data.Nfts) {
            throw new Error(`No NFTs found for address ${address}`);
        }
        data.Nfts = data.Nfts.filter(nft => !areNFTsEqual(nft, nftToRemove));
        await store.put(data);
        await tx.done;
    } catch (error) {
        console.error('Error removing NFT from IndexedDB:', error);
        throw error;
    }
};

export const getNFTs = async (address, chain) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readonly');
        const store = tx.objectStore(walletData);
        const data = await store.get(address);
        if (!data) return [];
        const nfts = data.Nfts && Array.isArray(data.Nfts)
            ? data.Nfts.filter(nft => nft.chain === chain)
            : [];
        return nfts;
    } catch (error) {
        console.error('Error fetching NFTs from IndexedDB:', error);
        throw error;
    }
};

// ---------- Wallet data getters ----------
export const getWalletData = async (address) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readonly');
        const store = tx.objectStore(walletData);
        const data = await store.get(address);
        return data ? data : null;
    } catch (error) {
        console.error('Error getting data from IndexedDB:', error);
        throw error;
    }
};


export const getAllAccounts = async () => {
    try {
        const db = await dbPromise;
        const tx = db.transaction(walletData, 'readonly');
        const store = tx.objectStore(walletData);
        const allAccounts = await store.getAll();
        if (allAccounts.length > 0) {
            // Ensure boolean defaults
            const normalized = allAccounts.map(a => ({ ...a, pinned: !!a.pinned, hidden: !!a.hidden }));
            // Sort: pinned first, then by name
            const sorted = normalized.sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });
            return sorted;
        }
        return [];
    } catch (error) {
        if (error.name === 'NotFoundError' || error.message.includes('not found')) {
            return [];
        }
        console.error('Error listing all accounts in IndexedDB:', error);
        throw error;
    }
};

// --- DB Wipe (dev only) ---
export const clearIndexedDB = () => {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

