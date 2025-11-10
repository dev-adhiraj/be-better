import CryptoJS from 'crypto-js';

// Use a hardcoded secret key for development
// In production, this should be securely stored
const secretKey = 'apollo-wallet-secret-key';

export const encryptData = (data) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
};

export const decryptData = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};