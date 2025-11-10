// src/pages/LoginSignup.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Card, Space, message, Modal } from "antd";
import "./LoginSignup.css";
import { ethers } from "ethers";

const API_BASE = "https://demo.velvosoft.com/api";

const LoginSignup = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Login State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register State
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // OTP State
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otp, setOtp] = useState("");

  // Wallet Modal
  const [walletModal, setWalletModal] = useState(false);
  const [walletData, setWalletData] = useState(null);

  /* ------------------- WALLET GENERATE ------------------- */
  const generateWallet = () => {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase
    };
  };

  /* ------------------- VALIDATIONS ------------------- */
  const validateLogin = () => {
    if (!loginEmail) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(loginEmail)) return "Invalid email.";
    if (!loginPassword) return "Password is required.";
    return null;
  };

  const validateRegister = () => {
    if (!name.trim()) return "Full name is required.";
    if (!email.trim()) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Invalid email format.";
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const validateOtp = () => {
    if (!otp.trim()) return "OTP is required.";
    if (!/^\d{6}$/.test(otp)) return "OTP must be 6 digits.";
    return null;
  };

  /* ------------------- LOGIN ------------------- */
  const handleLogin = async () => {
    const err = validateLogin();
    if (err) return message.error(err);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || "Login failed");

      // Fetch complete user data from API
      const userRes = await fetch(`${API_BASE}/get_user.php?email=${encodeURIComponent(data.email)}`);
      const userData = await userRes.json();

      if (!userRes.ok || userData.error) {
        throw new Error("Failed to fetch user data");
      }

      const apiUser = userData.user;
      const completeUserData = {
        name: apiUser.name,
        email: apiUser.email,
        walletAddress: apiUser.wallet_address || "Not connected",
        membershipPlan: apiUser.plan,
        membershipActive: apiUser.membership_active == 1
      };

      localStorage.setItem("userData", JSON.stringify(completeUserData));
      localStorage.setItem("auth_token", data.token);

      if (onLoginSuccess) {
        onLoginSuccess(completeUserData.walletAddress, "");
      }

      message.success(`Welcome, ${data.name}!`);
      navigate("/home/dashboard");

    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------- REGISTER → SEND OTP + WALLET ------------------- */
  /* ------------------- REGISTER → SEND OTP + WALLET ------------------- */
const handleRegister = async () => {
  const err = validateRegister();
  if (err) return message.error(err);

  setLoading(true);
  const newWallet = generateWallet();

  try {
    // FORM DATA BHEJO (URL-ENCODED)
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('wallet_address', newWallet.address);

    const res = await fetch(`${API_BASE}/register.php`, {
      method: "POST",
      body: formData // YE LINE → JSON nahi, FormData
    });

    const data = await res.json();

    if (!res.ok || data.error) throw new Error(data.error);

    setWalletData(newWallet);
    setWalletModal(true);
    setIsOtpStep(true);
    message.success("OTP sent! Check your email.");

  } catch (e) {
    message.error(e.message);
  } finally {
    setLoading(false);
  }
};

  /* ------------------- VERIFY OTP → AUTO LOGIN ------------------- */
  const handleVerifyOtp = async () => {
    const err = validateOtp();
    if (err) return message.error(err);

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/verify_otp.php?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`
      );
      const data = await res.json();

      if (data?.message?.includes("verified")) {
        message.success("Email verified! Logging you in...");

        const loginRes = await fetch(`${API_BASE}/login.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();

        if (!loginRes.ok || loginData.error) throw new Error("Auto login failed");

        // Fetch complete user data from API
        const userRes = await fetch(`${API_BASE}/get_user.php?email=${encodeURIComponent(email)}`);
        const userDataResponse = await userRes.json();

        const apiUser = userDataResponse.user;
        const userData = {
          name: apiUser.name,
          email: apiUser.email,
          walletAddress: apiUser.wallet_address || walletData.address,
          membershipPlan: apiUser.plan,
          membershipActive: apiUser.membership_active == 1
        };
        localStorage.setItem("userData", JSON.stringify(userData));
        localStorage.setItem("auth_token", loginData.token);

        if (onLoginSuccess) {
          onLoginSuccess(walletData.address, walletData.mnemonic);
        }

        message.success(`Welcome, ${loginData.name}!`);
        navigate("/home/dashboard");

      } else {
        throw new Error(data?.error || "Invalid OTP");
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------- RESEND OTP ------------------- */
  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/resend_otp.php?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );
      const data = await res.json();
      message.success(data.message || "New OTP sent!");
    } catch (e) {
      message.error("Resend failed");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------- UI ------------------- */
  if (!isSignup && !isOtpStep) {
    return (
      <div className="login-signup-container">
        <Card title="Welcome to BeBetter Wallet" className="login-signup-card">
          <div className="logo-container">
            <img src="/logodark.png" alt="Logo" className="login-logo" />
          </div>
          <p className="welcome-text">Your gateway to the decentralized world</p>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Input
              placeholder="Email Address"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              size="large"
            />
            <Input.Password
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              size="large"
            />
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleLogin}
              className="auth-button"
            >
              Login
            </Button>
            <Button
              size="large"
              block
              onClick={() => setIsSignup(true)}
              className="auth-button signup-button"
            >
              Sign Up
            </Button>
          </Space>
          <div className="footer-note">
            <p>By proceeding, you agree to our Terms and Privacy Policy</p>
          </div>
        </Card>
      </div>
    );
  }

  if (isSignup && !isOtpStep) {
    return (
      <div className="login-signup-container">
        <Card title="Create Account" className="login-signup-card">
          <div className="logo-container">
            <img src="/logodark.png" alt="Logo" className="login-logo" />
          </div>
          <p className="welcome-text">Create your account to get started</p>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Input
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="large"
            />
            <Input
              placeholder="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              size="large"
            />
            <Input.Password
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="large"
            />
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleRegister}
              className="auth-button"
            >
              Register
            </Button>
            <Button
              size="large"
              block
              onClick={() => {
                setIsSignup(false);
                setName("");
                setEmail("");
                setPassword("");
              }}
              className="auth-button signup-button"
            >
              Back to Login
            </Button>
          </Space>
          <div className="footer-note">
            <p>By signing up, you agree to our Terms and Privacy Policy</p>
          </div>
        </Card>
      </div>
    );
  }

  // OTP + WALLET MODAL
  return (
    <>
      <div className="login-signup-container">
        <Card title="Verify Your Email" className="login-signup-card">
          <div className="logo-container">
            <img src="/logodark.png" alt="Logo" className="login-logo" />
          </div>
          <p className="welcome-text">
            We sent a 6-digit OTP to <strong>{email}</strong>
          </p>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Input
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              size="large"
            />
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleVerifyOtp}
              className="auth-button"
            >
              Verify & Login
            </Button>
            <Button type="text" block loading={loading} onClick={handleResendOtp}>
              Resend OTP
            </Button>
          </Space>
          <div className="footer-note">
            <p>OTP expires in 1 hour</p>
          </div>
        </Card>
      </div>

      {/* WALLET POPUP */}
<Modal
  title="Your Wallet Created!"
  open={walletModal}
  footer={null}
  onCancel={() => setWalletModal(false)}
  width={500}
>
  {/* Address */}
  <p><strong>Wallet Address:</strong></p>
  <Input
    value={walletData?.address}
    readOnly
    addonAfter={
      <Button
        size="small"
        onClick={() => {
          navigator.clipboard.writeText(walletData?.address);
          message.success("Address copied!");
        }}
      >
        Copy
      </Button>
    }
  />

  {/* Seed Phrase */}
  {/* <p style={{ marginTop: 16 }}><strong>Seed Phrase (Save securely!):</strong></p>
  <Input.TextArea
    value={walletData?.mnemonic}
    readOnly
    rows={3}
    addonAfter={
      <Button
        size="small"
        onClick={() => {
          navigator.clipboard.writeText(walletData?.mnemonic);
          message.success("Seed phrase copied!");
        }}
      >
        Copy
      </Button>
    }
  /> */}

  {/* Private Key */}
  <p style={{ marginTop: 16 }}><strong>Private Key (Never share!):</strong></p>
  <Input
    value={walletData?.privateKey}
    readOnly
    type="test"
    addonAfter={
      <Button
        size="small"
        onClick={() => {
          navigator.clipboard.writeText(walletData?.privateKey);
          message.success("Private key copied!");
        }}
      >
        Copy
      </Button>
    }
  />

  <div style={{ marginTop: 20, color: "red", fontWeight: "bold" }}>
    Private key is shown only once. Copy it now!
  </div>

  <Button
    type="primary"
    block
    style={{ marginTop: 16 }}
    onClick={() => setWalletModal(false)}
  >
    I have saved everything
  </Button>
</Modal>
    </>
  );
};

export default LoginSignup;