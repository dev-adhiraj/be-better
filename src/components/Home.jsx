import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './MainLayout';

// Import sidebar components
import Dashboard from './Sidebar/dashboard';
import MyMedicalRecords from './Sidebar/myMedicalRecords';
import UniversalID from './Sidebar/universaliD';
import HistoryPage from './Sidebar/History';
import BackOffice from './Sidebar/BackOffice';
import Shop from './Sidebar/shop';
import TeleHealth from './Sidebar/TeleHealth';
import MyWallet from './Sidebar/MyWallet';
import BBGiftCards from './Sidebar/BBGiftCards';

const Home = ({ walletAddress, seedPhrase, onLogout }) => {
  return (
    <MainLayout 
      walletAddress={walletAddress} 
      seedPhrase={seedPhrase} 
      onLogout={onLogout}
    >
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/myMedicalRecords" element={<MyMedicalRecords walletAddress={walletAddress} />} />
        <Route path="/universaliD" element={<UniversalID />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/backoffice" element={<BackOffice />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/telehealth" element={<TeleHealth />} />
        <Route path="/myWallet" element={<MyWallet />} />
        <Route path="/bbGiftCards" element={<BBGiftCards />} />
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </MainLayout>
  );
};

export default Home;