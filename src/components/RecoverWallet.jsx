import React, { useState } from "react";
import { BulbOutlined } from "@ant-design/icons";
import { Button, Input, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { setLocalStorage, createAccountEntry, countAccounts, setChildCount } from "../helpers/storage";
import { encryptData, decryptData } from "../helpers/encryption";
import { initializeChainsDb } from "../helpers/chains";
// Translate 
// Translate
const { TextArea } = Input;

function RecoverAccount({ setWalletAddress, setSeedPhrase }) {
	
  const navigate = useNavigate();
  const [typedSeed, setTypedSeed] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSeedChange = (e) => {
    setTypedSeed(e.target.value);
    setError("");
  };

  const recoverWallet = async () => {
    try {
      const words = typedSeed.trim().split(" ");
      if (words.length !== 12) {
        setError("Seed phrase must include exactly 12 words separated by spaces.");
        return;
      }
      const encryptedMnemonic = encryptData(typedSeed);
      setLocalStorage("SeedPhrase", encryptedMnemonic);
      const decryptedMnemonic = decryptData(encryptedMnemonic);
      setSeedPhrase(decryptedMnemonic);
      const firstAccount = ethers.Wallet.fromMnemonic(decryptedMnemonic, `m/44'/60'/0'/0/0`);
      const count = await countAccounts();
      createAccountEntry(firstAccount.address, `Account ${count + 1}`, encryptData(firstAccount.privateKey));
      setChildCount(encryptData("1"));
      setLoading(true)
      await initializeChainsDb().then(() => { setLoading(false) })
      setWalletAddress(firstAccount.address);

      // Update user data with wallet address
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (userData.email) {
        userData.walletAddress = firstAccount.address;
        localStorage.setItem('userData', JSON.stringify(userData));
      }

      navigate("/home/dashboard");
    } catch (error) {
      console.error("Error recovering wallet:", error);
      setError("An error occurred while recovering the wallet.");
    }
  };

  if (loading) {
    return <div><Spin size="large" /></div>;
  }
  return (
    <div className="content">
      <div className="mnemonic">
        <BulbOutlined style={{ fontSize: 20 }} />
        <div>
		Type your seed phrase in the field below to recover your wallet (it should include 12 words separated with spaces).
        </div>
      </div>
      <TextArea
        value={typedSeed}
        onChange={handleSeedChange}
        rows={4}
        className="seedPhraseContainer"
        placeholder="Type your seed phrase here..."
        autoSize={{ minRows: 3, maxRows: 5 }}
      />

      <Button
        disabled={typedSeed.split(" ").length !== 12 || typedSeed.slice(-1) === " "}
        className="frontPageButton"
        type="primary"
        onClick={recoverWallet}
      >
        Recover Wallet 
      </Button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p className="frontPageBottom" onClick={() => navigate("/")}>
        <span> Back Home</span>
      </p>
    </div>
  );
}

export default RecoverAccount;
