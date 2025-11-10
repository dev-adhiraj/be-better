// API utility functions and constants

// Backend server URL
export const BACKEND_URL = 'http://localhost:3001';

// API endpoints
export const API_ENDPOINTS = {
  SIGNUP: `${BACKEND_URL}/api/signup`,
  LOGIN: `${BACKEND_URL}/api/login`,
  CREATE_CHECKOUT_SESSION: `${BACKEND_URL}/api/create-checkout-session`,
  USER_DATA: (email) => `${BACKEND_URL}/api/user/${encodeURIComponent(email)}`,
  HEALTH: `${BACKEND_URL}/api/health`,
  WEBHOOK: `${BACKEND_URL}/webhook`
};

export default {
  BACKEND_URL,
  API_ENDPOINTS
};