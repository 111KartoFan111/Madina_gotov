import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Card from '../Shared/UI/Card';
import Loader from '../Shared/UI/Loader';
import { fetchDashboardData } from '../../utils/api';
import '../../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useSelector(state => state.auth);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData', user?.id],
    queryFn: () => fetchDashboardData(user?.id),
    enabled: !!user?.id,
    staleTime: 300000, // 5 минут
  });

  if (isLoading) return <div className="loading-container"><Loader /></div>;

  if (error) return (
    <div className="error-container">
      <h3>Басқару тақтасы деректерін жүктеу кезінде қате шықты</h3>
      <p>{error.message}</p>
    </div>
  );

  // Используем деструктуризацию с дефолтными значениями
  const { 
    todayStats = { calories: 0, protein: 0, carbs: 0, fat: 0 }, 
    weeklyProgress = [], 
    recentMeals = [] 
  } = data || {};

  return (
    <div className="dashboard">
      <h1>Басқару тақтасы</h1>
      <div className="welcome-message">
        <h2>Қайта келуіңізбен, {user?.full_name || 'Пайдаланушы'}!</h2>
        <p>Міне, сіздің тамақтану қорытындыңыз</p>
      </div>
      <div className="stats-container">
        <Card className="stat-card">
          <h3>Бүгінгі статистика</h3>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Калориялар</span>
              <span className="stat-value">{todayStats?.calories ?? 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Ақуыз</span>
              <span className="stat-value">{todayStats?.protein ?? 0}г</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Көмірсулар</span>
              <span className="stat-value">{todayStats?.carbs ?? 0}г</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Майлар</span>
              <span className="stat-value">{todayStats?.fat ?? 0}г</span>
            </div>
          </div>
        </Card>
      </div>
      <div className="dashboard-grid">
        <Card className="recent-meals">
          <h3>Соңғы тамақтар</h3>
          {recentMeals?.length > 0 ? (
            <ul className="meals-list">
              {recentMeals.map(meal => (
                <li key={meal.id} className="meal-item">
                  <div className="meal-header">
                    <h4>{meal.name}</h4>
                    <span className="meal-type">{meal.meal_type}</span>
                  </div>
                  <p className="meal-time">{new Date(meal.date).toLocaleDateString()} - {meal.time}</p>
                  <div className="meal-stats">
                    <span>{meal.calories} кал</span>
                    <span>{meal.protein}г ақуыз</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">Жақында тамақтар жазылмаған</p>
          )}
        </Card>
        <Card className="weekly-progress">
          <h3>Апталық прогресс</h3>
          <div className="progress-chart">
            {/* Мұнда диаграмма болар еді - плейсхолдер қолданамыз */}
            <div className="chart-placeholder">
              <div className="placeholder-bars">
                {weeklyProgress?.map((day, index) => (
                  <div
                    key={index}
                    className="placeholder-bar"
                    style={{ height: `${(day?.percentage || 0) * 100}%` }}
                  >
                    <span className="bar-label">{day?.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;