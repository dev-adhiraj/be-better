import React, { useEffect, useState } from "react";
import { Input, Button, List, Avatar, Spin, message, Modal, Form } from "antd";
import { ethers } from "ethers";
import { addNFT, getNFTs, getAllChains, getWalletData, removeNFT, addTransaction } from "../../helpers/storage";
import NFTabi from '../../ABI/NFTabi.json';
import CopyButton from "../CopyButton";
// Translate 
import { decryptData } from "../../helpers/encryption";
// Translate
import { resolveNftImageUrl } from "../../helpers/nftImages";

const NFTList = ({ walletAddress, selectedChain }) => {
  const [contractAddress, setContractAddress] = useState("");
  const [nftId, setNftId] = useState("");
  const [nfts, setNFTs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chain, setChain] = useState(null);

  const [transferModal, setTransferModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [transferTo, setTransferTo] = useState("");

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const AllChains = await getAllChains();
        setChain(AllChains[selectedChain]);
      } catch (err) {
        console.error("Error fetching chains:", err);
        setError("Error fetching chains. Please try again.");
      }
    };

    fetchChains();
  }, [selectedChain]);

  useEffect(() => {
    if (!walletAddress || !chain) return;
    fetchNFTs();
  }, [walletAddress, chain]);

  const provider = chain ? new ethers.providers.JsonRpcProvider(chain.rpcUrl) : null;

  const fetchNFTs = async () => {
    if (!provider) return;

    try {
      setLoading(true);
      setError("");

      const fetchedNFTs = await getNFTs(walletAddress, selectedChain);

      const updatedNFTs = (
        await Promise.all(
          fetchedNFTs.map(async (nft) => {
            try {
              const contract = new ethers.Contract(nft.address, NFTabi, provider);
              const balance = await contract.balanceOf(walletAddress);
              const name = await contract.name();
              const symbol = await contract.symbol();
              const tokenURI = await contract.tokenURI(nft.nftId);
              const owner = await contract.ownerOf(nft.nftId);

              // ✅ Only include if user is the owner
              if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
                return null; // Filter out later
              }

              // Resolve display image from tokenURI/metadata/IPFS
              let imageUrl = "";
              try {
                imageUrl = await resolveNftImageUrl({ tokenURI });
              } catch {}

              return {
                ...nft,
                balance: balance.toString(),
                name,
                symbol,
                tokenURI,
                logo: imageUrl,
                owner
              };
            } catch (error) {
              console.error("Error fetching NFT details:", error);
              return null; // Exclude NFTs with failed detail fetch
            }
          })
        )
      ).filter((nft) => nft !== null); // ✅ Remove null entries

      setNFTs(updatedNFTs);
    } catch (err) {
      console.error("Error fetching NFTs:", err);
      setError("Error fetching NFTs. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const addContract = async (address, nftId) => {
    try {
      setLoading(true);
      setError("");

      const NFTinfo = await checkNFT(address, nftId);
      if (NFTinfo) {
        await addNFT(walletAddress, NFTinfo);
        await fetchNFTs();
      } else {
        message.error("Not an NFT Contract");
      }

    } catch (err) {
      console.error(`Error adding contract: ${err}`);
      message.error(`Error adding contract: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkNFT = async (address, nftId) => {
    try {
      const contract = new ethers.Contract(address, NFTabi, provider);
      const name = await contract.name();
      const symbol = await contract.symbol();
      const supportsERC721 = await contract.supportsInterface("0x80ac58cd");
      const nftInterfase = supportsERC721;
      if (nftInterfase && name && symbol) {
        return {
          name,
          symbol,
          nftId,
          chain: selectedChain,
          address: address,
        };
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error fetching NFT information:", error);
      return false;
    }
  };

  const handleTransfer = async () => {
    if (!selectedNFT || !provider) return;
    try {
      const walletData = await getWalletData(walletAddress);
      const privateKey = await decryptData(walletData.walletKey);
      const contract = new ethers.Contract(selectedNFT.address, NFTabi, provider);

      const walletSigner = new ethers.Wallet(privateKey, provider);
      const tokenWithSigner = contract.connect(walletSigner);


      // Create transaction overrides with accessList
      const overrides = {
        gasLimit: 100000, // Or estimate
        gasPrice: ethers.utils.parseUnits("1", "gwei"), // For BSC testnet
      };

      const tx = await tokenWithSigner.transferFrom(walletAddress, transferTo, selectedNFT.nftId, overrides);
      await tx.wait();
      await removeNFT(walletAddress, selectedNFT)
      addTransaction(walletAddress, tx, chain.name, 0);
      message.success(`✅ Transfer successful: ${selectedNFT.nftId} ${selectedNFT.symbol}`);
      setTransferModal(false);
      setTransferTo("");
      fetchNFTs();
    } catch (error) {
      console.error("Transfer error:", error);
      message.error("❌ Transfer failed");
    }
  };

  const verifyOwnership = async (nft) => {
    try {
      const contract = new ethers.Contract(nft.address, NFTabi, provider);
      const owner = await contract.ownerOf(nft.nftId);
      if (owner == walletAddress) {
        message.success(`✅ You are still the owner`);
      }
      else {
        await removeNFT(walletAddress, nft)
        message.error("❌ nft removed as you are not the owner");
        fetchNFTs();
      }
    }
    catch (error) {
      console.error("Verify error:", error);
      message.error("❌ Verification failed");
    }
  }

  return (
    <>
      <Input
        value={contractAddress}
        onChange={(e) => setContractAddress(e.target.value)}
        placeholder="Contract Address of NFT"
      />
      <Input
        value={nftId}
        onChange={(e) => setNftId(e.target.value)}
        placeholder="NFT ID"
      />
      <Button
        style={{ width: "100%", marginTop: "20px", marginBottom: "20px" }}
        type="primary"
        onClick={() => addContract(contractAddress, nftId)}
        disabled={loading}
      >
        {loading ? "Adding..." : "Add NFT"}
      </Button>
      {loading ? (
        <Spin size="large" />
      ) : error ? (
        <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
      ) : nfts.length > 0 ? (
        <List
          bordered={true}
          itemLayout="horizontal"
          dataSource={nfts}
          renderItem={(item) => (
            <List.Item style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {item.owner === walletAddress ? (
                <>
                  <div style={{ flex: 1 }}>
                    <List.Item.Meta
                      avatar={<Avatar src={item.logo || "/svg//generic.svg"} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/svg/color/generic.svg"; }} />}
                      title={item.symbol}
                      description={item.name}
                    />
                    <div>
                      <a href={item.logo || item.tokenURI} target="_blank" rel="noopener noreferrer">
                        View NFT
                      </a>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <Button
                      type="link"
                      onClick={() => {
                        setSelectedNFT(item);
                        setTransferModal(true);
                      }}
                    >
                      Transfer
                    </Button>
                    <Button
                      type="link"
                      onClick={() => verifyOwnership(item)}
                    >
                      Verify Ownership
                    </Button>
                    <CopyButton content={item.address} />
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, textAlign: "center" }}>
                  You do not own this NFT
                </div>
              )}
            </List.Item>
          )}
        />
      ) : (
        <span style={{ color: "#fff" }}>No NFTs imported yet. Please import NFTs to view.</span>
      )}
      <Modal
        title="Transfer Token"
        open={transferModal}
        onCancel={() => setTransferModal(false)}
        onOk={handleTransfer}
      >
        <Form layout="vertical">
          <Form.Item label="Recipient Address">
            <Input
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              placeholder="0x..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default NFTList;
