import React, { useState } from "react";
import { Input, Button, Spin, Tooltip, message } from "antd";
import { Web3 } from "web3";
import { addTransaction, getChain, getWalletData } from "../../helpers/storage";
import { decryptData } from "../../helpers/encryption";

// Translate

const Transfer = ({ walletAddress, selectedChain, setTransactionTrigger }) => {

  const [amountToSend, setAmountToSend] = useState(null);
  const [sendToAddress, setSendToAddress] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [hash, setHash] = useState(null);

  const sendTransaction = async (to, amount) => {
    try {
      if (walletAddress == to) {
        throw new Error("Sender Address is same as receiver address");
      }
      setProcessing(true);

      const chain = await getChain(selectedChain);
      const web3 = new Web3(chain.rpcUrl);
      const walletData = await getWalletData(walletAddress);
      const privateKey = await decryptData(walletData.walletKey);

      const gasPrice = await web3.eth.getGasPrice();
      const gas = await web3.eth.estimateGas({
        from: walletAddress,
        to: to,
        value: web3.utils.toWei(amount, "ether"),
      });

      const txObject = {
        from: walletAddress,
        to: to,
        gas,
        gasPrice: gasPrice,
        value: web3.utils.toWei(amount, "ether"),
      };

      const signedTransaction = await web3.eth.accounts.signTransaction(
        txObject,
        privateKey
      );

      const transaction = await web3.eth.sendSignedTransaction(
        signedTransaction.rawTransaction
      );

      setHash(transaction.transactionHash);
      message.success(
        `✅ Transaction successful with Hash: ${transaction.transactionHash}`
      );

      setAmountToSend("");
      setSendToAddress("");

      // ✅ Save transaction in storage
      await addTransaction(walletAddress, transaction, chain.name, amount);

      // ✅ Trigger refresh in TransactionHistory (important!)
      setTransactionTrigger((prev) => prev + 1);
    } catch (err) {
      console.log("Error:", err);
      setHash(null);
      message.error(`❌ Transaction failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="native">Only native token can be sent</div>
      <div className="sendRow">
        <p style={{ width: "90px", textAlign: "left" }}> To:</p>
        <Input
          value={sendToAddress}
          onChange={(e) => setSendToAddress(e.target.value)}
          placeholder="0x..."
        />
      </div>
      <div className="sendRow">
        <p style={{ width: "90px", textAlign: "left" }}> Amount:</p>
        <Input
          value={amountToSend}
          onChange={(e) => setAmountToSend(e.target.value)}
          placeholder="Amount"
        />
      </div>
      <Button
        className="tokensnd"
        style={{ width: "100%", marginTop: "5px", marginBottom: "20px" }}
        type="primary"
        onClick={() => sendTransaction(sendToAddress, amountToSend)}
        disabled={processing}
      >
        Send Tokens
      </Button>
      {processing && (
        <>
          <Spin />
          {hash && (
            <Tooltip title={hash}>
              <p>Hover For Tx Hash</p>
            </Tooltip>
          )}
        </>
      )}
    </>
  );
};

export default Transfer;
