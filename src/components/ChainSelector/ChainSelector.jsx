import { useState, useEffect } from 'react';
import { Button, Modal } from 'antd';
import { setLastChain, getAllChains } from '../../helpers/storage';
import { DownOutlined } from '@ant-design/icons';
import ChainList from './ChainList';
import AddChainForm from './AddChainForm';
import EditChainForm from './EditChainForm';
const ChainSelector = ({ selectedChain, setSelectedChain }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [chainOptions, setChainOptions] = useState([]);
  const [addChainView, setAddChainView] = useState(false);
  const [editChainView, setEditChainView] = useState(false);
  const [allChains, setAllChains] = useState({});
  const [chainEdit, setChainEdit] = useState(null);

  const fetchChainOptions = async () => {
    try {
      const chains = await getAllChains();
      setAllChains(chains);

      const options = Object.entries(chains).map(([hexString, chain]) => ({
        label: chain.name,
        value: hexString,
        userAdded: chain.userAdded,
      }));
      setChainOptions(options);
    } catch (error) {
      console.error("Error fetching chains:", error);
    }
  };

  const handleChainSelect = (val) => {
    setLastChain(val);
    setSelectedChain(val);
    setIsModalVisible(false);
  };

  useEffect(() => {
    fetchChainOptions();
  }, []);

  const chain = selectedChain ? allChains[selectedChain] : null;
console.log(`svg/color/${chain?.ticker?.toLowerCase()}.svg`)
  return (
    <>
      <Button
        shape="circle"
        onClick={() => setIsModalVisible(true)}
        style={{
          padding: '2px 6px',
          border: 'none',
          background: '#deeef7',
          borderRadius: '5px',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
        onFocus={(e) => e.currentTarget.style.outline = 'none'}
      >
        {selectedChain && chain ? (
  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
    <img
      src={`svg/color/${chain.ticker.toLowerCase()}.svg`}
      alt={chain.name}
      style={{ width: "20px", height: "20px" }}
    />
    <span style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}>
      {chain.name}
    </span>
  </div>
) : (
  <span>Select</span>
)}
        <DownOutlined />
      </Button>
      <Modal
        title="Select a Chain"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setAddChainView(false);
          setEditChainView(false);
          setChainEdit(null);
        }}
        footer={null}
        width={300}
        closable={false}
        centered
      >
        {editChainView && chainEdit ? (
          <EditChainForm
            fetchChainOptions={fetchChainOptions}
            setEditChainView={setEditChainView}
            setIsModalVisible={setIsModalVisible}
            chainEdit={chainEdit}
            setChainEdit={setChainEdit}
          />
        ) : addChainView ? (
          <AddChainForm
            fetchChainOptions={fetchChainOptions}
            setAddChainView={setAddChainView}
            setIsModalVisible={setIsModalVisible}
          />
        ) : (
          <ChainList
            chainOptions={chainOptions}
            selectedChain={selectedChain}
            handleChainSelect={handleChainSelect}
            setAddChainView={setAddChainView}
            setIsModalVisible={setIsModalVisible}
            setSelectedChain={setSelectedChain}
            setEditChainView={setEditChainView}
            setChainEdit={setChainEdit}
          />
        )}
      </Modal>
    </>
  );
};

export default ChainSelector;
