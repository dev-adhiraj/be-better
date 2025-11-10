import React from "react";
import { Routes, Route } from "react-router-dom";
import CreateWallet from "../components/CreateWallet";
import RecoverWallet from "../components/RecoverWallet";
import WalletView from "../components/WalletView/WalletView";
import SetPassword from "../components/SetPassword";
import EnterPassword from "../components/EnterPassword";
import ResetPassword from "../components/ResetPassword";
import Approve from "../components/Approve";

import LoginSignup from '../pages/LoginSignup';
import Home from '../components/Home';

const AppRoutes = ({ walletAddress, setWalletAddress, seedPhrase, setSeedPhrase, password, onLoginSuccess, onLogout }) => {
  // Check if user is authenticated (has wallet and has logged in)
  const isAuthenticated = walletAddress && seedPhrase;
  
  return (
    <Routes>
      {/* Public routes - always accessible */}
      <Route path="/" element={<LoginSignup onLoginSuccess={onLoginSuccess} />} />
      <Route path="/recover" element={<RecoverWallet setSeedPhrase={setSeedPhrase} setWalletAddress={setWalletAddress} />} />
      <Route path="/yourwallet" element={<CreateWallet setSeedPhrase={setSeedPhrase} setWalletAddress={setWalletAddress} />} />
      
      {/* Home route - accessible after login */}
      <Route path="/home/*" element={<Home walletAddress={walletAddress} seedPhrase={seedPhrase} onLogout={onLogout} />} />
      
      {/* Authentication-related routes */}
      {isAuthenticated && (
        <>
          {password ? (
            <>
              <Route path="/wallet" element={<WalletView walletAddress={walletAddress} setWalletAddress={setWalletAddress} seedPhrase={seedPhrase} setSeedPhrase={setSeedPhrase} />} />
              <Route path="/setPassword" element={<SetPassword />} />
              <Route path="/resetPassword" element={<ResetPassword />} />
              <Route path="/approve" element={<Approve />} />
              <Route path="/approve-transaction" element={<Approve />} />
            </>
          ) : (
            <>
              <Route path="/enterPassword" element={<EnterPassword />} />
              <Route path="/wallet" element={<WalletView walletAddress={walletAddress} setWalletAddress={setWalletAddress} seedPhrase={seedPhrase} setSeedPhrase={setSeedPhrase} />} />
              <Route path="/approve" element={<Approve />} />
              <Route path="/approve-transaction" element={<Approve />} />
            </>
          )}
        </>
      )}
    </Routes>
  );
};

export default AppRoutes;