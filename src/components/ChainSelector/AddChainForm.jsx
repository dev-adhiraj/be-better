import { Form, Input, Button, message } from 'antd';
import { addUserChain } from '../../helpers/chains';
// Translate 
// Translate

const AddChainForm = ({ fetchChainOptions, setAddChainView, setIsModalVisible }) => {
  const [form] = Form.useForm();
  const handleAddChain = async (values) => {
    try {
      await addUserChain(values.name, values.ticker, values.rpcUrl, values.blockExplorerUrl);
      fetchChainOptions();
      message.success('Chain added successfully!');
    } catch (error) {
      message.error(`Unable to add chain. Please verify RPC URL: ${error.message}`);
    } finally {
      setAddChainView(false);
      form.resetFields();
      setIsModalVisible(false);
    }
  };

  return (
    <Form
      form={form}
      onFinish={handleAddChain}
      layout="vertical"
      style={{ maxHeight: 'calc(60vh - 50px)', overflowY: 'scroll', scrollbarWidth: 'none' }}
    >
      <Form.Item
        name="name"
        label="Name"
        rules={[{ required: true, message: 'Please enter the name' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="ticker"
        label="Ticker"
        rules={[{ required: true, message: 'Please enter the ticker' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="rpcUrl"
        label="RPC URL"
        rules={[{ required: true, message: 'Please enter the RPC URL' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="blockExplorerUrl"
        label="Block Explorer URL"
        rules={[{ required: true, message: 'Please enter the Block Explorer URL' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
          Add Chain
        </Button>
      </Form.Item>
    </Form>
  );
};

export default AddChainForm;
