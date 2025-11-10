import React, { useState, useEffect } from "react";
import { List, Spin, Alert, Typography } from "antd";
import { getTransactions, getAllChains } from "../../helpers/storage";
import CopyButton from "../CopyButton";

const { Text, Link } = Typography;

const TransactionHistory = ({ walletAddress, selectedChain, transactionTrigger }) => {

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chain, setChain] = useState(null);

  // ✅ Chain init
  useEffect(() => {
    const initializeChain = async () => {
      try {
        const AllChains = await getAllChains();
        setChain(AllChains[selectedChain]);
      } catch (error) {
        console.error("Error initializing chain:", error);
      }
    };
    initializeChain();
  }, [selectedChain]);

  // ✅ Fetch transactions whenever trigger changes
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!walletAddress || !chain) return;

      setLoading(true);
      setError(null);

      try {
        const txs = await getTransactions(walletAddress, chain.name);
        console.log("Fetched Transactions:", txs);
        setTransactions(txs || []);
      } catch (error) {
        setError("Error fetching transactions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [walletAddress, chain, transactionTrigger]); // 👈 Trigger works here

  return (
    <Spin spinning={loading} tip="Loading transactions...">
      {error ? (
        <Alert message="Error" description={error} type="error" showIcon />
      ) : transactions && transactions.length > 0 ? (
        <List
          className="historypage"
          bordered={true}
          itemLayout="horizontal"
          dataSource={transactions}
          renderItem={(item) => (
            <List.Item
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <List.Item.Meta
                  title={
                    <div>
                      <Text strong>Hash : </Text>
                      <Text code>
                        {(item.transactionHash || item.hash || "").slice(0, 6)}...
                        {(item.transactionHash || item.hash || "").slice(-4)}
                      </Text>
                    </div>
                  }
                  description={
                    <div>
                      <Text>
                        To: {(item.to || "").slice(0, 6)}...
                        {(item.to || "").slice(-4)}
                      </Text>
                      <br />
					<Text>
  Amount:{" "}
  {item.amount
    ? Number(item.amount).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6, // 👈 6 decimal tak allow
      })
    : "0"}{" "}
  {item.type === "token_transfer" ? item.symbol : chain?.ticker}
</Text>

                    </div>
                  }
                />
              </div>
              <div>
                <CopyButton
                  content={item.transactionHash || item.hash}
                  style={{ marginLeft: 10 }}
                />
                <Link
                  href={`${chain?.blockExplorerUrl}/tx/${item.transactionHash || item.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Transaction
                </Link>
              </div>
            </List.Item>
          )}
        />
      ) : (
        <Text style={{ color: "#fff" }}>No transactions yet</Text>
      )}
    </Spin>
  );
};

export default TransactionHistory;
