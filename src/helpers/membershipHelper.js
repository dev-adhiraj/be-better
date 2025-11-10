// Helper functions for membership validation
import { API_ENDPOINTS } from '../utils/api';

/**
 * Validate membership status by checking with backend
 * @returns {Promise<Object>} User membership data or null if inactive
 */
export const validateMembershipStatus = async () => {
  try {
    // Get user email from localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userEmail = userData.email;
    
    console.log('Validating membership status for:', userEmail);
    
    if (!userEmail) {
      console.log('No user email found');
      return null;
    }
    
    // Fetch user data from backend
    const response = await fetch(API_ENDPOINTS.USER_DATA(userEmail));
    
    console.log('Membership validation response status:', response.status);
    
    if (!response.ok) {
      console.log('Membership validation failed');
      return null;
    }
    
    const data = await response.json();
    console.log('Membership validation data:', data);
    
    // Check if user has active membership
    if (data.membershipActive && data.membershipPlan) {
      console.log('User has active membership');
      return {
        membershipStatus: 'active',
        planType: data.membershipPlan
      };
    }
    
    console.log('User does not have active membership');
    return null;
  } catch (error) {
    console.error('Error validating membership status:', error);
    return null;
  }
};

/**
 * Clear membership data from localStorage
 */
export const clearMembershipData = () => {
  localStorage.removeItem('paymentSuccess');
  localStorage.removeItem('paymentSessionId');
  localStorage.removeItem('membershipStatus');
};

/**
 * Set membership data in localStorage after successful payment
 * @param {string} planType - The type of plan purchased (personal/business)
 */
export const setMembershipData = (planType) => {
  localStorage.setItem('paymentSuccess', 'true');
  localStorage.setItem('membershipStatus', planType);
};

/**
 * Fetch updated user data from backend after payment
 * @returns {Promise<Object>} Updated user data
 */
export const fetchUpdatedUserData = async () => {
  try {
    // Get user email from localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userEmail = userData.email;
    
    console.log('Fetching updated user data for:', userEmail);
    
    if (!userEmail) {
      return {
        membershipStatus: 'inactive',
        planType: null
      };
    }
    
    // Fetch user data from backend
    const response = await fetch(API_ENDPOINTS.USER_DATA(userEmail));
    
    console.log('Fetch updated user data response status:', response.status);
    
    if (!response.ok) {
      return {
        membershipStatus: 'inactive',
        planType: null
      };
    }
    
    const data = await response.json();
    console.log('Fetch updated user data result:', data);
    
    // Check if user has active membership
    if (data.membershipActive && data.membershipPlan) {
      return {
        membershipStatus: 'active',
        planType: data.membershipPlan
      };
    }
    
    return {
      membershipStatus: 'inactive',
      planType: null
    };
  } catch (error) {
    console.error('Error fetching updated user data:', error);
    return {
      membershipStatus: 'inactive',
      planType: null
    };
  }
};

export default {
  validateMembershipStatus,
  clearMembershipData,
  setMembershipData,
  fetchUpdatedUserData
};