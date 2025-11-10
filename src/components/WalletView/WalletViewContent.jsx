// src/components/WalletView/WalletViewContent.jsx
import React, { useState, useEffect } from "react";
import { Tabs } from "antd";
import TokenList from "../Tabs/TokenList";
import NFTList from "../Tabs/NFTList";
import Transfer from "../Tabs/Transfer";
import TransactionHistory from "../Tabs/TransactionHistory";
import Ramp from "../Ramp/Ramp";

const WalletViewContent = ({ walletAddress, selectedChain, setBalance }) => {
  const [transactionTrigger, setTransactionTrigger] = useState(0);

  useEffect(() => {
    if (!walletAddress) {
      setBalance(0);
    }
  }, [walletAddress, setBalance]);

  // RAMP CALLBACK HANDLER
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get("ramp") === "success") {
      console.log("ZKP2P success! Opening Ramp tab...");

      setTimeout(() => {
        const rampTab = document.querySelector('.ant-tabs-tab[data-node-key="5"]');
        if (rampTab) rampTab.click();
      }, 100);

      if (typeof setBalance === "function") {
        setBalance(null);
      }

      window.history.replaceState({}, "", "/wallet");
    }
  }, [window.location.search]);

  const tabItems = [
    {
      key: "1",
      label: "Tokens",
      children: (
        <TokenList
          walletAddress={walletAddress}
          selectedChain={selectedChain}
          setTransactionTrigger={setTransactionTrigger}
        />
      ),
    },
    {
      key: "2",
      label: "Transfer",
      children: (
        <Transfer
          walletAddress={walletAddress}
          selectedChain={selectedChain}
          setBalance={setBalance}
          setTransactionTrigger={setTransactionTrigger}
        />
      ),
    },
    {
      key: "3",
      label: "History",
      children: (
        <TransactionHistory
          walletAddress={walletAddress}
          selectedChain={selectedChain}
          transactionTrigger={transactionTrigger}
        />
      ),
    },
    {
      key: "4",
      label: "NFTs",
      children: (
        <NFTList
          walletAddress={walletAddress}
          selectedChain={selectedChain}
          transactionTrigger={transactionTrigger}
        />
      ),
    },
    {
      key: "5",
      label: "Ramp",
      children: <Ramp walletAddress={walletAddress} selectedChain={selectedChain} />
    },
  ];

  return (
    <div className="content walletView">
      <div className="walletViewbox">
        <Tabs defaultActiveKey="2" items={tabItems} className="walletViews" />
      </div>
    </div>
  );
};

export default WalletViewContent;