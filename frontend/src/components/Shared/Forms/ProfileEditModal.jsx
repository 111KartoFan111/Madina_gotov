import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { updateUserProfile } from '../../../utils/api';
import Loader from '../UI/Loader';
import '../../../styles/ProfileModal.css';

const ProfileEditModal = ({ profile, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    gender: '',
    age: '',
    weight: '',
    height: '',
    activity_level: 'moderate',
    goal: 'maintain',
    dietary_preferences: []
  });
  
  const [errors, setErrors] = useState({});

  // Инициализация формы данными профиля при открытии модального окна
  useEffect(() => {
    if (profile && isOpen) {
      setFormData({
        ...profile,
        age: profile.age?.toString() || '',
        weight: profile.weight?.toString() || '',
        height: profile.height?.toString() || ''
      });
      setErrors({});
    }
  }, [profile, isOpen]);

  // Мутация для обновления профиля
  const updateProfileMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (data) => {
      onSuccess(data);
      onClose();
    }
  });
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      const updatedPreferences = checked
        ? [...formData.dietary_preferences, value]
        : formData.dietary_preferences.filter(pref => pref !== value);
        
      setFormData(prev => ({
        ...prev,
        dietary_preferences: updatedPreferences
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Очистка ошибки для этого поля, если она существует
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const validate = () => {
    const newErrors = {};
    
    if (!formData.full_name) {
      newErrors.full_name = 'Толық аты-жөні міндетті';
    }
    
    if (!formData.email) {
      newErrors.email = 'Электрондық пошта міндетті';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Электрондық пошта жарамсыз';
    }
    
    if (formData.age && (isNaN(formData.age) || Number(formData.age) < 0)) {
      newErrors.age = 'Жас оң сан болуы керек';
    }
    
    if (formData.weight && (isNaN(formData.weight) || Number(formData.weight) < 0)) {
      newErrors.weight = 'Салмақ оң сан болуы керек';
    }
    
    if (formData.height && (isNaN(formData.height) || Number(formData.height) < 0)) {
      newErrors.height = 'Бой оң сан болуы керек';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
      // Конвертация строковых значений в числа, где это необходимо
      const profileData = {
        ...formData,
        age: formData.age ? Number(formData.age) : null,
        weight: formData.weight ? Number(formData.weight) : null,
        height: formData.height ? Number(formData.height) : null
      };
      
      updateProfileMutation.mutate(profileData);
    }
  };
  
  // Если модальное окно закрыто, не рендерим его содержимое
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Жеке ақпарат өзгерту</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        {updateProfileMutation.isError && (
          <div className="error-message">
            Профильді жаңарту сәтсіз аяқталды: {updateProfileMutation.error?.message}
          </div>
        )}
        
        <form className="profile-form" onSubmit={handleSubmit}>
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
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gender">Жынысы</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender || ''}
                onChange={handleChange}
              >
                <option value="">Жынысты таңдаңыз</option>
                <option value="male">Ер</option>
                <option value="female">Әйел</option>
                <option value="other">Басқа</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="age">Жасы</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className={errors.age ? 'input-error' : ''}
              />
              {errors.age && <span className="error">{errors.age}</span>}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="weight">Салмағы (кг)</label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className={errors.weight ? 'input-error' : ''}
              />
              {errors.weight && <span className="error">{errors.weight}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="height">Бойы (см)</label>
              <input
                type="number"
                id="height"
                name="height"
                value={formData.height}
                onChange={handleChange}
                className={errors.height ? 'input-error' : ''}
              />
              {errors.height && <span className="error">{errors.height}</span>}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="activity_level">Белсенділік деңгейі</label>
            <select
              id="activity_level"
              name="activity_level"
              value={formData.activity_level}
              onChange={handleChange}
            >
              <option value="sedentary">Отырықшы (жаттығу жоқ немесе өте аз)</option>
              <option value="light">Жеңіл (аптасына 1-3 күн жаттығу)</option>
              <option value="moderate">Орташа (аптасына 3-5 күн жаттығу)</option>
              <option value="active">Белсенді (аптасына 6-7 күн жаттығу)</option>
              <option value="very_active">Өте белсенді (күнделікті қарқынды жаттығу)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="goal">Фитнес мақсаты</label>
            <select
              id="goal"
              name="goal"
              value={formData.goal}
              onChange={handleChange}
            >
              <option value="lose">Салмақ жоғалту</option>
              <option value="maintain">Салмақты сақтау</option>
              <option value="gain">Салмақ қосу</option>
              <option value="build_muscle">Бұлшықет құру</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Тамақтану артықшылықтары</label>
            <div className="checkbox-group">
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="vegetarian"
                  name="dietary_preferences"
                  value="vegetarian"
                  checked={formData.dietary_preferences?.includes('vegetarian') || false}
                  onChange={handleChange}
                />
                <label htmlFor="vegetarian">Вегетариандық</label>
              </div>
              
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="vegan"
                  name="dietary_preferences"
                  value="vegan"
                  checked={formData.dietary_preferences?.includes('vegan') || false}
                  onChange={handleChange}
                />
                <label htmlFor="vegan">Веган</label>
              </div>
              
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="gluten_free"
                  name="dietary_preferences"
                  value="gluten_free"
                  checked={formData.dietary_preferences?.includes('gluten_free') || false}
                  onChange={handleChange}
                />
                <label htmlFor="gluten_free">Глютенсіз</label>
              </div>
              
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="dairy_free"
                  name="dietary_preferences"
                  value="dairy_free"
                  checked={formData.dietary_preferences?.includes('dairy_free') || false}
                  onChange={handleChange}
                />
                <label htmlFor="dairy_free">Сүт өнімдерінсіз</label>
              </div>
              
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="keto"
                  name="dietary_preferences"
                  value="keto"
                  checked={formData.dietary_preferences?.includes('keto') || false}
                  onChange={handleChange}
                />
                <label htmlFor="keto">Кето</label>
              </div>
              
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="paleo"
                  name="dietary_preferences"
                  value="paleo"
                  checked={formData.dietary_preferences?.includes('paleo') || false}
                  onChange={handleChange}
                />
                <label htmlFor="paleo">Палео</label>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              Болдырмау
            </button>
            <button
              type="submit"
              className="update-profile-button"
              disabled={updateProfileMutation.isLoading}
            >
              {updateProfileMutation.isLoading ? <Loader size="small" /> : 'Профильді жаңарту'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal;