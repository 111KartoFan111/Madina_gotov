import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser  } from '../../../store/authSlice';
import Loader from '../../Shared/UI/Loader';
import '../../../styles/Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: ''
  });
  const [errors, setErrors] = useState({});

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, isAuthenticated, error } = useSelector(state => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.full_name) {
      newErrors.full_name = 'Толық аты-жөні қажет';
    }

    if (!formData.email) {
      newErrors.email = 'Электрондық пошта қажет';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Электрондық пошта жарамсыз';
    }

    if (!formData.password) {
      newErrors.password = 'Құпия сөз қажет';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Құпия сөз кем дегенде 6 таңбадан тұруы керек';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Құпия сөздер сәйкес келмейді';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const { confirmPassword, ...registerData } = formData;
      dispatch(registerUser(registerData));
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>Жаңа тіркелгі жасау</h2>
        {error && <div className="error-message">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="full_name">Толық аты-жөні</label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className={errors.full_name ? 'input-error' : ''}
            />
            {errors.full_name && <span className="error">{errors.full_name}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="email">Электрондық пошта</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Құпия сөз</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Құпия сөзді растау</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'input-error' : ''}
            />
            {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
          </div>
          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? <Loader size="small" /> : 'Тіркелу'}
          </button>
        </form>
        <div className="auth-links">
          <p>
            Тіркелгіңіз бар ма? <Link to="/login">Кіру</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;