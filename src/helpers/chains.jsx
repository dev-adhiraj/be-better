// chains.jsx
// Responsible for fetching chainId from RPCs and initializing default chains.
// Depends on: axios and storage.js exports (addChain, getChain)

import axios from 'axios';
import { addChain, getChain } from './storage';

// --- List of initial chains to seed (you can add more) ---
const InitialChains = [
    {
        name: 'OLYMPUS',
        ticker: "OLYM",
        blockExplorerUrl: 'https://olympusexplorer.io',
        rpcUrl: `https://mainnet-rpc.olympusexplorer.io`,
        hex: '0x1a4', // Known Olympus chain ID
        userAdded: false,
    },
    {
        name: 'ZEUS Mainnet',
        ticker: "ZEUSX",
        blockExplorerUrl: 'https://zeuschainscan.io/',
        rpcUrl: `https://mainnet-rpc.zeuschainscan.io`,
        userAdded: false,
    },
    {
        name: 'ETHEREUM',
        ticker: "ETH",
        blockExplorerUrl: 'https://etherscan.com/',
        rpcUrl: `https://1rpc.io/eth`,
        hex: '0x1', // Known Ethereum chain ID
        userAdded: false,
    },
    {
        name: 'POLYGON',
        ticker: "POL",
        blockExplorerUrl: 'https://polygonscan.com/',
        rpcUrl: `https://endpoints.omniatech.io/v1/matic/mainnet/public`,
        hex: '0x89', // Known Polygon chain ID
        userAdded: false,
    },
    {
        name: 'BNB Smart Chain',
        ticker: "BNB",
        blockExplorerUrl: 'https://bscscan.com/',
        rpcUrl: `https://bsc-rpc.publicnode.com/`,
        hex: '0x38', // Known BSC chain ID
        userAdded: false,
    },
    {
        name: 'BNB Smart Chain Testnet',
        ticker: "tBNB",
        blockExplorerUrl: 'https://testnet.bscscan.com/',
        rpcUrl: `https://bsc-testnet-rpc.publicnode.com`,
        hex: '0x61', // Known BSC Testnet chain ID
        userAdded: false,
    },
];

// --- Helper to get chainId (hex) from rpcUrl ---
const getHex = async (rpcUrl) => {
    try {
        const requestPayload = {
            jsonrpc: "2.0",
            method: "eth_chainId",
            params: [],
            id: 1
        };

        const response = await axios.post(rpcUrl, requestPayload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (response.data && response.data.result) {
            return String(response.data.result).toLowerCase();
        } else {
            throw new Error('Unexpected response format');
        }
    } catch (error) {
        throw new Error(`Failed to fetch chainId from ${rpcUrl}: ${error.message}`);
    }
};

// --- Public: Add a user-specified chain by RPC (idempotent via storage.addChain) ---
export const addUserChain = async (name, ticker, rpcUrl, blockExplorerUrl) => {
    try {
        const hex = await getHex(rpcUrl);
        if (!hex) {
            throw new Error('Failed to get chain data');
        }
        await addChain(hex, name, ticker, rpcUrl, blockExplorerUrl, 1);
        return { success: true, hex };
    } catch (error) {
        // throw a human-friendly message
        throw new Error(`Unable to add chain. Please verify RPC URL: ${error.message}`);
    }
};

// --- Initialize the DB with InitialChains (optimized with hardcoded chain IDs) ---
export const initializeChainsDb = async () => {
    try {
        // Process all chains in parallel for faster initialization
        const chainPromises = InitialChains.map(async (chain) => {
            try {
                // Prefer provided hex; if missing, fetch via RPC once
                let hex = chain.hex ? String(chain.hex).toLowerCase() : null;
                if (!hex) {
                    try {
                        hex = await getHex(chain.rpcUrl);
                    } catch (rpcErr) {
                        console.warn(`Could not fetch chainId for ${chain.name}:`, rpcErr?.message || rpcErr);
                        return; // skip if neither hex nor RPC works
                    }
                }

                // Check if chain already exists
                const existing = await getChain(hex);
                if (existing) {
                    await addChain(hex, chain.name, chain.ticker, chain.rpcUrl, chain.blockExplorerUrl, chain.userAdded);
                    return;
                }

                await addChain(hex, chain.name, chain.ticker, chain.rpcUrl, chain.blockExplorerUrl, chain.userAdded);
            } catch (innerErr) {
                console.error(`Failed to initialize chain ${chain.name}:`, innerErr.message || innerErr);
            }
        });

        await Promise.all(chainPromises);
    } catch (error) {
        console.error('Failed to initialize chains database:', error);
        throw error;
    }
};
