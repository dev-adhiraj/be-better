import React, { useState } from 'react';
import { Modal, Button, message, Alert, Space, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Web3PrivateKeyModal = ({ privateKey, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(privateKey)
      .then(() => {
        setCopied(true);
        message.success('Private key copied to clipboard!');
        // Reset copied status after 3 seconds
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(() => {
        message.error('Failed to copy private key');
      });
  };

  return (
    <Modal
      open={!!privateKey}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={500}
      centered
    >
      <div style={{ padding: '20px' }}>
        <Title level={3} style={{ textAlign: 'center', color: '#ff4d4f' }}>
          ⚠️ Important Security Information
        </Title>
        
        <Alert
          message="Critical Security Warning"
          description="This is the only time you will see your private key. If you lose it, you will lose access to your wallet and funds. Store it securely and never share it with anyone."
          type="error"
          showIcon
          style={{ marginBottom: '20px' }}
        />
        
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px',
          wordBreak: 'break-all',
          fontFamily: 'monospace'
        }}>
          <Text strong>Private Key:</Text>
          <br />
          <Text code style={{ fontSize: '14px' }}>
            {privateKey}
          </Text>
        </div>
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={handleCopy}
            block
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
          
          <Button
            type="default"
            onClick={onClose}
            block
            style={{ 
              backgroundColor: '#52c41a', 
              borderColor: '#52c41a', 
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            I've Saved It - Continue to Dashboard
          </Button>
        </Space>
        
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Your public wallet address is automatically saved to your account.
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default Web3PrivateKeyModal;