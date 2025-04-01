import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/authSlice';
import '../../styles/Navbar.css';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector(state => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <h1>NutriTrack</h1>
        </Link>
      </div>
      <div className="navbar-menu">
        {isAuthenticated ? (
          <>
            <div className="user-welcome">
              Қош келдіңіз, {user?.full_name || 'Қолданушы'}
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Шығу
            </button>
          </>
        ) : (
          <div className="auth-links">
            <Link to="/login" className="auth-link">Кіру</Link>
            <Link to="/register" className="auth-link btn-primary">Тіркелу</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;