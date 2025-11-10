// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Button, message, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';

const API_BASE = "https://demo.velvosoft.com/api";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [planType, setPlanType] = useState(null);
  const navigate = useNavigate();

  const fetchUserFromApi = async () => {
    const stored = JSON.parse(localStorage.getItem('userData') || '{}');
    const email = stored.email;

    if (!email) {
      message.error("No user logged in");
      navigate("/");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/get_user.php?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to fetch user");
      }

      const apiUser = data.user;

      const updatedUser = {
        name: apiUser.name,
        email: apiUser.email,
        walletAddress: apiUser.wallet_address || 'Not connected',
        membershipPlan: apiUser.plan,  // CORRECT FIELD
        membershipActive: apiUser.membership_active    // 1 = active
      };

      localStorage.setItem('userData', JSON.stringify(updatedUser));
      localStorage.setItem('auth_token', apiUser.token || '');

      setUser(updatedUser);
      setMembershipStatus(updatedUser.membershipActive ? 'active' : null);
      setPlanType(updatedUser.membershipPlan);

    } catch (error) {
      console.error("API Error:", error);
      message.error("Session expired. Please login again.");
      localStorage.clear();
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserFromApi();
  }, [navigate]);

  const formatPlanName = (plan) => {
    if (plan === 'personal') return 'Personal Plan';
    if (plan === 'business') return 'Business Plan';
    return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'None';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return <p>No user data found. Please login.</p>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#000000ff', fontSize: '40px' }}>Dashboard</h1>

      {/* User Info Card */}
      <div style={{
        background: '#f9f9f9',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2>User Information</h2>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Wallet Address:</strong> 
          <span> {user.walletAddress}</span>
        </p>
        <p><strong>Referral Code:</strong> BB2023XYZ789</p>
      </div>

      {/* Membership Card */}
      <div style={{
        background: membershipStatus === 'active' ? '#e6f7ff' : '#fff2e8',
        padding: '20px',
        borderRadius: '10px',
        border: '1px solid #d9d9d9'
      }}>
        <h2>Membership Status</h2>
        {membershipStatus === 'active' ? (
          <div>
            <p><strong>Current Plan:</strong> {formatPlanName(planType)}</p>
            <p style={{ color: 'green' }}>All features unlocked!</p>
          </div>
        ) : (
          <div>
            <p style={{ color: '#d4380d' }}>
              No active membership. Purchase from "Be Better Plans".
            </p>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <Button
        type="primary"
        danger
        style={{ marginTop: '20px' }}
        onClick={() => {
          localStorage.clear();
          message.success("Logged out!");
          navigate("/");
        }}
      >
        Logout
      </Button>
    </div>
  );
}

export default Dashboard;