import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import Card from '../Shared/UI/Card';
import Loader from '../Shared/UI/Loader';
import { getUserProfile } from '../../utils/api.js';
import { setUser } from '../../store/authSlice';
import '../../styles/Profile.css';
import ProfileEditModal from '../Shared/Forms/ProfileEditModal';

const Profile = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Get user profile
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => getUserProfile(),
    enabled: !!user?.id
  });
  
  // Обработчик успешного обновления профиля
  const handleProfileUpdate = (updatedProfile) => {
    // Обновляем пользователя в Redux store
    dispatch(setUser(updatedProfile));
    // Показываем сообщение об успехе
    setSuccessMessage('Профиль сәтті жаңартылды!');
    // Скрываем сообщение через 3 секунды
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
    // Обновляем данные профиля
    refetch();
  };
  
  const openModal = () => {
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  if (isLoading) return <div className="loading-container"><Loader /></div>;
  
  if (error) return (
    <div className="error-container">
      <h3>Профиль деректерін жүктеу кезінде қате шықты</h3>
      <p>{error.message}</p>
    </div>
  );

  // Перевод для полей активности
  const activityLevelMap = {
    'sedentary': 'Отырықшы (жаттығу жоқ немесе өте аз)',
    'light': 'Жеңіл (аптасына 1-3 күн жаттығу)',
    'moderate': 'Орташа (аптасына 3-5 күн жаттығу)',
    'active': 'Белсенді (аптасына 6-7 күн жаттығу)',
    'very_active': 'Өте белсенді (күнделікті қарқынды жаттығу)'
  };

  // Перевод для полей цели
  const goalMap = {
    'lose': 'Салмақ жоғалту',
    'maintain': 'Салмақты сақтау',
    'gain': 'Салмақ қосу',
    'build_muscle': 'Бұлшықет құру'
  };

  // Перевод для полей предпочтений в питании
  const dietaryPreferencesMap = {
    'vegetarian': 'Вегетариандық',
    'vegan': 'Веган',
    'gluten_free': 'Глютенсіз',
    'dairy_free': 'Сүт өнімдерінсіз',
    'keto': 'Кето',
    'paleo': 'Палео'
  };

  // Перевод для полей пола
  const genderMap = {
    'male': 'Ер',
    'female': 'Әйел',
    'other': 'Басқа',
    '': 'Не указано'
  };

  return (
    <div className="profile">
      <h1>Пайдаланушы профилі</h1>
      
      {successMessage && (
        <div className="success-message global">{successMessage}</div>
      )}
      
      {/* Структурированное отображение данных профиля */}
      <div className="profile-data">
        <Card className="profile-card">
          <div className="profile-header">
            <h2>Профиль деректері</h2>
            <button className="edit-button" onClick={openModal}>
              Өңдеу
            </button>
          </div>
          <div className="profile-data-table">
            <table>
              <tbody>
                <tr>
                  <th>ID:</th>
                  <td>{profile?.id}</td>
                </tr>
                <tr>
                  <th>Толық аты-жөні:</th>
                  <td>{profile?.full_name}</td>
                </tr>
                <tr>
                  <th>Электрондық пошта:</th>
                  <td>{profile?.email}</td>
                </tr>
                <tr>
                  <th>Жынысы:</th>
                  <td>{genderMap[profile?.gender] || 'Не указано'}</td>
                </tr>
                <tr>
                  <th>Жасы:</th>
                  <td>{profile?.age || 'Не указано'}</td>
                </tr>
                <tr>
                  <th>Салмағы (кг):</th>
                  <td>{profile?.weight || 'Не указано'}</td>
                </tr>
                <tr>
                  <th>Бойы (см):</th>
                  <td>{profile?.height || 'Не указано'}</td>
                </tr>
                <tr>
                  <th>Белсенділік деңгейі:</th>
                  <td>{activityLevelMap[profile?.activity_level] || profile?.activity_level}</td>
                </tr>
                <tr>
                  <th>Фитнес мақсаты:</th>
                  <td>{goalMap[profile?.goal] || profile?.goal}</td>
                </tr>
                <tr>
                  <th>Тамақтану артықшылықтары:</th>
                  <td>
                    {profile?.dietary_preferences?.length > 0 
                      ? profile.dietary_preferences.map(pref => dietaryPreferencesMap[pref] || pref).join(', ')
                      : 'Не указано'
                    }
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      
      {/* Модальное окно редактирования профиля */}
      <ProfileEditModal 
        profile={profile} 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        onSuccess={handleProfileUpdate} 
      />
    </div>
  );
};

export default Profile;