import React from 'react';
import { useParams } from 'react-router-dom';


const Transaction = () => {
    const { to, from, gas, value, data, gasPrice } = useParams();


    const onConfirm = () => {
        chrome.runtime.sendMessage({ type: 'TRANSACTION_CONFIRMED' }, (response) => {
            console.log('Transaction confirmed response:', response);

        });
    };

    const onCancel = () => {
        chrome.runtime.sendMessage({ type: 'TRANSACTION_CANCELLED' }, (response) => {
            console.log('Transaction cancelled response:', response);
        });
    };

    return (
        <div>
            <h2>Transaction Details</h2>
            <p>To: {to}</p>
            <p>From: {from}</p>
            <p>Gas: {gas}</p>
            <p>Value: {value}</p>
            <p>Data: {data}</p>
            <p>Gas Price: {gasPrice}</p>

            <button onClick={onConfirm}>Confirm</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    );
};

export default Transaction;
