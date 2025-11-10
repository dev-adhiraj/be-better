import { utils as ethersUtils } from "ethers";

const TRUST_BASE = "https://cdn.jsdelivr.net/gh/trustwallet/assets@master";
const COINGECKO_BASE = "https://api.coingecko.com";
const APOLLO_TOKEN_CDN = "https://wallet.io/tokens/"; // https://BeBetter.io/tokens/
const ZEUSX_TOKEN_CDN = "https://apollowallet.io/tokens/"; // https://tokens.zeusx.io/zeus/

// Map common chainIds (hex, lowercase) to slugs/platform ids
export const CHAIN_ICON_MAP = {
  "0x1": { tw: "ethereum", cg: "ethereum" },
  "0x5": { tw: "ethereum", cg: "ethereum" }, // goerli -> fallback to eth for icons
  "0xaa36a7": { tw: "ethereum", cg: "ethereum" }, // sepolia
  "0x38": { tw: "smartchain", cg: "binance-smart-chain" },
  "0x61": { tw: "smartchain", cg: "binance-smart-chain" }, // bsc testnet
  "0x89": { tw: "polygon", cg: "polygon-pos" },
  "0x13881": { tw: "polygon", cg: "polygon-pos" }, // mumbai
  "0xa86a": { tw: "avalanchec", cg: "avalanche" },
  "0xa4b1": { tw: "arbitrum", cg: "arbitrum-one" },
  "0x66eed": { tw: "arbitrum", cg: "arbitrum-nova" },
  "0x420": { tw: "optimism", cg: "optimistic-ethereum" },
  "0x2105": { tw: "base", cg: "base" },
};

const iconCache = new Map();

async function urlExists(url, timeoutMs = 5000) { // Increased timeout to 5000ms
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal });
    console.log(`urlExists: Checked ${url}, status: ${res.status}`);
    return res.ok;
  } catch (e) {
    console.warn(`urlExists: Failed for ${url}, error: ${e.message}`);
    return false;
  } finally {
    clearTimeout(id);
  }
}

export async function getTokenIconUrl({ chainId, address, tokenListLogoUri }) {
  const normalizedChainId = String(chainId || "").toLowerCase();
  const cacheKey = `${normalizedChainId}:${String(address || "").toLowerCase()}`;
  if (iconCache.has(cacheKey)) {
    console.log(`getTokenIconUrl: Using cache for ${cacheKey}`);
    return iconCache.get(cacheKey);
  }

  const mapping = CHAIN_ICON_MAP[normalizedChainId];

  // 1) Trust Wallet by address (best-effort)
  if (mapping && address) {
    try {
      const checksum = ethersUtils.getAddress(address);
      const twUrl = `${TRUST_BASE}/blockchains/${mapping.tw}/assets/${checksum}/logo.png`;
      console.log(`getTokenIconUrl: Trying Trust Wallet URL: ${twUrl}`);
      if (await urlExists(twUrl)) {
        iconCache.set(cacheKey, twUrl);
        return twUrl;
      }
    } catch (e) {
      console.warn(`getTokenIconUrl: Trust Wallet error for ${address}: ${e.message}`);
    }
  }

  // 2) CoinGecko by contract address
  if (mapping && address) {
    try {
      const cgUrl = `${COINGECKO_BASE}/api/v3/coins/${mapping.cg}/contract/${address}`;
      console.log(`getTokenIconUrl: Trying CoinGecko URL: ${cgUrl}`);
      const res = await fetch(cgUrl, { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        const fromCg = data?.image?.small || data?.image?.thumb || data?.image?.large;
        if (fromCg) {
          iconCache.set(cacheKey, fromCg);
          return fromCg;
        }
      }
    } catch (e) {
      console.warn(`getTokenIconUrl: CoinGecko error for ${address}: ${e.message}`);
    }
  }

  // 3) Provided token list logoURI
  if (tokenListLogoUri) {
    console.log(`getTokenIconUrl: Using tokenListLogoUri: ${tokenListLogoUri}`);
    iconCache.set(cacheKey, tokenListLogoUri);
    return tokenListLogoUri;
  }

  // 4) Chain-specific CDN by contract address
  if (address) {
    let cdnUrl;
    const checksum = ethersUtils.getAddress(address);
    const lowercase = address.toLowerCase();
    if (normalizedChainId === "0x86c8") { // ZeusX
      cdnUrl = `${ZEUSX_TOKEN_CDN}${checksum}.png`; // Try checksummed first
      console.log(`getTokenIconUrl: Trying ZeusX CDN URL (checksum): ${cdnUrl}`);
      if (await urlExists(cdnUrl)) {
        iconCache.set(cacheKey, cdnUrl);
        return cdnUrl;
      }
      cdnUrl = `${ZEUSX_TOKEN_CDN}${lowercase}.png`; // Fallback to lowercase
      console.log(`getTokenIconUrl: Trying ZeusX CDN URL (lowercase): ${cdnUrl}`);
      if (await urlExists(cdnUrl)) {
        iconCache.set(cacheKey, cdnUrl);
        return cdnUrl;
      }
    } else { // All other chains (Apollo)
      cdnUrl = `${APOLLO_TOKEN_CDN}${checksum}.png`; // Try checksummed first
      console.log(`getTokenIconUrl: Trying Apollo CDN URL (checksum): ${cdnUrl}`);
      if (await urlExists(cdnUrl)) {
        iconCache.set(cacheKey, cdnUrl);
        return cdnUrl;
      }
      cdnUrl = `${APOLLO_TOKEN_CDN}${lowercase}.png`; // Fallback to lowercase
      console.log(`getTokenIconUrl: Trying Apollo CDN URL (lowercase): ${cdnUrl}`);
      if (await urlExists(cdnUrl)) {
        iconCache.set(cacheKey, cdnUrl);
        return cdnUrl;
      }
    }
  }

  // 5) Generic fallback
  let genericUrl;
  if (normalizedChainId === "0x86c8") { // ZeusX
    genericUrl = `${ZEUSX_TOKEN_CDN}generic.png`;
  } else { // All other chains
    genericUrl = `${APOLLO_TOKEN_CDN}generic.png`;
  }
  console.log(`getTokenIconUrl: Falling back to generic URL: ${genericUrl}`);
  
  iconCache.set(cacheKey, genericUrl);
  return genericUrl;
}

export function clearTokenIconCache() {
  iconCache.clear();
}