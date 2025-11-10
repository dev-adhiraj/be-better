import React, { useEffect, useState, useCallback } from "react";
import { Input, Button, List, Avatar, Spin, message, Modal, Form } from "antd";
import { ethers } from "ethers";
import {
  addToken,
  getTokens,
  getAllChains,
  getWalletData,
  addTransaction,
} from "../../helpers/storage";
import { getTokenIconUrl } from "../../helpers/tokenIcons";
import CopyButton from "../CopyButton";
import { decryptData } from "../../helpers/encryption";

const TokenList = ({ walletAddress, selectedChain, setTransactionTrigger }) => {
  const [contractAddress, setContractAddress] = useState("");
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState(null);
  const [chain, setChain] = useState(null);

  const [transferModal, setTransferModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(2);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const AllChains = await getAllChains();
        const selectedChainData = AllChains[selectedChain];
        console.log("TokenList: Initialized Chain ID:", selectedChain, "Data:", selectedChainData);
        setChain(selectedChainData);

        if (selectedChainData?.rpcUrl) {
          setProvider(new ethers.providers.JsonRpcProvider(selectedChainData.rpcUrl));
        }
      } catch (err) {
        console.error("TokenList: Error initializing chain:", err);
      }
    };
    initialize();
  }, [selectedChain]);

  useEffect(() => {
    if (walletAddress && provider && chain) fetchTokens();
  }, [walletAddress, provider, chain]);

  const erc20ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ];

  const chainIdMap = {
    "0x86c8": "zeusx",
    "0x86c9": "olyp",
    "56": "bsc",
    "0x38": "bsc",
  };

  const coingeckoMap = {
    usdt: "tether",
    usdc: "usd-coin",
    dai: "dai",
    eth: "ethereum",
    bnb: "binancecoin",
    matic: "matic-network",
    ape: "apecoin",
  };

  const getDexChainId = (chain) => {
    const map = {
      "1": "ethereum",
      "0x1": "ethereum",
      "56": "bsc",
      "0x38": "bsc",
      "0x86c8": "zeusx",
      "0x86c9": "olyp",
    };
    return map[chain.toLowerCase()] || chain.toLowerCase();
  };

  const fetchTokenPrice = async ({ chain, address, symbol }) => {
    try {
      const lowerAddress = address.toLowerCase();
      const normalizedChain = chainIdMap[chain.toLowerCase()] || chain.toLowerCase();

      if (symbol) {
        try {
          const cgId = coingeckoMap[symbol.toLowerCase()] || symbol.toLowerCase();
          if (cgId) {
            const res = await fetch(
              `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`
            );
            if (res.ok) {
              const data = await res.json();
              const price = data?.[cgId]?.usd;
              if (price) {
                console.log(`Price from CoinGecko: ${price} for ${symbol} (ID: ${cgId})`);
                return price;
              }
            }
          }
        } catch (e) {
          console.warn("CoinGecko error", e);
        }
      }

      try {
        const url = `https://apollowallet.io/api/zeusolympus.php?chain=${normalizedChain}&token=${lowerAddress}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data?.derivedUSD) {
            console.log(`Price from zeusolympus.php: ${data.derivedUSD} for ${symbol}`);
            return parseFloat(data.derivedUSD);
          }
        }
      } catch (e) {
        console.warn("Deploytokens API error", e);
      }

      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${lowerAddress}`);
        if (res.ok) {
          const data = await res.json();
          const dexChainId = getDexChainId(chain);
          let pairs = Array.isArray(data?.pairs) ? data.pairs : [];
          pairs = pairs.filter(p => p.chainId === dexChainId && p.liquidity?.usd > 10000);
          if (pairs.length === 0) {
            console.warn(`No valid ${dexChainId} pairs found for ${lowerAddress}`);
          }
          const top = pairs.sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0];
          const price = top ? parseFloat(top.priceUsd) : undefined;
          if (!isNaN(price) && price > 0) {
            console.log(`Price from DexScreener: ${price} for ${symbol} on ${dexChainId}`);
            return price;
          }
        }
      } catch (e) {
        console.warn("Dexscreener error", e);
      }

      console.warn(`No valid price found for ${symbol} at ${lowerAddress}`);
      return 0;
    } catch (e) {
      console.error("fetchTokenPrice error", e);
      return 0;
    }
  };

  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      const fetched = await getTokens(walletAddress, selectedChain);
      console.log("TokenList: Fetched tokens for chain:", selectedChain, "Tokens:", fetched);

      const updated = await Promise.all(
        fetched.map(async (token) => {
          try {
            const contract = new ethers.Contract(token.address, erc20ABI, provider);
            const balance = await contract.balanceOf(walletAddress);

            let name = token.name;
            let symbol = token.symbol;
            let decimals = token.decimals;

            if (!name || !symbol || !decimals) {
              name = await contract.name();
              symbol = await contract.symbol();
              decimals = await contract.decimals();
            }

            const quantity = Number(ethers.utils.formatUnits(balance, decimals));
            const price = await fetchTokenPrice({
              chain: selectedChain,
              address: token.address,
              symbol,
            });

            const totalUsd = price * quantity;

            let logoUrl = "/svg/color/generic.svg";
            try {
              console.log("TokenList: Fetching logo for chainId:", selectedChain, "address:", token.address);
              logoUrl = await getTokenIconUrl({
                chainId: selectedChain,
                address: token.address,
              });
              console.log("TokenList: Logo URL fetched:", logoUrl);
            } catch (e) {
              console.error("TokenList: Logo fetch error for", token.address, ":", e.message);
            }

            return {
              ...token,
              balance,
              name,
              symbol,
              price,
              totalUsd,
              decimals: parseInt(decimals),
              logo: logoUrl,
            };
          } catch (err) {
            console.error("TokenList: Token fetch error for", token.address, ":", err);
            return token;
          }
        })
      );

      setTokens(updated);
      console.log("TokenList: Updated tokens with logos:", updated);
    } catch (err) {
      setError("Error fetching tokens");
      console.error("TokenList: Error fetching tokens:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, provider, chain, selectedChain]); // Added dependencies

  const addContract = async (address) => {
    if (!address) return message.error("Enter contract address");
    try {
      setLoading(true);
      const contract = new ethers.Contract(address, erc20ABI, provider);
      const name = await contract.name();
      const symbol = await contract.symbol();
      const decimals = await contract.decimals();
      await addToken(walletAddress, {
        name,
        symbol,
        decimals,
        chain: selectedChain,
        address,
      });
      message.success(`${symbol} added`);
      setContractAddress("");
      fetchTokens();
    } catch (err) {
      console.error("TokenList: Add token error for", address, ":", err);
      message.error("Invalid ERC20 contract");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedToken || !provider) return;
    setTransferLoading(true);
    try {
      const walletData = await getWalletData(walletAddress);
      const privateKey = await decryptData(walletData.walletKey);
      const walletSigner = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(selectedToken.address, erc20ABI, walletSigner);

      const amountInWei = ethers.utils.parseUnits(String(transferAmount), selectedToken.decimals);
      const nonce = await provider.getTransactionCount(walletSigner.address, "latest");

      const tx = await contract.transfer(transferTo, amountInWei, { nonce });
      await tx.wait();

      await addTransaction(
        walletAddress,
        {
          hash: tx.hash,
          transactionHash: tx.hash,
          type: "token_transfer",
          symbol: selectedToken.symbol,
          to: transferTo,
        },
        chain.name,
        ethers.utils.formatUnits(amountInWei, selectedToken.decimals)
      );

      setTransactionTrigger((prev) => prev + 1);
      message.success(`✅ Transfer successful: ${transferAmount} ${selectedToken.symbol}`);
      setTransferModal(false);
      setTransferTo("");
      setTransferAmount("");
      fetchTokens();
    } catch (err) {
      console.error("TokenList: Transfer error for", selectedToken.address, ":", err);
      message.error("❌ Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <Input
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
          placeholder="Contract Address Of ERC20"
          onPressEnter={() => addContract(contractAddress)}
          size="small"
          style={{ flex: 1 }}
        />
        <Button
          style={{
            minWidth: "80px",
            height: "28px",
            fontSize: "12px",
            padding: "0 12px",
          }}
          type="primary"
          size="small"
          onClick={() => addContract(contractAddress)}
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Token"}
        </Button>
      </div>

      {loading ? (
        <Spin size="large" />
      ) : error ? (
        <div style={{ color: "red" }}>{error}</div>
      ) : tokens.length > 0 ? (
        <List
          bordered
          itemLayout="horizontal"
          dataSource={tokens}
          renderItem={(item) => (
            <List.Item style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <List.Item.Meta
                  avatar={
                    <Avatar
                      key={item.address} // Force re-render with unique key
                      src={item.logo || "/svg/color/generic.svg"}
                      onError={(e) => {
                        console.error("TokenList: Avatar failed to load", item.logo, "for", item.address, ":", e ? e.message : "No event object");
                        if (e && e.currentTarget) {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/svg/color/generic.svg";
                        } else {
                          console.warn("TokenList: No event object in onError, forcing fallback to /svg/color/generic.svg");
                        }
                      }}
                      onLoad={() => console.log("TokenList: Avatar loaded", item.logo, "for", item.address)}
                    />
                  }
                  title={`${item.symbol} ($${(item.price || 0).toFixed(4)})`}
                  description={`USD $${formatNumber(item.totalUsd || 0)}`}
                />
              </div>
              <div style={{ flex: 1, textAlign: "right" }}>
                <div>
                  Balance:{" "}
                  {(
                    Number(item.balance) /
                    10 ** Number(item.decimals)
                  ).toFixed(5)}{" "}
                  {item.symbol}
                </div>
                <CopyButton content={item.address} />
                <Button
                  type="link"
                  onClick={() => {
                    setSelectedToken(item);
                    setTransferModal(true);
                  }}
                >
                  Transfer
                </Button>
              </div>
            </List.Item>
          )}
        />
      ) : (
        <span style={{ color: "#fff" }}>
          You seem to not have any tokens yet. Please import tokens to view
        </span>
      )}

      <Modal
        title="Transfer Token"
        open={transferModal}
        onCancel={() => setTransferModal(false)}
        onOk={handleTransfer}
        confirmLoading={transferLoading}
      >
        <Form layout="vertical">
          <Form.Item label="Recipient Address">
            <Input
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Amount">
            <Input
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default TokenList;