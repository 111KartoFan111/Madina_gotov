import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Card from '../Shared/UI/Card';
import Modal from '../Shared/UI/Modal';
import Loader from '../Shared/UI/Loader';
import FoodForm from '../Shared/Forms/FoodForm';
import { fetchFoods, addFood, deleteFood } from '../../utils/api';
import '../../styles/FoodTracker.css';

const FoodTracker = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { user } = useSelector(state => state.auth);
  const queryClient = useQueryClient();

  // Тағамдарды алу
  const { data: foods, isLoading, error } = useQuery({
    queryKey: ['foods', user?.id],
    queryFn: () => fetchFoods(user?.id),
    enabled: !!user?.id
  });

  // Тағам қосу мутациясы
  const addFoodMutation = useMutation({
    mutationFn: addFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods', user?.id] });
      setShowAddModal(false);
    }
  });
  
  // Тағам жою мутациясы
  const deleteFoodMutation = useMutation({
    mutationFn: deleteFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods', user?.id] });
    }
  });

  // Тағам қосуды өңдеу
  const handleAddFood = (foodData) => {
    addFoodMutation.mutate({ ...foodData, user_id: user?.id });
  };

  // Тағам жоюды өңдеу
  const handleDeleteFood = (foodId) => {
    if (window.confirm('Сіз бұл тағамды жоюға сенімдісіз бе?')) {
      deleteFoodMutation.mutate(foodId);
    }
  };

  // Тағамдарды сүзгілеу және іздеу
  const filteredFoods = foods ? foods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || food.category === filterType;
    return matchesSearch && matchesFilter;
  }) : [];

  if (isLoading) return <div className="loading-container"><Loader /></div>;

  if (error) return (
    <div className="error-container">
      <h3>Тағам деректерін жүктеу кезінде қате шықты</h3>
      <p>{error.message}</p>
    </div>
  );

  return (
    <div className="food-tracker">
      <div className="page-header">
        <h1>Тағам бақылаушы</h1>
        <button
          className="add-button"
          onClick={() => setShowAddModal(true)}
        >
          Жаңа тағам қосу
        </button>
      </div>
      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Тағамдарды іздеу..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-options">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Барлық санаттар</option>
            <option value="protein">Ақуыздар</option>
            <option value="carbs">Көмірсулар</option>
            <option value="fat">Майлар</option>
            <option value="vegetable">Көкөністер</option>
            <option value="fruit">Жемістер</option>
            <option value="dairy">Сүт өнімдері</option>
            <option value="other">Басқалар</option>
          </select>
        </div>
      </div>
      <div className="foods-grid">
        {filteredFoods.length > 0 ? (
          filteredFoods.map(food => (
            <Card key={food.id} className="food-card">
              <div className="food-card-content">
                <h3>{food.name}</h3>
                <div className="nutrition-info">
                  <div className="nutrition-item">
                    <span className="label">Калориялар:</span>
                    <span className="value">{food.calories}</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="label">Ақуыз:</span>
                    <span className="value">{food.protein}г</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="label">Көмірсулар:</span>
                    <span className="value">{food.carbs}г</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="label">Майлар:</span>
                    <span className="value">{food.fat}г</span>
                  </div>
                </div>
                <div className="food-serving">
                  <span>Порция мөлшері: {food.serving_size}г</span>
                </div>
                <div className="food-actions">
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteFood(food.id)}
                  >
                    Жою
                  </button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="no-foods">
            <p>Тағамдар табылмады. Бақылаушыға біраз тағам қосыңыз!</p>
          </div>
        )}
      </div>
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <h2>Жаңа тағам қосу</h2>
          <FoodForm
            onSubmit={handleAddFood}
            isLoading={addFoodMutation.isLoading}
          />
        </Modal>
      )}
    </div>
  );
};

export default FoodTracker;