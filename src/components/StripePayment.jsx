// src/components/StripePayment.jsx
import React, { useState, useEffect } from 'react';
import { Button, message } from 'antd';
import '../pages/LoginSignup.css';

// Initialize Stripe (not used in redirect mode, but keep it)
const stripePromise = null; // Not needed for redirect

const StripePayment = ({ planType, planPrice, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    handlePayment();
  }, []);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const userEmail = userData.email;

      if (!userEmail) {
        message.error('User not found. Please log in again.');
        setLoading(false);
        onCancel();
        return;
      }

      const checkoutUrls = {
        personal: 'https://buy.stripe.com/test_4gM4gA6tt0589lraS67g401',
        business: 'https://buy.stripe.com/test_cNi14o6tt8BE69f8JY7g400'
      };

      const checkoutUrl = checkoutUrls[planType];
      if (!checkoutUrl) {
        message.error('Invalid plan selected.');
        setLoading(false);
        onCancel();
        return;
      }

      // ADD RETURN URL WITH PLAN & SUCCESS
      const returnUrl = `${window.location.origin}/home/dashboard?plan=${planType}&success=true`;
      const finalUrl = `${checkoutUrl}?prefilled_email=${encodeURIComponent(userEmail)}&client_reference_id=${userEmail}`;

      message.info('Redirecting to Stripe...');
      window.location.href = finalUrl;

    } catch (error) {
      console.error('Error:', error);
      message.error('Payment error: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="payment-form" style={{ textAlign: 'center', padding: '30px' }}>
      <h2>Redirecting to Payment...</h2>
      <p>You will be redirected to Stripe to complete your purchase.</p>
      <Button type="primary" loading={loading} size="large" block disabled>
        {loading ? 'Processing...' : 'Redirecting...'}
      </Button>
      <Button onClick={onCancel} size="large" block style={{ marginTop: '10px' }} disabled={loading}>
        Cancel
      </Button>
    </div>
  );
};

export default StripePayment;