// components/Shared/UI/ProtectedRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Loader from './Loader';
import { checkAuthToken } from '../../../utils/auth';
import { setUser } from '../../../store/authSlice'; // Updated import path

const ProtectedRoute = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);
  
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // Use the checkAuthToken function to validate token with the server
        const isValid = await checkAuthToken();
        
        if (isValid) {
          // If token is valid but user isn't in Redux store, restore it
          if (!auth.isAuthenticated) {
            const userData = JSON.parse(localStorage.getItem('user'));
            if (userData) {
              dispatch(setUser(userData));
            }
          }
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Authentication verification failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };
    
    verifyAuth();
  }, [dispatch, auth.isAuthenticated]);
  
  if (isChecking) {
    return <div className="loading-container"><Loader /></div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;