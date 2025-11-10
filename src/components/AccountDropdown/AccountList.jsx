import React, { useEffect, useState } from "react";
import { Button } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import { Web3 } from "web3";
import AccountElements from './AccountElements';
import { getAllAccounts, getChain } from "../../helpers/storage";

const AccountList = ({ selectedChain, walletAddress, setWalletAddress, setAccountDetailsView, setInfoViewAccount, handleMenuClick, handleAddAccountClick }) => {
  const [accountItems, setAccountItems] = useState([]); // all accounts (visible + hidden)
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    const listAllAccounts = async () => {
      try {
        const allAccounts = await getAllAccounts();
        const currChain = await getChain(selectedChain);
        if (!currChain) return;
        const web3 = new Web3(currChain.rpcUrl);

        const items = await Promise.all(
          allAccounts.map(async (account) => {
            const weiBalance = await web3.eth.getBalance(account.address);
            const etherBalance = web3.utils.fromWei(weiBalance, 'ether');
            const num = Number(etherBalance);
            const roundedBalance = (Math.trunc(num * 100000) / 100000).toFixed(5);
            return {
              ...account,
              label: account.name,
              key: account.address,
              icon: <UserOutlined />,
              balance: roundedBalance,
              ticker: currChain.ticker
            };
          })
        );
        setAccountItems(items);
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    listAllAccounts();
  }, [selectedChain, walletAddress]);

  const handleAccountUpdate = (address, newName, changes) => {
    if (newName === null) {
      // account deleted
      setAccountItems(prevItems => prevItems.filter(item => item.address !== address));

      // reset wallet if deleted account was selected
      if (walletAddress === address) {
        setWalletAddress(null);
        setAccountDetailsView(false);
        setInfoViewAccount(null);
      }
    } else {
      // account updated (name/pin/hide)
      setAccountItems(prevItems => prevItems.map(item =>
        item.address === address ? { ...item, label: newName || item.label, name: newName || item.name, ...changes } : item
      ));
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, padding: '0 8px' }}>
        <Button 
          size="small" 
          type={showHidden ? "default" : "primary"}
          onClick={() => setShowHidden(prev => !prev)}
          style={{ 
            fontSize: '12px',
            height: '28px',
            borderRadius: '4px',
            minWidth: '140px'
          }}
        >
          {showHidden ? 'Show visible accounts' : 'Show hidden accounts'}
        </Button>
      </div>
      <div style={{ maxHeight: 'calc(60vh - 50px)', overflowY: 'scroll', scrollbarWidth: 'none' }}>
        {(() => {
          const list = accountItems.filter(i => showHidden ? !!i.hidden : !i.hidden);
          list.sort((a, b) => {
            if (showHidden) {
              const nameA = (a.label || '').toLowerCase();
              const nameB = (b.label || '').toLowerCase();
              if (nameA < nameB) return -1;
              if (nameA > nameB) return 1;
              return 0;
            }
            return a.pinned === b.pinned ? (a.label || '').localeCompare(b.label || '') : (a.pinned ? -1 : 1);
          });
          return list.map((item) => (
          <div key={item.key}>
            <AccountElements
              account={item}
              balance={item.balance}
              selectedChain={selectedChain}
              walletAddress={walletAddress}
              setAccountDetailsView={setAccountDetailsView}
              setInfoViewAccount={setInfoViewAccount}
              onClick={() => handleMenuClick(item)}
              onAccountNameUpdate={handleAccountUpdate}
              handleAccountUpdate={handleAccountUpdate}
            />
          </div>
          ));
        })()}
      </div>
      <Button style={{ width: "100%", marginTop: "20px" }} type="primary" onClick={handleAddAccountClick}>
        <PlusOutlined /> <b>Add Account</b>
      </Button>
    </>
  );
};

export default AccountList;
