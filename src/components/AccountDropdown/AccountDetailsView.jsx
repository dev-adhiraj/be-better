import React from 'react';
import { Button } from 'antd';
import QRCodeGenerator from '../QRCodeGenerator/QRCodeGenerator';
// Translate 
// Translate

const AccountDetailsView = ({ walletAddress, privateKey, showPrivateKey, handleShowPrivateKey }) => {
  return (
    <div>
      <QRCodeGenerator walletAddress={walletAddress} />
      <p>Account address: {walletAddress}</p>
      {showPrivateKey && <p>Private Key: {privateKey}</p>}
      <Button onClick={handleShowPrivateKey}>
        {showPrivateKey ? "('Hide Private Key')" : "('Show Private Key')"}
      </Button>
    </div>
  );
};

export default AccountDetailsView;
