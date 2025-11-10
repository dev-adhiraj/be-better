const IPFS_GATEWAYS = [
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

const LOCAL_GENERIC = "/svg/color/generic.svg";

const imageCache = new Map();

function toHttpFromIpfs(ipfsUri, gatewayIndex = 0) {
  const cid = ipfsUri.replace(/^ipfs:\/\//i, "");
  const base = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
  return `${base}${cid}`;
}

function isLocalIpfsUrl(url) {
  try {
    const u = new URL(url);
    return (
      (u.hostname === "127.0.0.1" || u.hostname === "localhost") &&
      u.pathname.startsWith("/ipfs/")
    );
  } catch {
    return false;
  }
}

function rewriteLocalIpfsToPublic(url) {
  try {
    const u = new URL(url);
    const path = u.pathname; // /ipfs/<cid>[/...]
    const withoutPrefix = path.replace(/^\/ipfs\//, "");
    // preserve any trailing path after CID
    return `${IPFS_GATEWAYS[0]}${withoutPrefix}`;
  } catch {
    return url;
  }
}

function upgradeToHttps(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "http:") {
      u.protocol = "https:";
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

async function urlExists(url, timeoutMs = 3000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(id);
  }
}

async function tryIpfsGateways(ipfsUri) {
  for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
    const httpUrl = toHttpFromIpfs(ipfsUri, i);
    if (await urlExists(httpUrl)) return httpUrl;
  }
  return null;
}

function isProbablyImageUrl(url) {
  return /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg)(\?.*)?$/i.test(url);
}

export async function resolveNftImageUrl({ tokenURI }) {
  const key = String(tokenURI || "");
  if (imageCache.has(key)) return imageCache.get(key);

  if (!tokenURI) {
    imageCache.set(key, LOCAL_GENERIC);
    return LOCAL_GENERIC;
  }

  // data URI (already an image or JSON)
  if (tokenURI.startsWith("data:")) {
    imageCache.set(key, tokenURI);
    return tokenURI;
  }

  // IPFS direct image
  if (tokenURI.startsWith("ipfs://") && isProbablyImageUrl(tokenURI)) {
    const httpUrl = await tryIpfsGateways(tokenURI);
    if (httpUrl) {
      imageCache.set(key, httpUrl);
      return httpUrl;
    }
  }

  // HTTP(s) direct image
  if (/^https?:\/\//i.test(tokenURI) && isProbablyImageUrl(tokenURI)) {
    let direct = tokenURI;
    if (isLocalIpfsUrl(direct)) direct = rewriteLocalIpfsToPublic(direct);
    direct = upgradeToHttps(direct);
    imageCache.set(key, direct);
    return direct;
  }

  // Otherwise, treat as metadata JSON (HTTP or IPFS)
  try {
    let metaUrl = tokenURI;
    if (tokenURI.startsWith("ipfs://")) {
      const http = await tryIpfsGateways(tokenURI);
      if (http) metaUrl = http;
    }
    // Avoid localhost metadata over http in extension/https context
    if (isLocalIpfsUrl(metaUrl)) metaUrl = rewriteLocalIpfsToPublic(metaUrl);
    metaUrl = upgradeToHttps(metaUrl);
    const res = await fetch(metaUrl, { method: "GET" });
    if (res.ok) {
      const meta = await res.json().catch(() => null);
      const candidate = meta?.image || meta?.image_url || meta?.imageUrl;
      if (typeof candidate === "string" && candidate) {
        if (candidate.startsWith("ipfs://")) {
          const http = await tryIpfsGateways(candidate);
          if (http) {
            imageCache.set(key, http);
            return http;
          }
        }
        let finalUrl = candidate;
        if (isLocalIpfsUrl(finalUrl)) finalUrl = rewriteLocalIpfsToPublic(finalUrl);
        finalUrl = upgradeToHttps(finalUrl);
        imageCache.set(key, finalUrl);
        return finalUrl;
      }
    }
  } catch {}

  imageCache.set(key, LOCAL_GENERIC);
  return LOCAL_GENERIC;
}

export function clearNftImageCache() {
  imageCache.clear();
}


