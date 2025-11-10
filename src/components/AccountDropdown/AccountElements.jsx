import React, { useState, useEffect } from "react";
import { UserOutlined, EllipsisOutlined, ExportOutlined, PushpinOutlined, EyeInvisibleOutlined, EditOutlined, InfoCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import { Card, Dropdown, message, Input, Modal } from "antd";
import { Web3 } from 'web3';
import { getChain, updateAccountName, deleteAccount, setAccountPinned, setAccountHidden } from "../../helpers/storage";

const AccountElements = ({ walletAddress, account, selectedChain, onClick, setAccountDetailsView, setInfoViewAccount, onAccountNameUpdate, handleAccountUpdate }) => {
  const [balance, setBalance] = useState(0);
  const [chain, setChain] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState(account.label || account.name);

  useEffect(() => {
    const fetchChainData = async () => {
      try {
        const chainData = await getChain(selectedChain);
        setChain(chainData);
        if (chainData) {
          const web3 = new Web3(chainData.rpcUrl);
          const weiBalance = await web3.eth.getBalance(account.address);
          const etherBalance = web3.utils.fromWei(weiBalance, 'ether');
          const num = Number(etherBalance);
          const truncated = Math.trunc(num * 1000) / 1000;
          setBalance(truncated.toFixed(5));
        }
      } catch (error) {
        message.error('Failed to fetch chain data or balance');
        console.error(error);
      }
    };

    fetchChainData();
  }, [selectedChain, account.address]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (chain) {
        try {
          const web3 = new Web3(chain.rpcUrl);
          const weiBalance = await web3.eth.getBalance(account.address);
          const etherBalance = web3.utils.fromWei(weiBalance, 'ether');
          const num = Number(etherBalance);
          const truncated = Math.trunc(num * 1000) / 1000;
          setBalance(truncated.toFixed(5));
        } catch (error) {
          message.error('Failed to fetch balance');
          console.error(error);
        }
      }
    };

    fetchBalance();
  }, [chain]);

  const handleMenuClick = (e) => {
    if (e.key === "1") {
      setInfoViewAccount(account.address);
      setAccountDetailsView(true);
    } else if (e.key === "2") {
      window.open(`${chain.blockExplorerUrl}/address/${account.address}`, '_blank');
    } else if (e.key === "3") {
      (async () => {
        try {
          const nextPinned = !account.pinned;
          await setAccountPinned(account.address, nextPinned);
          account.pinned = nextPinned;
          if (handleAccountUpdate) handleAccountUpdate(account.address, account.name, { pinned: nextPinned });
          message.success(nextPinned ? 'Pinned to top' : 'Unpinned');
        } catch (error) {
          message.error('Failed to update pin');
          console.error(error);
        }
      })();
    } else if (e.key === "4") {
      (async () => {
        try {
          const nextHidden = !account.hidden;
          await setAccountHidden(account.address, nextHidden);
          account.hidden = nextHidden;
          if (handleAccountUpdate) handleAccountUpdate(account.address, account.name, { hidden: nextHidden });
          message.success(nextHidden ? 'Account hidden' : 'Account unhidden');
        } catch (error) {
          message.error('Failed to update visibility');
          console.error(error);
        }
      })();
    } else if (e.key === "5") {
      setIsEditModalOpen(true);
    } else if (e.key === "6") {
      Modal.confirm({
        title: 'Delete Account',
        content: 'Are you sure you want to delete this account? This action cannot be undone.',
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            await deleteAccount(account.address);
            handleAccountUpdate(account.address, null);
            message.success('Account deleted successfully');
          } catch (error) {
            message.error('Failed to delete account');
            console.error(error);
          }
        }
      });
    }
  };

  const handleEditName = async () => {
    try {
      if (!newAccountName.trim()) {
        message.error('Account name cannot be empty');
        return;
      }
      
      await updateAccountName(account.address, newAccountName.trim());
      message.success('Account name updated successfully');
      setIsEditModalOpen(false);
      
      // Update the local account object
      account.label = newAccountName.trim();
      account.name = newAccountName.trim();
      
      // Notify parent component about the update
      if (onAccountNameUpdate) {
        onAccountNameUpdate(account.address, newAccountName.trim());
      }
    } catch (error) {
      message.error('Failed to update account name');
      console.error(error);
    }
  };

  const items = [
    {
      label: 'Account Details',
      key: '1',
      icon: <InfoCircleOutlined />,
    },
    {
      label: 'View on explorer',
      key: '2',
      icon: <ExportOutlined />,
    },
    {
      label: 'Edit Name',
      key: '5',
      icon: <EditOutlined />,
    },
    {
      label: account.pinned ? 'Unpin from top' : 'Pin on top',
      key: '3',
      icon: <PushpinOutlined />,
      disabled: false,
    },
    {
      label: account.hidden ? 'Unhide Account' : 'Hide Account',
      key: '4',
      icon: <EyeInvisibleOutlined />,
      disabled: false,
    },
    {
      label: 'Delete Account',
      key: '6',
      icon: <DeleteOutlined />,
      disabled: false,
    }
  ];

  const menuProps = {
    items,
    onClick: handleMenuClick,
  };

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <>
      <Card hoverable style={{ background: (walletAddress === account.address) ? "purple" : "white" }} onClick={onClick}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: (walletAddress === account.address) ? "white" : "black" }}>
          <UserOutlined style={{ fontSize: 24 }} />
          <div style={{ marginLeft: 10 }}>
            <b>{account.label}</b><br />
            {`${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
          </div>
          <div style={{ marginLeft: 10 }}>
            {balance} {chain ? chain.ticker : ''}
          </div>
          <div onClick={stopPropagation}>
            <Dropdown menu={menuProps} trigger={['click']}>
              <EllipsisOutlined style={{ fontSize: 18, color: "#1890ff", transform: "rotate(90deg)" }} />
            </Dropdown>
          </div>
        </div>
      </Card>

      <Modal
        title="Edit Account Name"
        open={isEditModalOpen}
        onOk={handleEditName}
        onCancel={() => setIsEditModalOpen(false)}
        okText="Save"
        cancelText="Cancel"
      >
        <Input
          placeholder="Enter new account name"
          value={newAccountName}
          onChange={(e) => setNewAccountName(e.target.value)}
          onPressEnter={handleEditName}
          autoFocus
        />
      </Modal>
    </>
  );
};

export default AccountElements;
