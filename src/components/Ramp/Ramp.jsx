// src/components/Ramp\Ramp.jsx
import React, { useState, useEffect } from "react";
import { getAllChains } from "../../helpers/storage"; // Import to get all chains including custom ones

const Ramp = ({ walletAddress, selectedChain }) => {
  const [amount, setAmount] = useState(1);
  const [chain, setChain] = useState(selectedChain?.ticker?.toLowerCase() || "eth");
  const [error, setError] = useState(null);
  const [allChainOptions, setAllChainOptions] = useState([]);

  // Load all chains (including custom ones) on component mount
  useEffect(() => {
    const fetchAllChains = async () => {
      try {
        const chains = await getAllChains();
        const chainOptions = Object.values(chains).map(chain => ({
          ticker: chain.ticker,
          name: chain.name,
          hex: chain.hex
        }));
        setAllChainOptions(chainOptions);
      } catch (error) {
        console.error("Error fetching chains:", error);
        // Fallback to empty array if there's an error
        setAllChainOptions([]);
      }
    };
    
    fetchAllChains();
  }, []);

  // Map chain tickers to zkp2p supported chains and token addresses
  const getChainInfo = (chainTicker) => {
    const normalizedTicker = chainTicker.toLowerCase();
    
    // Chain ID to token address mapping for supported chains only
    const chainIdToToken = {
      "0x1": "1:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",    // ETH USDC
  "0x38": "56:0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",  // BSC USDC
  "0x89": "137:0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" // Polygon USDC
    };
    
    // Chain ticker to name mapping
    const chainNameMap = {
      "eth": "ethereum",
      "bnb": "binance",
      "matic": "polygon",
      "pol": "polygon"
      //"base": "base"
    };
    
    // Try to find chain by ticker first
    const chainInfo = allChainOptions.find(c => 
      c.ticker && c.ticker.toLowerCase() === normalizedTicker
    );
    
    // Log chain information for debugging
    console.log("Chain info lookup:", {
      requestedTicker: normalizedTicker,
      foundChain: chainInfo,
      allChains: allChainOptions
    });
    
    // If we found the chain, get its token address
    if (chainInfo && chainInfo.hex) {
      const normalizedHex = chainInfo.hex.toLowerCase();
      const tokenAddress = chainIdToToken[normalizedHex];
      
      console.log("Chain mapping:", {
        hex: normalizedHex,
        tokenAddress: tokenAddress,
        chainInfo: chainInfo
      });
      
      if (tokenAddress) {
        return {
          name: chainNameMap[normalizedTicker] || normalizedTicker,
          token: tokenAddress
        };
      }
    }
    
    // Fallback to default mapping for known chains
    const fallbackToken = chainIdToToken["0x1"] || "1:0x0000000000000000000000000000000000000000";
    console.log("Using fallback chain mapping:", {
      ticker: normalizedTicker,
      token: fallbackToken
    });
    
    return {
      name: chainNameMap[normalizedTicker] || "ethereum",
      token: fallbackToken
    };
  };

  const buildRampUrl = (type) => {
    const chainInfo = getChainInfo(chain);
    
    // Log the parameters being sent to zkp2p
    console.log("Building Ramp URL with parameters:", {
      chainTicker: chain,
      chainInfo: chainInfo,
      type: type
    });
    
    // Use www.zkp2p.xyz as per your working example
    const baseUrl = "https://www.zkp2p.xyz/swap";
    
    const params = new URLSearchParams({
      referrer: "Apollo Wallet",
	  callbackUrl: `${window.location.origin}/wallet?ramp=success`,
      inputCurrency: "USD",
      inputAmount: amount || "50",
      paymentPlatform: "venmo",
      toToken: chainInfo.token,
      recipientAddress: walletAddress || "",
      tab: type === "onramp" ? "buy" : "sell",
     // Add your API key from environment variables
      apiKey: import.meta.env.VITE_ZKP2P_API_KEY || "zkp2p_aWKy10QqsOsabxmcz68rKRjYttahrKCE"
    });
    
    const fullUrl = `${baseUrl}?${params.toString()}`;
    console.log("Generated zkp2p URL:", fullUrl);
    
    return fullUrl;
  };

  const handleBuyCrypto = () => {
    if (!walletAddress) {
      alert("Please connect your wallet first!");
      return;
    }
    
    try {
      const url = buildRampUrl("onramp");
      // Check if the URL is valid before opening
      if (url) {
        console.log("Opening buy crypto URL:", url);
        window.open(url, "_blank");
      } else {
        setError("Failed to generate buy crypto URL. Please try again.");
      }
    } catch (err) {
      setError("Failed to open buy crypto page. Please try again.");
      console.error("Error opening buy crypto page:", err);
    }
  };

  const handleSellCrypto = () => {
    if (!walletAddress) {
      alert("Please connect your wallet first!");
      return;
    }
    
    try {
      const url = buildRampUrl("offramp");
      // Check if the URL is valid before opening
      if (url) {
        console.log("Opening sell crypto URL:", url);
        window.open(url, "_blank");
      } else {
        setError("Failed to generate sell crypto URL. Please try again.");
      }
    } catch (err) {
      setError("Failed to open sell crypto page. Please try again.");
      console.error("Error opening sell crypto page:", err);
    }
  };

  // Define only the supported chains for the dropdown
  const supportedChains = [
    { ticker: "eth", name: "Ethereum" },
    { ticker: "bnb", name: "Binance Smart Chain" },
    { ticker: "matic", name: "Polygon" }
    // { ticker: "base", name: "Base" }
  ];

  return (
    <div style={{ padding: "0px", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
      <h3 style={{ color: "#fff", fontSize:"22px", marginBottom: "15px", marginTop:"10px", }}>Buy or Sell Crypto</h3>
      
      {error && (
        <div style={{ 
          color: "#f44336", 
          backgroundColor: "#1a1a1a", 
          padding: "1px", 
          borderRadius: "1px", 
          marginBottom: "1px",
          border: "1px solid #f44336"
        }}>
          {error}
        </div>
      )}
      <div className="row rampbox">
      <div className="col-md-6" style={{ marginBottom: "16px" }}>
        <label style={{ color: "#ffffffff" }}>Amount (USD): </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
          placeholder="50"
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #adb3ebff",
            background: "#5c77c0ff",
            color: "#fff",
            width: "135px",
            marginLeft: "8px",
          }}
        />
      </div>

      <div className="col-md-6" style={{ marginBottom: "24px" }}>
        <label style={{ color: "#ffffffff" }}>Chain: </label>
        <select
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "8px",
            background: "#5c77c0ff",
            color: "#fff",
            border: "1px solid #adb3ebff",
            marginLeft: "8px",
          }}
        >
          {supportedChains.map((chainItem) => (
            <option 
              key={chainItem.ticker} 
              value={chainItem.ticker}
            >
              {chainItem.name}
            </option>
          ))}
        </select>
      </div>
      </div>

      <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
        <button
          onClick={handleBuyCrypto}
          style={{
            padding: "14px 24px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #4CAF50, #45a049)",
            color: "#fff",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
            minWidth: "180px",
            boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
          }}
          disabled={!walletAddress}
        >
           Fund (${amount || 0})
        </button>

        <button
          onClick={handleSellCrypto}
          style={{
            padding: "14px 24px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #f44336, #d32f2f)",
            color: "#fff",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
            minWidth: "180px",
            boxShadow: "0 4px 12px rgba(244, 67, 54, 0.3)",
          }}
          disabled={!walletAddress}
        >
         Cash Out (${amount || 0})
        </button>
      </div>

      <p style={{ fontSize: "14px", color: "#ffffffff", marginTop: "16px" }}>
        Opens in new tab. Return here – balance will auto-refresh after completion.
      </p>
      
      <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#1e2b70", borderRadius: "8px", border: "1px solid #6f72a5" }}>
        <h4 style={{ color:"#fff", fontSize:"24px", marginBottom: "10px" }}>How it works:</h4>
        <ul style={{ textAlign: "left", color: "#ffffffff", fontSize: "14px" }}>
          <li><strong>Fund (Buy):</strong> Convert fiat to crypto using bank transfers</li>
          <li><strong>Cash Out (Sell):</strong> Convert crypto to fiat and receive bank transfers</li>
          <li><strong>Privacy:</strong> Zero-knowledge proofs protect your transaction details</li>
          <li><strong>Security:</strong> Peer-to-peer matching with escrow protection</li>
        </ul>
      </div>
      
     
    </div>
  );
};

export default Ramp;