// src/App.jsx
import "./App.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPass, getAllAccounts, getLastUsedAccount } from './helpers/storage';
import { initializeChainsDb } from "./helpers/chains";
import { Spin } from "antd";
import AppRoutes from "./router/routes";

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [seedPhrase, setSeedPhrase] = useState(null);
  const [password, setPassword] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  // Dark Mode
  const [darkMode, setDarkMode] = useState(true);
  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // Initialize DB
  useEffect(() => {
    initializeChainsDb().catch(console.error);
  }, []);

  // Check password
  useEffect(() => {
    getPass().then(setPassword).catch(console.error);
  }, []);

  // Check wallet
  useEffect(() => {
    const checkWallet = async () => {
      try {
        const accounts = await getAllAccounts();
        if (accounts?.length > 0) {
          const last = await getLastUsedAccount();
          if (last) {
            setWalletAddress(last.address);
            setSeedPhrase(last.seedPhrase);
            setIsLoggedIn(true);
          }
        }
      } catch (error) {
        console.error("Wallet check failed:", error);
      } finally {
        setLoading(false);
      }
    };
    checkWallet();
  }, []);

  // Handle login success (from LoginSignup)
  const handleLoginSuccess = (address, seed) => {
    setWalletAddress(address);
    setSeedPhrase(seed);
    setIsLoggedIn(true);
    navigate("/home/dashboard");
  };

  // Handle logout
  const handleLogout = () => {
    setWalletAddress(null);
    setSeedPhrase(null);
    setIsLoggedIn(false);
    localStorage.removeItem('userData');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('paymentSuccess');
    localStorage.removeItem('paymentSessionId');
    navigate("/");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p>Loading BeBetter Wallet...</p>
      </div>
    );
  }

  return (
    <div className={`App ${darkMode ? 'dark' : ''}`}>
      <AppRoutes
        walletAddress={walletAddress}
        setWalletAddress={setWalletAddress}
        seedPhrase={seedPhrase}
        setSeedPhrase={setSeedPhrase}
        password={password}
        isLoggedIn={isLoggedIn}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        darkMode={darkMode}
        toggleTheme={toggleTheme}
      />
    </div>
  );
}

export default App;