// src/components/Approve.js

import React, { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers'; // ethers.js इंस्टॉल करो

const Approve = () => {
    const params = useMemo(() => new URLSearchParams(window.location.hash.split('?')[1] || ''), []);
    const [approval, setApproval] = useState({ id: params.get('id'), origin: params.get('origin') });
    const [transaction, setTransaction] = useState(null);
    const [gasOption, setGasOption] = useState('medium');
    const [signing, setSigning] = useState(null);
    
    useEffect(() => {
        // ट्रांजैक्शन रिक्वेस्ट के लिए
        if (window.location.hash.includes('approve-transaction')) {
            chrome.storage.session.get('pendingTransaction').then(({ pendingTransaction }) => {
                if (pendingTransaction) {
                    setApproval({ id: pendingTransaction.id, origin: pendingTransaction.origin });
                    setTransaction(pendingTransaction);
                }
            });
        } else {
            // साइन/कनेक्शन रिक्वेस्ट के लिए
            chrome.storage.session.get(['pendingSigning','pendingApproval']).then(({ pendingSigning, pendingApproval }) => {
                if (pendingSigning?.id) {
                    setApproval({ id: pendingSigning.id, origin: pendingSigning.origin });
                    setSigning(pendingSigning);
                } else if (pendingApproval?.id) {
                    setApproval(pendingApproval);
                }
            });
        }
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previousOverflow; };
    }, []);

    const approveConnection = () => {
        chrome.runtime.sendMessage({ type: 'APPROVAL_DECISION', id: approval.id, approved: true});
        window.close();
    };

    const rejectConnection = () => {
        chrome.runtime.sendMessage({ type: 'APPROVAL_DECISION', id: approval.id, approved: false });
        window.close();
    };
    
   
    const approveTransaction = async () => {
        let adjustedGasPrice;
        const baseGasPrice = ethers.BigNumber.from(transaction.gasPrice);
        if (gasOption === 'low') {
            adjustedGasPrice = baseGasPrice.mul(8).div(10); // 80% of base
        } else if (gasOption === 'high') {
            adjustedGasPrice = baseGasPrice.mul(12).div(10); // 120% of base
        } else {
            adjustedGasPrice = baseGasPrice;
        }

        chrome.runtime.sendMessage({
            type: 'TRANSACTION_APPROVAL',
            id: approval.id,
            approved: true,
            gasPrice: adjustedGasPrice.toString()
        }, () => { try { void chrome.runtime.lastError; } catch(_) {} });
        window.close();
    };

    const rejectTransaction = () => {
        chrome.runtime.sendMessage({ type: 'TRANSACTION_APPROVAL', id: approval.id, approved: false }, () => { try { void chrome.runtime.lastError; } catch(_) {} });
        window.close();
    };

    const approveSigning = () => {
        chrome.runtime.sendMessage({ type: 'SIGNING_APPROVAL', id: approval.id, approved: true }, () => { try { void chrome.runtime.lastError; } catch(_) {} });
        window.close();
    };

    const rejectSigning = () => {
        chrome.runtime.sendMessage({ type: 'SIGNING_APPROVAL', id: approval.id, approved: false }, () => { try { void chrome.runtime.lastError; } catch(_) {} });
        window.close();
    };

    const renderSigningPreview = () => {
        if (!signing) return null;
        const { method, params } = signing;
        if (method === 'personal_sign') {
            // Guess ordering and show message
            const p0 = params[0];
            const p1 = params[1];
            const isHex = typeof p0 === 'string' && p0.startsWith('0x');
            const message = isHex ? p0 : p1;
            let preview = message;
            try {
                if (ethers.utils.isHexString(message)) {
                    preview = ethers.utils.toUtf8String(message);
                }
            } catch (_) {}
            return (
                <>
                    <h3>Signature Request</h3>
                    <div style={{ margin: '8px 0' }}>Origin: <b>{signing.origin || 'Unknown'}</b></div>
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 280, overflow: 'auto', padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>
                        {preview}
                    </div>
                </>
            );
        } else {
            // typed data v4
            const addr = params[0];
            const data = typeof params[1] === 'string' ? params[1] : JSON.stringify(params[1], null, 2);
            return (
                <>
                    <h3>Typed Data Signature</h3>
                    <div style={{ margin: '8px 0' }}>Origin: <b>{signing.origin || 'Unknown'}</b></div>
                    <div style={{ margin: '8px 0' }}>Address: <b>{addr}</b></div>
                    <pre style={{ maxHeight: 280, overflow: 'auto', padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>{data}</pre>
                </>
            );
        }
    };

    return (
        <div className="approval-container">
        {transaction ? (
          <>
            <h3 className="approval-title">Transaction Approval</h3>
            <div className="approval-info">
              <div><span className="approval-label">Origin:</span> <span className="approval-value">{approval.origin || 'Unknown'}</span></div>
              <div><span className="approval-label">Chain:</span> <span className="approval-value">{transaction.chain.name || 'BNB Testnet'}</span></div>
              <div><span className="approval-label">From:</span> <span className="approval-value">{transaction.params.from}</span></div>
              <div><span className="approval-label">To (contract):</span> <span className="approval-value">{transaction.params.to}</span></div>
              <div><span className="approval-label">Value:</span> <span className="approval-value">{ethers.utils.formatEther(transaction.params.value || '0')} {transaction.chain?.ticker || 'ETH'}</span></div>
              <div><span className="approval-label">Gas Limit:</span> <span className="approval-value">{transaction.gasEstimate}</span></div>
              <div><span className="approval-label">Gas Price:</span> <span className="approval-value">{ethers.utils.formatUnits(transaction.gasPrice, 'gwei')} Gwei</span></div>
            </div>
      
            <div className="approval-actions">
              <button className="approval-btn" onClick={rejectTransaction}>Reject</button>
              <button className="approval-btn" onClick={approveTransaction}>Confirm</button>
            </div>
          </>
        ) : signing ? (
          <>
            {renderSigningPreview()}
            <div className="approval-actions">
              <button className="approval-btn" onClick={rejectSigning}>Reject</button>
              <button className="approval-btn" onClick={approveSigning}>Sign</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="approval-title">Connection Request</h3>
            <div className="approval-info">
              <div><span className="approval-label">Origin:</span></div>
              <div className="approval-value">{approval.origin || 'Unknown'}</div>
            </div>
      
            <div className="approval-actions">
              <button className="approval-btn" onClick={rejectConnection}>Reject</button>
              <button className="approval-btn" onClick={approveConnection}>Confirm</button>
            </div>
          </>
        )}
      </div>
    );
};

export default Approve;