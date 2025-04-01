import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Card from '../Shared/UI/Card';
import Modal from '../Shared/UI/Modal';
import Loader from '../Shared/UI/Loader';
import MealForm from '../Shared/Forms/MealForm';
import {
  fetchMealPlans,
  fetchFoods,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan
} from '../../utils/api';
import '../../styles/FoodTracker.css';

const MealPlanner = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingMeal, setEditingMeal] = useState(null);
  const { user } = useSelector(state => state.auth);
  const queryClient = useQueryClient();
  
  // Күнді API үшін форматтау
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  // Тамақтану жоспарларын алу
  const { data: mealPlans, isLoading: isLoadingMeals, error: mealsError } = useQuery({
    queryKey: ['mealPlans', user?.id, formatDate(selectedDate)],
    queryFn: () => fetchMealPlans(user?.id, formatDate(selectedDate)),
    enabled: !!user?.id,
  });
  
  // Тамақтар тізімін алу
  const { data: foods, isLoading: isLoadingFoods } = useQuery({
    queryKey: ['foods', user?.id],
    queryFn: () => fetchFoods(user?.id),
    enabled: !!user?.id,
  });
  
  // Тамақтану жоспарын құру мутациясы
  const createMealMutation = useMutation({
    mutationFn: createMealPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans', user?.id, formatDate(selectedDate)] });
      setShowAddModal(false);
    },
    onError: (error) => {
      console.error('Ошибка при создании приема пищи:', error);
      // Дополнительная обработка ошибки, например, отображение сообщения пользователю
    }
  });
  
  // Тамақтану жоспарын жаңарту мутациясы
  const updateMealMutation = useMutation({
    mutationFn: updateMealPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans', user?.id, formatDate(selectedDate)] });
      setShowAddModal(false);
      setEditingMeal(null);
    }
  });
  
  // Тамақтану жоспарын жою мутациясы
  const deleteMealMutation = useMutation({
    mutationFn: deleteMealPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans', user?.id, formatDate(selectedDate)] });
    }
  });
  
  // Тамақ формасының жіберілуін өңдеу
  const handleMealSubmit = (mealData) => {
    const mealWithDate = {
      ...mealData,
      date: formatDate(selectedDate),
      user_id: user?.id
    };
    
    if (editingMeal) {
      // Pass id separately and spread the rest of the data
      updateMealMutation.mutate({ id: editingMeal.id, ...mealWithDate });
    } else {
      createMealMutation.mutate(mealWithDate);
    }
  };
  // Тамақты жоюды өңдеу
  const handleDeleteMeal = (mealId) => {
    if (window.confirm('Сіз бұл тамақты жоюға сенімдісіз бе?')) {
      deleteMealMutation.mutate(mealId);
    }
  };
  
  // Өңдеу модалын ашу
  // Тамақтарды түрі бойынша топтау
  const getMealsByType = (type) => {
    return mealPlans ? mealPlans.filter(meal => meal.meal_type === type) : [];
  };
  
  // Таңдалған күнді өзгерту
  const changeDate = (daysToAdd) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + daysToAdd);
    setSelectedDate(newDate);
  };
  
  const isLoading = isLoadingMeals || isLoadingFoods;
  
  if (isLoading) return <div className="loading-container"><Loader /></div>;
  
  if (mealsError) return (
    <div className="error-container">
      <h3>Тамақтану деректерін жүктеу кезінде қате шықты</h3>
      <p>{mealsError.message}</p>
    </div>
  );

  return (
    <div className="meal-planner">
      <div className="page-header">
        <h1>Тамақтану жоспарлаушы</h1>
        <button 
          className="add-button" 
          onClick={() => {
            setEditingMeal(null);
            setShowAddModal(true);
          }}
        >
          Жаңа тамақ қосу
        </button>
      </div>
      
      <div className="date-selector">
        <button className="date-nav" onClick={() => changeDate(-1)}>
          &lt;
        </button>
        <h2>{selectedDate.toLocaleDateString('kk-KZ', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
        <button className="date-nav" onClick={() => changeDate(1)}>
          &gt;
        </button>
      </div>
      
      <div className="meal-sections">
        <Card className="meal-section">
          <h3>Таңғы ас</h3>
          {getMealsByType('breakfast').length > 0 ? (
            <div className="meals-list">
              {getMealsByType('breakfast').map(meal => (
                <div key={meal.id} className="meal-item">
                  <div className="meal-details">
                    <h4>{meal.name}</h4>
                    <div className="meal-nutritions">
                      <span>{meal.total_calories} калория</span>
                      <span>{meal.total_protein}г ақуыз</span>
                    </div>
                  </div>
                  <div className="meal-actions">
                    <button className="delete-button" onClick={() => handleDeleteMeal(meal.id)}>Жою</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-meals">
              <p>Таңғы ас жоспарланбаған</p>
            </div>
          )}
        </Card>
        
        <Card className="meal-section">
          <h3>Түскі ас</h3>
          {getMealsByType('lunch').length > 0 ? (
            <div className="meals-list">
              {getMealsByType('lunch').map(meal => (
                <div key={meal.id} className="meal-item">
                  <div className="meal-details">
                    <h4>{meal.name}</h4>
                    <div className="meal-nutritions">
                      <span>{meal.total_calories} калория</span>
                      <span>{meal.total_protein}г ақуыз</span>
                    </div>
                  </div>
                  <div className="meal-actions">
                    <button className="delete-button" onClick={() => handleDeleteMeal(meal.id)}>Жою</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-meals">
              <p>Түскі ас жоспарланбаған</p>
            </div>
          )}
        </Card>
        
        <Card className="meal-section">
          <h3>Кешкі ас</h3>
          {getMealsByType('dinner').length > 0 ? (
            <div className="meals-list">
              {getMealsByType('dinner').map(meal => (
                <div key={meal.id} className="meal-item">
                  <div className="meal-details">
                    <h4>{meal.name}</h4>
                    <div className="meal-nutritions">
                      <span>{meal.total_calories} калория</span>
                      <span>{meal.total_protein}г ақуыз</span>
                    </div>
                  </div>
                  <div className="meal-actions">
                    <button className="delete-button" onClick={() => handleDeleteMeal(meal.id)}>Жою</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-meals">
              <p>Кешкі ас жоспарланбаған</p>
            </div>
          )}
        </Card>
        
        <Card className="meal-section">
          <h3>Тіскебасарлар</h3>
          {getMealsByType('snack').length > 0 ? (
            <div className="meals-list">
              {getMealsByType('snack').map(meal => (
                <div key={meal.id} className="meal-item">
                  <div className="meal-details">
                    <h4>{meal.name}</h4>
                    <div className="meal-nutritions">
                      <span>{meal.total_calories} калория</span>
                      <span>{meal.total_protein}г ақуыз</span>
                    </div>
                  </div>
                  <div className="meal-actions">
                    <button className="delete-button" onClick={() => handleDeleteMeal(meal.id)}>Жою</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-meals">
              <p>Тіскебасарлар жоспарланбаған</p>
            </div>
          )}
        </Card>
      </div>
      
      {showAddModal && (
        <Modal onClose={() => {
          setShowAddModal(false);
          setEditingMeal(null);
        }}>
          <h2>{editingMeal ? 'Тамақты өңдеу' : 'Жаңа тамақ қосу'}</h2>
          <MealForm 
            foods={foods || []}
            initialData={editingMeal}
            onSubmit={handleMealSubmit} 
            isLoading={createMealMutation.isLoading || updateMealMutation.isLoading}
          />
        </Modal>
      )}
    </div>
  );
};

export default MealPlanner;