import React, { useState, useEffect } from 'react';
import { List, Button, Typography, message } from 'antd';
import { EditTwoTone, DeleteTwoTone, PlusOutlined } from '@ant-design/icons';
import { deleteChain, getAllChains } from '../../helpers/storage';
const ChainList = ({ chainOptions, selectedChain, handleChainSelect, setAddChainView, setIsModalVisible, setSelectedChain, setEditChainView, setChainEdit }) => {
  // Separate "Alvchain" item and other items
  const AlvechainItem = chainOptions.find(item => item.label === "ALV");
  // console.log({AlvechainItem})
  const otherItems = chainOptions.filter(item => item.label !== "ALV");
  // console.log({otherItems})
  // Combine them with "Alvchain" at the top
  const sortedChainOptions = AlvechainItem ? [AlvechainItem, ...otherItems] : otherItems;
  // console.log({sortedChainOptions})
  const [allChains, setAllChains] = useState({});

  useEffect(() => {
    const fetchAllChains = async () => {
      try {
        const chains = await getAllChains();
        setAllChains(chains);
      } catch (error) {
        message.error('Failed to load chains');
        console.error(error);
      }
    };

    fetchAllChains();
  }, []);

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const editChainDetails = (chain) => {
    console.log("Editing chain:", chain);
    setChainEdit(chain);
    setEditChainView(true)
  };

  const removeChain = async (chain) => {
    try {
      await deleteChain(chain.value);
      setIsModalVisible(false);
      setSelectedChain('0x38'); 
      message.success(`${chain.label} chain deleted successfully`);
    } catch (error) {
      message.error('Failed to delete chain');
      console.error(error);
    }
  };

  return (
    <>
      <List
        dataSource={sortedChainOptions}
        style={{ maxHeight: 'calc(60vh - 50px)', overflowY: 'scroll', scrollbarWidth: 'none' }}
        renderItem={item => (
          <List.Item
            key={item.value}
            onClick={() => handleChainSelect(item.value)}
            style={{
              cursor: 'pointer',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              background: item.value === selectedChain ? '#e6f7ff' : '#ffffff',
              marginBottom: '8px',
              padding: '10px',
              transition: 'background 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography.Text className="addchain">
              <img
                src={`svg/color/${allChains[item.value]?.ticker?.toLowerCase()}.svg`}
                style={{ width: '20px', marginRight: '8px' }}
              />
              {item.label}
            </Typography.Text>
            {item.userAdded == 1 && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  onClick={(e) => { stopPropagation(e); editChainDetails(allChains[item.value]); }}
                  style={{ background: 'none', border: 'none', outline: 'none', boxShadow: 'none', marginRight: '8px' }}
                  icon={<EditTwoTone />}
                />
                <Button
                  onClick={(e) => { stopPropagation(e); removeChain(item); }}
                  style={{ background: 'none', border: 'none', outline: 'none', boxShadow: 'none' }}
                  icon={<DeleteTwoTone />}
                />
              </div>
            )}
          </List.Item>
        )}
      />
      <Button
        style={{ width: "100%", marginTop: "20px" }}
        type="primary"
        onClick={() => setAddChainView(true)}
      >
        <PlusOutlined /> <b>Add Chain</b>
      </Button>
    </>
  );
};

export default ChainList;
