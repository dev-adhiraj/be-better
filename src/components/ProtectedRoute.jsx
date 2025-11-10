// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const token = localStorage.getItem("auth_token");

  if (!userData.email || !token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;