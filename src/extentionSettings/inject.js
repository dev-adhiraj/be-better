// src/extensionSettings/inject.js
console.log('Injected script loaded');
// Ensure any stray references don't throw in page context
try { if (typeof window.setLastUsedAccount !== 'function') window.setLastUsedAccount = function noop() {}; } catch(_) {}

class CustomEthereumProvider {
    constructor() {
        this.selectedAddress = null;
        this.activeAddress = null; // Track currently active account
        this.chainId = null; // Current chain ID
        this.isMyCustomWallet = true;
        this.isApolloWallet = true;
        this.connected = false;

        this._events = {};

        // Restore connection state
        this.checkConnectionState();

        // Initialize chain ID
        this.setChainId();

        // Listen to content script messages
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;

            const data = event.data;

            if (data.direction === 'from-content-script') {
                switch (data.type) {
                    case 'accountsChanged':
                        this.selectedAddress = data.accounts[0] || null;
                        this.activeAddress = data.accounts[0] || null;
                        this.connected = !!this.activeAddress;
                        console.log('[inject.js] accountsChanged event received:', data.accounts);
                        this._emitEvent('accountsChanged', data.accounts);
                        break;
                    case 'chainChanged':
                        this.chainId = data.chainId;
                        console.log('[inject.js] chainChanged event received:', this.chainId);
                        this._emitEvent('chainChanged', this.chainId);
                        break;
                    case 'transactionConfirmed':
                        this._emitEvent('transactionConfirmed', data.hash);
                        break;
                }
            }
        });
    }

    // Event handling (EIP-1193)
    on(eventName, listener) {
        if (!this._events[eventName]) this._events[eventName] = [];
        this._events[eventName].push(listener);
        return this;
    }

    removeListener(eventName, listener) {
        if (this._events[eventName]) {
            this._events[eventName] = this._events[eventName].filter(l => l !== listener);
        }
        return this;
    }

    _emitEvent(eventName, ...args) {
        if (this._events[eventName]) {
            this._events[eventName].forEach(listener => {
                try { listener(...args); } 
                catch (error) { console.error(`[inject.js] Error in ${eventName}:`, error); }
            });
        }
    }

    // Set chain ID
    async setChainId() {
        try {
            const storedChain = window.localStorage?.getItem('lastChain');
            this.chainId = storedChain || '0x61'; // default BNB Testnet
        } catch (e) {
            console.warn('[inject.js] Unable to read lastChain from localStorage, using default.', e);
            this.chainId = '0x61';
        }
    }

   // Restore selected account by asking content script (cannot access extension APIs directly here)
   async checkConnectionState() {
    return new Promise((resolve) => {
        const handler = (event) => {
            if (event.source !== window) return;
            if (event.data.direction === 'from-content-script' && event.data.type === 'accountsChanged') {
                const accounts = event.data.accounts || [];
                this.selectedAddress = accounts[0] || null;
                this.activeAddress = this.selectedAddress;
                this.connected = !!this.selectedAddress;
                window.removeEventListener('message', handler);
                console.log('[inject.js] Connection state restored, connected:', this.connected, 'address:', this.selectedAddress);
                resolve();
            }
        };
        window.addEventListener('message', handler);
        // Ask content script for currently known accounts
        window.postMessage({
            direction: 'from-page-script',
            message: { method: 'getAccounts' }
        }, '*');
        // Fallback timeout to resolve even if no response
        setTimeout(() => { try { window.removeEventListener('message', handler); } catch(_){} resolve(); }, 1500);
    });
}

    // EIP-1193 request
    request(args) {
        return new Promise((resolve, reject) => {
            console.log('[inject.js] Request received:', args);

            // If the site previously connected to Apollo, prefer this provider
            try {
                const origin = window.location.origin;
                const connected = localStorage.getItem('apolloWallet_connected_' + origin) === 'true';
                if (connected && window.ethereum && window.ethereum !== this) {
                    // If the dapp is calling a generic window.ethereum that is not us, override methods to route to Apollo
                    try {
                        if (Array.isArray(window.ethereum.providers)) {
                            const found = window.ethereum.providers.find(p => p && p.isApolloWallet);
                            if (found) {
                                // no-op, we are already available via providers
                            }
                        } else {
                            // Soft hijack only for this call by replacing request temporarily
                        }
                    } catch(_) {}
                }
            } catch(_) {}

            // Handle eth_chainId locally for immediate resolution
            if (args.method === 'eth_chainId') {
                const currentChainId = this.chainId || '0x61';
                console.log('[inject.js] eth_chainId =>', currentChainId);
                resolve(currentChainId);
                return;
            }

            // Handle wallet_switchEthereumChain locally (update state & emit event)
            if (args.method === 'wallet_switchEthereumChain') {
                try {
                    const params = Array.isArray(args.params) ? args.params[0] : args.params;
                    const nextChainId = params && (params.chainId || params.chainIdHex);
                    if (!nextChainId) {
                        reject(new Error('wallet_switchEthereumChain: chainId is required in params[0].chainId'));
                        return;
                    }
                    // Update internal state
                    this.chainId = nextChainId;
                    try { window.localStorage?.setItem('lastChain', nextChainId); } catch(_) {}
                    console.log('[inject.js] wallet_switchEthereumChain ->', nextChainId);
                    // Inform content script as best-effort (real network switch handled there)
                    try {
                        window.postMessage({
                            direction: 'from-page-script',
                            message: { method: 'wallet_switchEthereumChain', params: [{ chainId: nextChainId }] }
                        }, '*');
                    } catch(_) {}
                    // Emit chainChanged
                    this._emitEvent('chainChanged', nextChainId);
                    resolve(null);
                } catch (e) {
                    reject(e);
                }
                return;
            }

            // Handle eth_accounts
            if (args.method === 'eth_accounts') {
                console.log('[inject.js] eth_accounts request: selectedAddress =', this.selectedAddress);
                const handler = (event) => {
                    if (event.source !== window) return;
                    if (event.data.direction === 'from-content-script' && event.data.type === 'accountsChanged') {
                        const accounts = event.data.accounts || [];
                        this.activeAddress = accounts[0] || null;
                        this.connected = !!this.activeAddress;
                        window.removeEventListener('message', handler);
                        console.log('[inject.js] eth_accounts resolved with:', accounts);
                        resolve(accounts);
                    }
                };
                window.addEventListener('message', handler);

                // Ask content script for accounts
                window.postMessage({
                    direction: 'from-page-script',
                    message: { method: 'getAccounts' }
                }, '*');

                return;
            }
            
            // Handle wallet_disconnect or eth_disconnect
            if (args.method === 'wallet_disconnect' || args.method === 'eth_disconnect') {
                console.log('[inject.js] Disconnect request received');
                
                // Clear local connection state
                this.selectedAddress = null;
                this.activeAddress = null;
                this.connected = false;
                
                try {
                    // Remove local storage connection flag
                    const origin = window.location.origin;
                    localStorage.removeItem('apolloWallet_connected_' + origin);
                } catch (e) {
                    console.error('[inject.js] Error clearing local connection state:', e);
                }
                
                // Set up handler for disconnect response
                const handler = (event) => {
                    if (event.source !== window) return;
                    if (event.data.direction === 'from-content-script' && 
                        event.data.message && 
                        (event.data.message.result === true || event.data.message.result === false)) {
                        window.removeEventListener('message', handler);
                        
                        // Emit accountsChanged with empty array to indicate disconnection
                        this._emitEvent('accountsChanged', []);
                        
                        console.log('[inject.js] Disconnect completed');
                        resolve(event.data.message.result);
                    }
                };
                window.addEventListener('message', handler);
                
                // Send disconnect request to content script
                window.postMessage({
                    direction: 'from-page-script',
                    message: { method: args.method }
                }, '*');
                
                // Set a timeout to resolve even if no response
                setTimeout(() => {
                    try { 
                        window.removeEventListener('message', handler);
                        this._emitEvent('accountsChanged', []);
                        resolve(true);
                    } catch(e) {
                        console.error('[inject.js] Error in disconnect timeout handler:', e);
                        resolve(false);
                    }
                }, 1000);
                
                return;
            }

            // Forward other requests to content.js
            window.postMessage({ direction: 'from-page-script', message: args }, '*');

            const handler = (event) => {
                if (event.source !== window) return;
                if (event.data.direction === 'from-content-script' && event.data.message) {
                    const msg = event.data.message;

                    if (msg.error) reject(new Error(msg.error));
                    else {
                        // Handle eth_requestAccounts result
                        if (args.method === 'eth_requestAccounts' && Array.isArray(msg.result)) {
                            this.selectedAddress = msg.result[0] || null;
                            this.activeAddress = msg.result[0] || null;
                            this.connected = !!this.activeAddress;
                            console.log('[inject.js] Connection established, address:', this.activeAddress);
                            this._emitEvent('accountsChanged', msg.result);
                            try {
                                const res = setLastUsedAccount(this.activeAddress);
                                if (res && typeof res.catch === 'function') {
                                    res.catch(console.error);
                                }
                            } catch (e) {
                                console.error('[inject.js] Error calling setLastUsedAccount:', e);
                            }

                            try {
                                const origin = window.location.origin;
                                localStorage.setItem('apolloWallet_connected_' + origin, 'true');
                                localStorage.setItem('apolloWallet_address', this.activeAddress);
                            } catch (e) { console.warn('Could not store connection state:', e); }
                        }
                        resolve(msg.result);
                    }
                    window.removeEventListener('message', handler);
                }
            };
            window.addEventListener('message', handler);
        });
    }

    get providerInfo() {
        return {
            // Stable UUID for this provider (do not change once published)
            uuid: '8d9f2c0e-2b7f-4b98-9b8f-7b6a5f2f3a11',
            name: 'Apollo Wallet',
            // Embedded PNG icon (data URI) for maximum compatibility across dapps
            icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MjNENjE3QTQ4RUZGMTFGMEI5NzVGQTQ3RTE4OUE0MDIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MjNENjE3QTU4RUZGMTFGMEI5NzVGQTQ3RTE4OUE0MDIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDoyM0Q2MTdBMjhFRkYxMUYwQjk3NUZBNDdFMTg5QTQwMiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDoyM0Q2MTdBMzhFRkYxMUYwQjk3NUZBNDdFMTg5QTQwMiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PpKfP10AAATVSURBVHjarJcLkI1lGMe/s27RsWERzUqr0kVjlOgyS6tSk4RJsWUUTVaFUbNDjMSYqbEzJDGZ3XYtKiGXrQw1lVU2aaIahEkXFgmjIqFYp/8z83vNO9+cr93O6Zv5zbl93/s+l//zvM+JJRKJINXrw5JYI71cKbanukZGkN7VVNybzpoZKXidK67nYwvRXTTk8wPi2v+yXn0vlA+Kxb0LEudqeeYXUaxnFul1kOgs5outwgwbVod9W4t7xEIXgebiBdGlDg//IDaJF8VuUSYuEJPFm+KvOqwxQDx5PgK66olLxVTRLyL09Ql5jsgVS8XV4lZRIirFQFEt9oljIlk04xh71NeA3VwlLtdGkyKsjmPc0+T5V3GXuAgj9oo7xBjRSzSIWGee+EPsFLGYlaE2HacPbcRv4lFRKi0URUTCNnxOtCcdN4qPxGAxFz1EXa+zz7ZwBAoJr9X0M4Y2mi7qJVnkuLhQXMPm3yNG01HjiI1bivdI2UzSeJPo7wzYI4aizHxq+z7xmYzoGlqst8giHZWEfYa4X/QUl4Tut/u+ICWPiHGk0Nbf4gywkjoi9oshYhI1/Y2FV0YUiTj3HhAjlaKfqABb/C3xtRgrXGs1US8j7K+StiXidvGzOGxl6KpgLcreQz7HUNNWKm+I18xiGZGvjbd63p00WYR6hPN6gdhIo7pNrBe/i4niCn474CJQhDIfIpcPU0rvkJJb8HC1jMgKGbAyFPIbxHLWHEV6irnvKRy19S4To50Bn4gCcvs4KekgViG0FeTOItbnvBgKEjV6aRUqOVtnHWkxjZwyLRGFCvTVAScrnAHWSN4WP9IRV6F2E+VB8tZD7BJNvJLMxDi//1slfCWGi7YY3Y28l9BBj9D0Ps/AkzN6mSLWiDxrEORzBw2ohpPPIrTF22wYWsn3vlvPd6fZvBFO7CNaFv6XRbl/GMWo5aHUeFe6Y4DXJwizGfItzzSjZwSEczrPbELEZ8XfaCoTx5rSQa+ic1a7CFjpzOJhaz6lKL8xB81ZjG1B/uwagZBcyQ3gfRdKMU6pNcCwl9BFQ0rT9BDE/IlIXtmPfclfXyrjBEZ8wG2d8Hg17dhdVr7TUHs5TckZmIkz5thixJl0ILEuNh6lVrFQE0+9HWm9g9nczo5nOfV6YNwxjLeofExE5yJw64QjfSHHwjOhotARD7NZKCBs1XxXiGBzULUtuBndzEFDdyLibFKxn1LfTQQORY5k0sN3Yio5vxhdnCGca9g4hyY0i8cWeCPZp4Q8m2hsJHJ7uf9QrTMhp+AiavUw4rNKeV885jaVobt4v5zabksaK6mYdkzMz9Puk8+ESaJQQzdbJ2OGM3BUMP+1w7MZoTPAGtIT9IRCDrTmtPOqlKdiGVNOfy9zc5y95zT0r/l43Zm896IDVqU9lmszaygTyK1NMjOZEf1rM0ILaEQB2kn/f4E2u44Ssmu2+FNs0PevoP6A5jOP93l4/7/9MZlAMzpIH7ep6GY8dZ7bKfol50cGn9M3QF7m0RfsmqN0WHd8l6YzhQGzJ63bjt1m3DswyXiWUgTae+NasdOE2CGmMfHcTdnGvU2zGHD+9YrV5d+xomCjdCttuC3Jb/5Haz79OVlzmQE6MVukbkAtxkX91I15wQbRDVE3/SPAADkScpC5R0QfAAAAAElFTkSuQmCC',
            // Stable reverse-DNS identifier
            rdns: 'io.zeusx.apollowallet'
        };
    }
}

// Inject provider
(async () => {
    const provider = new CustomEthereumProvider();
    await provider.setChainId();

    if (!window.apolloWallet) window.apolloWallet = provider;
    if (!window.myCustomWallet) window.myCustomWallet = provider;

    if (!window.ethereum) {
        window.ethereum = provider;
        try { window.ethereum.providers = [provider]; } catch(_) {}
        console.log('[inject.js] Set Apollo Wallet as window.ethereum');
    } else {
        console.log('[inject.js] window.ethereum exists, Apollo Wallet available as window.apolloWallet');
        try {
            if (Array.isArray(window.ethereum.providers)) {
                if (!window.ethereum.providers.includes(provider)) {
                    window.ethereum.providers.push(provider);
                }
            } else {
                // Preserve the existing primary provider (e.g., MetaMask) and expose multi-providers
                window.ethereum.providers = [window.ethereum, provider];
            }
        } catch(_) {}
    }

    // If this origin previously connected to Apollo Wallet, prefer Apollo Wallet as the primary provider
    try {
        const origin = window.location.origin;
        const wasConnectedHere = localStorage.getItem('apolloWallet_connected_' + origin) === 'true';
        if (wasConnectedHere) {
            const previous = window.ethereum;
            if (previous !== provider) {
                // Promote Apollo Wallet to primary and keep the previous as secondary
                try {
                    const list = Array.isArray(previous?.providers) ? previous.providers.filter(p => p && p !== provider) : [previous];
                    window.ethereum = provider;
                    window.ethereum.providers = [provider, ...list];
                    console.log('[inject.js] Promoted Apollo as primary provider for this origin');
                } catch (e) {
                    window.ethereum = provider;
                }
            }
        }
    } catch(_) {}

    // Announce provider (EIP-6963)
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: { info: provider.providerInfo, provider }
    }));

    // Respond to requestProvider events by announcing again (per EIP-6963)
    try {
        window.addEventListener('eip6963:requestProvider', () => {
            window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
                detail: { info: provider.providerInfo, provider }
            }));
        });
    } catch(_) {}

    window.postMessage({
        direction: 'from-page-script',
        message: { method: 'wallet_injected' }
    }, '*');
})();
