import React from "react";
import { LogoutOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { clearLocalStorage, clearIndexedDB } from "../helpers/storage";
import { useNavigate } from "react-router-dom";

const LogoutButton = ({ setSeedPhrase, setWallet, setBalance }) => {
  const navigate = useNavigate();

  const logout = async () => {
    console.log("Logout clicked ✅, clearing storage...");
    try {
      await clearLocalStorage();
      // Do NOT block on IndexedDB deletion in extension popup. Race with timeout.
      try {
        await Promise.race([
          clearIndexedDB(),
          new Promise((resolve) => setTimeout(resolve, 400))
        ]);
      } catch (_) {}
    } catch (e) {
      console.warn("Logout: storage clearing encountered an issue, continuing anyway.", e);
    }

    // Reset in-memory state if setters were provided
    try { setSeedPhrase?.(null); } catch(_) {}
    try { setWallet?.(null); } catch(_) {}
    try { setBalance?.(0); } catch(_) {}

    console.log("Storage cleared (or attempted), redirecting to home...");

    // Primary: router navigation
    try { navigate("/", { replace: true }); } catch(_) {}

    // Fallbacks for extension popup/environment where routing might not update view
    try { window.location.hash = "#/"; } catch(_) {}
    try { setTimeout(() => { try { window.location.replace(`${window.location.pathname}#/`); } catch(_) {} }, 0); } catch(_) {}
    try { setTimeout(() => { try { window.location.reload(); } catch(_) {} }, 20); } catch(_) {}
  };
  

  return (
    <div className="header">
      <Button
        onClick={logout}
        style={{
          background: "none",
          border: "none",
          outline: "none",
          boxShadow: "none",
        }}
        icon={<LogoutOutlined />}
      />
    </div>
  );
};

export default LogoutButton;
