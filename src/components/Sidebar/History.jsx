import React, { useEffect, useState } from 'react';

function History() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const tx = JSON.parse(localStorage.getItem('transactions') || '[]');
    // sort newest first
    tx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setTransactions(tx);
  }, []);

  const refresh = () => {
    const tx = JSON.parse(localStorage.getItem('transactions') || '[]');
    tx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setTransactions(tx);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    const updated = transactions.filter((t) => t.id !== id);
    localStorage.setItem('transactions', JSON.stringify(updated));
    setTransactions(updated);
  };

  const handleClear = () => {
    if (!window.confirm('Clear all transaction history?')) return;
    localStorage.removeItem('transactions');
    setTransactions([]);
  };


  const fmt = (ts) => new Date(ts).toLocaleString();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Transaction History</h1>
        <div>
          <button className="btn" onClick={refresh} style={{ marginRight: 8 }}>Refresh</button>
          <button className="btn" onClick={handleClear} style={{ background: '#d9534f', borderColor: '#d43f3a', color:'#fff' }}>Clear All</button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className='wallet-card' style={{ marginTop: 20 }}>
          <p>No transactions recorded yet.</p>
        </div>
      ) : (
        <ul className="asset-list" style={{ marginTop: 16 }}>
          {transactions.map((tx) => (
            <li key={tx.id} className="asset-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
              <div style={{ maxWidth: '75%' }}>
                <div style={{ fontWeight: 600 }}>{tx.type} — {tx.title || tx.details || 'Details'}</div>
                {tx.details && <div style={{ fontSize: 13, color: '#555' }}>{tx.details}</div>}
                <div style={{ fontSize: 12, color: '#777', marginTop: 6 }}>
                  {tx.amount ? `Amount: ${tx.amount} • ` : ''}{fmt(tx.timestamp)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {tx.download && (
                  <a href={tx.download} download={tx.filename || 'file'} className="btn-sm">Download</a>
                )}
                <button className="btn" onClick={() => handleDelete(tx.id)} style={{ background: '#d9534f', borderColor: '#d43f3a' }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default History;