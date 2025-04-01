import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import store from './store';
import Layout from './components/Layout/Layout';
import Loader from './components/Shared/UI/Loader';
import ProtectedRoute from './components/Shared/UI/ProtectedRoute';
import { initializeAuth } from './store/authSlice';
import './App.css';

// Ленивая загрузка компонентов беттерінің
const Dashboard = lazy(() => import('./components/Pages/Dashboard'));
const FoodTracker = lazy(() => import('./components/Pages/FoodTracker'));
const MealPlanner = lazy(() => import('./components/Pages/MealPlanner'));
const Profile = lazy(() => import('./components/Pages/Profile'));
const Login = lazy(() => import('./components/Pages/Auth/Login'));
const Register = lazy(() => import('./components/Pages/Auth/Register'));

// React Query клиентін баптау
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Терезе фокусында жаңартпау
      retry: 1, // Сәтсіз сұраныс болған жағдайда тек бір рет қайталау
      staleTime: 300000, // Деректер 5 минут бойы ескірмеген деп саналады
    },
  },
});

// Authentication initialization component
const AuthInitializer = ({ children }) => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);
  
  return children;
};

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthInitializer>
            <Suspense fallback={<div className="loading-container"><Loader /></div>}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<Layout />}>
                  {/* Бастапқы бетті басқару тақтасына бағыттау */}
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="food-tracker" element={
                    <ProtectedRoute>
                      <FoodTracker />
                    </ProtectedRoute>
                  } />
                  <Route path="meal-planner" element={
                    <ProtectedRoute>
                      <MealPlanner />
                    </ProtectedRoute>
                  } />
                  <Route path="profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                </Route>
                {/* Танылмаған барлық маршруттарды басқару тақтасына бағыттау */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </AuthInitializer>
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;