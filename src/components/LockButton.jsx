import React from "react";
//import { LockFilled } from "@ant-design/icons";
import { Button } from 'antd';
import { deleteLocalStorageItem } from "../helpers/storage";
import { useNavigate } from 'react-router-dom';

const LockButton = () => {
  const navigate = useNavigate();
  const handleClick = () => {
    deleteLocalStorageItem('loggedIn');
    // Ensure we leave any protected route like /wallet
    navigate("/");
  };

  return (
    <div className="header">
     <Button
  onClick={handleClick}
  style={{ background: 'none', border: 'none', outline: 'none', boxShadow: 'none' }}
  icon={
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width="32"
      height="32"
      fill="#FFD700"
    >
     
      <circle cx="256" cy="300" r="150" />

      
      <path d="M176 180v-40c0-44.2 35.8-80 80-80s80 35.8 80 80v40"
            fill="none"
            stroke="#FFD700"
            strokeWidth="40"
            strokeLinecap="round"/>

   
      <path d="M256 260a25 25 0 0 0-10 48v44a10 10 0 0 0 20 0v-44a25 25 0 0 0-10-48z"
            fill="black"/>
    </svg>
  }
/>
    </div>
  );
};

export default LockButton;
