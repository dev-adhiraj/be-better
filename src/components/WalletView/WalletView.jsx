import React, { useEffect, useRef, useState } from "react";
import AccountDropdown from "../AccountDropdown/AccountDropdown";
import WalletViewContent from "./WalletViewContent";
import { getAccountName, getLastChain, getChain , getLastUsedAccount, setLastUsedAccount} from "../../helpers/storage";
import Web3 from "web3";
import CopyButton from "../CopyButton";
import ChainSelector from "../ChainSelector/ChainSelector";
import LockButton from "../LockButton";
import { Spin } from "antd";
import axios from "axios";

const WalletView = ({ walletAddress, setWalletAddress }) => {
  const [selectedChain, setSelectedChain] = useState();
  const [chain, setChain] = useState({});
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [accountName, setAccountName] = useState("");
  const dropdownRef = useRef();
  const [tokenPriceUsd, setTokenPriceUsd] = useState(null);

  // Simple price cache to avoid repeated API calls
  const priceCache = useRef(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const getPriceForChainToken = async (chainObj, symbol, address) => {
    try {
      const ticker = chainObj?.ticker ? String(chainObj.ticker).toUpperCase() : null;
      const cacheKey = `${ticker}-${address || 'native'}`;
      
      // Check cache first
      const cached = priceCache.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.price;
      }

      let price = undefined;
      
      if (ticker === "ZEUSX") {
        const r = await axios.get("https://apollowallet.io/api/zeusolympus.php?chain=zeusx", { timeout: 5000 });
        price = r?.data?.derivedUSD ? parseFloat(r.data.derivedUSD) : undefined;
      } else if (ticker === "OLYM") {
        const r = await axios.get("https://apollowallet.io/api/zeusolympus.php?chain=olym", { timeout: 5000 });
        price = r?.data?.derivedUSD ? parseFloat(r.data.derivedUSD) : undefined;
      } else if (ticker && ticker !== "UNDEFINED") {
        try {
          const url = `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(ticker)}USDT`;
          const res = await axios.get(url, { timeout: 3000 });
          price = res?.data?.price ? parseFloat(res.data.price) : undefined;
        } catch {}
      }
      
      if (!price && address) {
        try {
          const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, { timeout: 3000 });
          if (res.ok) {
            const data = await res.json();
            const pairs = Array.isArray(data?.pairs) ? data.pairs : [];
            if (pairs.length) {
              const top = pairs.sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0];
              price = top ? parseFloat(top.priceUsd) : undefined;
            }
          }
        } catch {}
      }
      
      if (!price && symbol) {
        try {
          const idGuess = String(symbol).trim().toLowerCase();
          const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(idGuess)}&vs_currencies=usd`;
          const r = await fetch(url, { timeout: 3000 });
          if (r.ok) {
            const j = await r.json();
            price = j?.[idGuess]?.usd ? parseFloat(j[idGuess].usd) : undefined;
          }
        } catch {}
      }

      // Cache the result
      if (price !== undefined) {
        priceCache.current.set(cacheKey, { price, timestamp: Date.now() });
      }
      
      return price;
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetchPrice = async () => {
      if (!chain) return;
      const price = await getPriceForChainToken(chain, chain?.nativeTokenSymbol || chain?.ticker, chain?.nativeTokenAddress || null);
      if (!mounted) return;
      setTokenPriceUsd(price ?? 0);
    };
    
    // Only fetch price once on mount, not every 60 seconds
    fetchPrice();
    
    // Optional: fetch price every 5 minutes instead of 1 minute
    const id = setInterval(fetchPrice, 300000); // 5 minutes
    return () => { mounted = false; clearInterval(id); };
  }, [chain?.ticker]);

  useEffect(() => {
    (async () => {
      try {
        const last = await getLastChain();
        const chainKey = last || "0x38";
        setSelectedChain(chainKey);
        const cd = await getChain(chainKey);
        setChain(cd || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!selectedChain || !walletAddress) {
          setAccountName("");
          setBalance(0);
          return;
        }
        const cd = await getChain(selectedChain);
        setChain(cd || {});
        const web3 = new Web3(cd?.rpcUrl);
        const name = await getAccountName(walletAddress);
        setAccountName(name || "");
        const wei = await web3.eth.getBalance(walletAddress);
        const eth = web3.utils.fromWei(wei, "ether");
        const num = Number(eth);
        setBalance(num.toFixed(4));
      } catch (err) {
        console.error(err);
      }
    })();
  }, [walletAddress, selectedChain]);

  // Refresh balance on transaction confirmations
  useEffect(() => {
    const handler = async (msg) => {
      if (msg && msg.type === 'wallet_transactionConfirmed') {
        try {
          const cd = await getChain(selectedChain);
          const web3 = new Web3(cd?.rpcUrl);
          const wei = await web3.eth.getBalance(walletAddress);
          const eth = web3.utils.fromWei(wei, 'ether');
          const num = Number(eth);
          setBalance(num.toFixed(4));
        } catch (e) {}
      }
    };
    try { chrome.runtime.onMessage.addListener(handler); } catch(_) {}
    return () => { try { chrome.runtime.onMessage.removeListener(handler); } catch(_) {} };
  }, [walletAddress, selectedChain]);

  const handleAccountNameUpdate = async (address, newName, deleted = false) => {
    if (deleted && address === walletAddress) {
      setAccountName("");
      setWalletAddress(null);
      setBalance(0);
      await setLastUsedAccount(null); // clear last used
    } else if (address === walletAddress) {
      setAccountName(newName);
      await setLastUsedAccount(address); // save last used
    }
  };
  

if (loading) return <div><Spin size="large" /></div>;

  const numericBalance = Number(balance) || 0;
const displayUsd = numericBalance * (Number(tokenPriceUsd) || 0);

const formattedBalance = numericBalance.toLocaleString(undefined, { maximumFractionDigits: 6 });
const formattedUsd = displayUsd.toLocaleString(undefined, { maximumFractionDigits: 2 });



  return (
    <>
      <div className="acdetailsmn">
        <div className="acdetail" style={{ display: "flex", alignItems: "center", flexDirection: "row" }}>
          <div className="maindiv">
            <button className="accountname" onClick={() => dropdownRef.current?.openAddImportModal()}>
              <svg className="usericon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="28" height="28" fill="none" stroke="#FFD700" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="256" cy="144" r="72" />
                <path d="M128 400c0-70 58-128 128-128s128 58 128 128" />
              </svg>
              {accountName}
              <svg className="arrowicon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className="lockbtn"><LockButton /></div>
            <div className="accoutnid">
              <AccountDropdown ref={dropdownRef} walletAddress={walletAddress} setWalletAddress={setWalletAddress} selectedChain={selectedChain} onAccountNameUpdate={handleAccountNameUpdate} />
              <CopyButton content={walletAddress} />
            </div>
            <div className="selectchain">
              <ChainSelector selectedChain={selectedChain} setSelectedChain={setSelectedChain} />
            </div>
          </div>
        </div>
      </div>
      <div className="balance-container">
        <div className="balance">{formattedBalance} {chain?.ticker} (${formattedUsd})</div>
      </div>
      <WalletViewContent walletAddress={walletAddress} selectedChain={selectedChain} setBalance={setBalance} />
    </>
  );
};

export default WalletView;
