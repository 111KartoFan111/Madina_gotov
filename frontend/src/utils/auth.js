// utils/auth.js
import { getUserProfile } from './api';

export const checkAuthToken = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return false;
  }
  
  try {
    // Validate token with the server by making a request to get user profile
    await getUserProfile();
    return true;
  } catch (error) {
    // If the token is invalid or expired, clear localStorage
    console.error('Token validation failed:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
  }
};

// Function to handle initial authentication check on app startup
export const initAuth = async () => {
  try {
    const isAuthenticated = await checkAuthToken();
    
    if (isAuthenticated) {
      // Token is valid - you could refresh user data here if needed
      const userData = await getUserProfile();
      localStorage.setItem('user', JSON.stringify(userData));
    }
    
    return isAuthenticated;
  } catch (error) {
    console.error('Auth initialization failed:', error);
    return false;
  }
};