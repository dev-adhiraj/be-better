import React from 'react'
import { Button, message } from 'antd'
import { CopyOutlined } from "@ant-design/icons";
const CopyButton = ({ content }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    message.success("copied");
  };
  return (
    <Button
      onClick={copyToClipboard}
      style={{ background: 'none', border: 'none', outline: 'none', boxShadow: 'none' }}
      icon={<CopyOutlined />}
    />
  )
}

export default CopyButton