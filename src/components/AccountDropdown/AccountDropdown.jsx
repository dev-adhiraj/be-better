import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Button, Modal, Space, Tooltip, Input, message } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { Web3 } from "web3";
import AccountDetailsView from "./AccountDetailsView";
import AddAccountView from "./AddAccountView";
import ImportAccountView from "./ImportAccountView";
import AccountList from "./AccountList";
import {
  createAccountEntry,
  countAccounts,
  getWalletData,
  setChildCount,
  getChildCount,
  getPass,
  setLastUsedAccount    
} from "../../helpers/storage";
import { encryptData, decryptData } from "../../helpers/encryption";
import { ethers } from "ethers";

// 👇 forwardRef added here
const AccountDropdown = forwardRef(({ walletAddress, setWalletAddress, selectedChain, onAccountNameUpdate }, ref) => {
  const web3 = new Web3();
  const [modalOpen, setModalOpen] = useState(false);
  const [addAccountView, setAddAccountView] = useState(false);
  const [importAccountView, setImportAccountView] = useState(false);
  const [accountDetailsView, setAccountDetailsView] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [infoViewAccount, setInfoViewAccount] = useState("");
  const [infoViewAccountPrivateKey, setInfoViewAccountPrivateKey] = useState("");
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  // 👇 expose modal open function to parent
  useImperativeHandle(ref, () => ({
    openAddImportModal: () => {
      setModalOpen(true);
      setAddAccountView(true);
      setImportAccountView(true);
      setAccountDetailsView(false);
    },
    openAddAccountView: () => {
      setModalOpen(true);
      setAddAccountView(true);        // ✅ Show Add Account view
      setImportAccountView(true);
      setAccountDetailsView(false);
    }
  }));

  const handleMenuClick = async (item) => {
    setWalletAddress(item.address);
    await setLastUsedAccount(item.address); // ✅ persist last used account
    setModalOpen(false);
  };
  
  const handleModalOpen = () => {
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setAddAccountView(false);
    setImportAccountView(false);
    setAccountDetailsView(false);
    setShowPrivateKey(false);
    setInfoViewAccount("");
  };

  const handleAddAccountClick = () => {
    setAddAccountView(true);
    setModalOpen(true);
  };

  const handleImportAccountClick = () => {
    setImportAccountView(true);
    setAddAccountView(false);
  };

  const addChildAccount = async () => {
    const i = await getChildCount();
    const index = parseInt(decryptData(i));
    const encryptedMnemonic = localStorage.getItem("SeedPhrase");
    const decryptedMnemonic = decryptData(encryptedMnemonic);
    const childWallet = ethers.Wallet.fromMnemonic(decryptedMnemonic, `m/44'/60'/0'/0/${index}`);
    const count = await countAccounts();
    createAccountEntry(childWallet.address, `Account ${count + 1}`, encryptData(childWallet.privateKey));
    setChildCount(encryptData((index + 1).toString()));
    setWalletAddress(childWallet.address);
    await setLastUsedAccount(childWallet.address); 
    setAddAccountView(false);
    setModalOpen(false);
  };

  const importFromPrivateKey = async () => {
    const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const account = web3.eth.accounts.privateKeyToAccount(formattedPrivateKey);
    const count = await countAccounts();
    createAccountEntry(account.address, `Account ${count + 1}`, encryptData(account.privateKey));
    setWalletAddress(account.address);
    setImportAccountView(false);
    setAddAccountView(false);
    setModalOpen(false);
    setPrivateKey("");
  };

  const getPrivateKey = async () => {
    try {
      const walletData = await getWalletData(infoViewAccount);
      return decryptData(walletData.walletKey);
    } catch (error) {
      console.error("Failed to get private key:", error);
      return "";
    }
  };

  const handleShowPrivateKey = async () => {
    if (showPrivateKey) {
      setShowPrivateKey(false);
      return;
    }
    setPasswordPromptOpen(true);
  };

  const handleConfirmPassword = async () => {
    try {
      setVerifyingPassword(true);
      const pass = await getPass();
      const storedPassword = decryptData(pass);
      if (storedPassword !== passwordInput) {
        message.error("Wrong Password");
        return;
      }
      const key = await getPrivateKey();
      setInfoViewAccountPrivateKey(key);
      setShowPrivateKey(true);
      setPasswordPromptOpen(false);
      setPasswordInput("");
    } catch (e) {
      message.error("Failed to verify password");
      console.error(e);
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleAccountNameUpdate = (address, newName) => {
    // Notify parent component if callback exists
    if (onAccountNameUpdate) {
      onAccountNameUpdate(address, newName);
    }
  };

  return (
    <Space wrap>
      <Button
        onClick={handleModalOpen}
        icon={<UserOutlined />}
        type="primary"
        style={{ backgroundColor: "white", color: "black" }}
      >
        <Tooltip title={walletAddress}>
          {`${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}
        </Tooltip>
      </Button>

      <Modal
        title={
          accountDetailsView
            ? ""
            : addAccountView
              ? "Add Account"
              : importAccountView
                ? "Import Account"
                : "Select an Account"
        }
        open={modalOpen}
        onCancel={handleModalClose}
        footer={null}
        width={300}
        closable={false}
        centered
      >
        {accountDetailsView ? (
          <AccountDetailsView
            walletAddress={infoViewAccount}
            privateKey={infoViewAccountPrivateKey}
            showPrivateKey={showPrivateKey}
            handleShowPrivateKey={handleShowPrivateKey}
          />
        ) : addAccountView ? (
          <AddAccountView
            addChildAccount={addChildAccount}
            handleImportAccountClick={handleImportAccountClick}
          />
        ) : importAccountView ? (
          <ImportAccountView
            privateKey={privateKey}
            setPrivateKey={setPrivateKey}
            importFromPrivateKey={importFromPrivateKey}
          />
        ) : (
          <AccountList
            selectedChain={selectedChain}
            walletAddress={walletAddress}
            setWalletAddress={setWalletAddress}
            setAccountDetailsView={setAccountDetailsView}
            setInfoViewAccount={setInfoViewAccount}
            handleMenuClick={handleMenuClick}
            handleAddAccountClick={handleAddAccountClick}
            onAccountNameUpdate={handleAccountNameUpdate}
          />
        )}
      </Modal>

      <Modal
        title="Enter Password"
        open={passwordPromptOpen}
        onOk={handleConfirmPassword}
        onCancel={() => { setPasswordPromptOpen(false); setPasswordInput(""); }}
        okButtonProps={{ loading: verifyingPassword }}
        destroyOnHidden
        width={250}
        centered
        style={{ top: 20 }}
      >
        <Input.Password
          placeholder="Enter password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          onPressEnter={handleConfirmPassword}
          autoFocus
        />
      </Modal>
    </Space>
  );
});

export default AccountDropdown;
