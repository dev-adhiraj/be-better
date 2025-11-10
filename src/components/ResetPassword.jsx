import React, { useState } from "react";
import { BulbOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import { useNavigate } from "react-router-dom";
import { getLocalStorage, clearLocalStorage, clearIndexedDB } from "../helpers/storage";
import { decryptData } from "../helpers/encryption";
import LogoutButton from "./LogoutButton";
// Translate 
// Translate
const { TextArea } = Input;

function ResetPassword() {
	
  const navigate = useNavigate();
  const [typedSeed, setTypedSeed] = useState("");
  const [error, setError] = useState("");


  const handleSeedChange = (e) => {
    setTypedSeed(e.target.value);
    setError("");
  };

  const resetPassword = async () => {
    try {
      const words = typedSeed.trim().split(" ");
      if (words.length !== 12) {
        setError("Seed phrase must include exactly 12 words separated by spaces.");
        return;
      }
      const encryptedMnemonic = getLocalStorage("SeedPhrase");
      const decryptedMnemonic = decryptData(encryptedMnemonic);
      if (decryptedMnemonic == typedSeed) {
        navigate("/setPassword");
      }
      else {
        setError("Seed Password Not Correct");
      }
    } catch (error) {
      setError("An error occurred while recovering your account.");
    }
  };

  const logout = async () => {
    try {
      await clearLocalStorage();
      // Avoid hanging on DB deletion; race with a short timeout
      try {
        await Promise.race([
          clearIndexedDB(),
          new Promise((resolve) => setTimeout(resolve, 400))
        ]);
      } catch (_) {}
    } catch (_) {}
    // Primary navigation
    try { navigate("/", { replace: true }); } catch (_) {}
    // HashRouter + hard fallbacks for extension popup
    try { window.location.hash = "#/"; } catch (_) {}
    try { setTimeout(() => { try { window.location.replace(`${window.location.pathname}#/`); } catch(_) {} }, 0); } catch (_) {}
    try { setTimeout(() => { try { window.location.reload(); } catch(_) {} }, 20); } catch (_) {}
  };

  return (
    <div className="content">
      <div className="mnemonic">
        <BulbOutlined style={{ fontSize: 20 }} />
        <div>
           Type your seed phrase in the field below to reset your password.
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
        onClick={resetPassword}
      >
        Reset Password
      </Button>
      <p style={{ color: 'red' }}>
	  If you have forgotten your seed phase, it cannot be recovered. Please Logout to continue.
        
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LogoutButton setSeedPhrase={null} setWallet={null} setBalance={null} />
        <span style={{ cursor: 'pointer' }} onClick={logout}>Please click to logout</span>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p className="frontPageBottom" onClick={() => navigate("/")}>
        <span>Login through Password</span>
      </p>
    </div>
  );
}

export default ResetPassword;
