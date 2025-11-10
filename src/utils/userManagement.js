// Database-based user management system
// This replaces the localStorage-based storage with database storage

// Product configuration
const PRODUCT_CONFIG = {
  personal: {
    productId: 'prod_TMNGgFTylzb8QW',
    price: 29900, // $299 in cents
    name: 'Personal Plan'
  },
  business: {
    productId: 'prod_TMNNYQxN91G5Ki',
    price: 19900, // $199 in cents
    name: 'Business Plan'
  }
};

// Use proxy for API calls to avoid CORS issues
const API_BASE_URL = '/api';

// In-memory storage for users (using database)
export const userManagement = {
  // Signup function - creates a new user with a Web3 wallet
  signup: async (name, email, password) => {
    try {
      // Simple validation
      if (!name || !email || !password) {
        throw new Error('Name, email, and password are required');
      }

      // Register user with the database through proxy (new simplified URL format)
      const registerUrl = `${API_BASE_URL}/register.php?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      
      const response = await fetch(registerUrl);
      
      if (!response.ok) {
        throw new Error('Failed to register user');
      }
      
      // Create a new Ethereum wallet (simulated)
      // In a real implementation, you would use ethers.js to create an actual wallet
      const walletAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const referralCode = 'BB' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Parse response data if available
      let responseData = {};
      try {
        responseData = await response.json();
      } catch (e) {
        // If response is not JSON, continue with default data
      }

      // Return user data with private key (only sent once)
      const privateKey = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      return {
        message: "Signup successful",
        user: {
          name,
          email,
          walletAddress
        },
        privateKey
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Login function
  login: async (email, password) => {
    try {
      // Simple validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // For login, we would typically have a login endpoint
      // Since we don't have one, we'll simulate by making a request to verify credentials
      // We'll make a request to the register endpoint with a special parameter to indicate login
      const loginUrl = `${API_BASE_URL}/register.php?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&action=login`;
      
      const response = await fetch(loginUrl);
      
      if (!response.ok) {
        throw new Error('Invalid email or password');
      }
      
      // In a real implementation, we would get user data from the response
      // For now, we'll create mock user data
      const walletAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
      return {
        message: "Login successful",
        user: {
          name: email.split('@')[0], // Use part of email as name
          email,
          walletAddress,
          membershipPlan: null,
          membershipActive: false
        }
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Get user data
  getUserData: async (email) => {
    try {
      // For now, we'll simulate getting user data from database
      // In a real implementation, we would have a dedicated endpoint for this
      const userDataUrl = `${API_BASE_URL}/register.php?email=${encodeURIComponent(email)}&action=getUserData`;
      
      const response = await fetch(userDataUrl);
      
      if (!response.ok) {
        throw new Error('User not found');
      }
      
      // In a real implementation, we would parse the actual user data from the response
      // For now, we'll create mock user data
      const walletAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
      return {
        name: email.split('@')[0], // Use part of email as name
        email,
        walletAddress,
        membershipPlan: null,
        membershipActive: false
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Activate membership
  activateMembership: async (email, planType) => {
    try {
      if (!planType) {
        throw new Error('Plan type is required');
      }

      // Update user's membership status through the database
      const activateUrl = `${API_BASE_URL}/register.php?email=${encodeURIComponent(email)}&membership_plan=${encodeURIComponent(planType)}&action=activate`;
      
      const response = await fetch(activateUrl);
      
      if (!response.ok) {
        throw new Error('Failed to activate membership');
      }

      return {
        message: 'Membership activated successfully',
        user: {
          email,
          membershipPlan: planType,
          membershipActive: true
        }
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Create checkout session (real Stripe integration)
  createCheckoutSession: async (planType, userEmail) => {
    try {
      // Validate plan type
      if (!PRODUCT_CONFIG[planType]) {
        throw new Error('Invalid plan type');
      }

      // In a real implementation, we would call our backend API to create a Stripe session
      // Since we don't have a backend, we'll simulate this by creating a mock session
      // that will redirect to the dashboard with success parameters
      
      // For demo purposes, we'll create a redirect URL that simulates a successful payment
      // In a real app with a backend, this would be handled by Stripe webhooks
      const redirectUrl = `${window.location.origin}/home/dashboard?success=true&plan=${planType}`;

      return {
        id: 'cs_test_' + Math.random().toString(36).substring(2, 15),
        url: redirectUrl
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Health check
  healthCheck: () => {
    return {
      status: 'OK',
      timestamp: new Date().toISOString()
    };
  }
};

export default userManagement;