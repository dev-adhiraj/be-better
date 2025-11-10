import React from 'react';
import { Button } from 'antd';
// Translate 
// Translate

const AddAccountView = ({ addChildAccount, handleImportAccountClick }) => {
  return (
    <>
      <Button style={{ width: "100%", marginTop: "20px" }} type="primary" onClick={addChildAccount}>
         Add account
      </Button><br />
      <Button style={{ width: "100%", marginTop: "20px" }} type="primary" onClick={handleImportAccountClick}>
         Import Account
      </Button>
    </>
  );
};

export default AddAccountView;
