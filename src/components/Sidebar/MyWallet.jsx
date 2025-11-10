import { Button, message } from "antd";
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import './sidebar.css';

function MyWallet() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if payment was successful
    const queryParams = new URLSearchParams(location.search);
    const paymentSuccess = queryParams.get('payment_success');
    const sessionId = queryParams.get('session_id');
    
    if (paymentSuccess === 'true') {
      // Store payment success in localStorage
      localStorage.setItem('paymentSuccess', 'true');
      if (sessionId) {
        localStorage.setItem('paymentSessionId', sessionId);
      }
      
      
      // Remove the query parameters from the URL
      window.history.replaceState({}, document.title, "/myWallet");
    }
  }, [location]);

  // Check if user has successfully paid
  const hasPaid = localStorage.getItem('paymentSuccess') === 'true';

  return (
    <div>
      <h2>Be Better</h2>
      {hasPaid ? (
        <h4>Welcome! Your payment was successful.</h4>
      ) : (
        <h4>Your assets, your control</h4>
      )}

      <Button
        onClick={() => navigate("/yourwallet")}
        className="createbtn frontPageButton button1"
        type="primary"
      >
        Create A Wallet
      </Button>
      <Button
        onClick={() => navigate("/recover")}
        className="signinbtn frontPageButton"
        type="default"
      >
        Sign In With Seed Phrase
      </Button>
    </div>
  );
}

export default MyWallet;