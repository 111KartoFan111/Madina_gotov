import React, { useState, useEffect } from 'react';
import Loader from '../UI/Loader';
import '../../../styles/Forms.css';

const MealForm = ({ foods, initialData, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    meal_type: 'breakfast',
    date: new Date().toISOString().split('T')[0], // Add today's date by default in YYYY-MM-DD format
    items: []
  });

  const [selectedFood, setSelectedFood] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [errors, setErrors] = useState({});

  // Set initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        meal_type: initialData.meal_type || 'breakfast',
        date: initialData.date || new Date().toISOString().split('T')[0],
        items: initialData.items || []
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('Food item added:', formData);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    console.log('Updated form data:', formData);
  };

  const handleFoodSelect = (e) => {
    setSelectedFood(e.target.value);
    // Clear error when user selects a food
    if (errors.selectedFood) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.selectedFood;
        return newErrors;
      });
    }
  };

  const handleQuantityChange = (e) => {
    const value = Number(e.target.value);
    setSelectedQuantity(value);
    // Clear error when user enters a valid quantity
    if (value > 0 && errors.selectedQuantity) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.selectedQuantity;
        return newErrors;
      });
    }
  };

  console.log('Selected food:', selectedFood);
  console.log('Selected quantity:', selectedQuantity);
  console.log('Form data:', formData);
  
  const addFoodItem = () => {
    const newErrors = {};
    
    if (!selectedFood) {
      newErrors.selectedFood = 'Тамақты таңдаңыз';
    }

    if (selectedQuantity <= 0) {
      newErrors.selectedQuantity = 'Мөлшері оң сан болуы керек';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({...prev, ...newErrors}));
      return;
    }

    const selectedFoodObj = foods.find(food => food.id === parseInt(selectedFood, 10));

    if (selectedFoodObj) {
      // Check if the food already exists in the list
      const existingItemIndex = formData.items.findIndex(item => item.food_id === selectedFoodObj.id);
      
      if (existingItemIndex !== -1) {
        // Update existing item quantity and nutrition values
        const updatedItems = [...formData.items];
        const item = updatedItems[existingItemIndex];
        const newQuantity = item.quantity + selectedQuantity;
        
        updatedItems[existingItemIndex] = {
          ...item,
          quantity: newQuantity,
          calories: Math.round(selectedFoodObj.calories * newQuantity / 100),
          protein: Math.round(selectedFoodObj.protein * newQuantity / 100 * 10) / 10,
          carbs: Math.round(selectedFoodObj.carbs * newQuantity / 100 * 10) / 10,
          fat: Math.round(selectedFoodObj.fat * newQuantity / 100 * 10) / 10
        };
        
        setFormData(prev => ({
          ...prev,
          items: updatedItems
        }));
      } else {
        // Add new item
        const newItem = {
          id: Date.now().toString(), // Temporary ID for frontend
          food_id: selectedFoodObj.id,
          food_name: selectedFoodObj.name,
          quantity: selectedQuantity,
          calories: Math.round(selectedFoodObj.calories * selectedQuantity / 100),
          protein: Math.round(selectedFoodObj.protein * selectedQuantity / 100 * 10) / 10,
          carbs: Math.round(selectedFoodObj.carbs * selectedQuantity / 100 * 10) / 10,
          fat: Math.round(selectedFoodObj.fat * selectedQuantity / 100 * 10) / 10
        };

        setFormData(prev => ({
          ...prev,
          items: [...prev.items, newItem]
        }));
      }

      setSelectedFood('');
      setSelectedQuantity(1);
    }
  };

  const removeFoodItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
    
    // Clear items error if present when removing last item
    if (errors.items && formData.items.length === 1) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.items;
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Тамақтану атауы қажет';
    }

    if (!formData.date) {
      newErrors.date = 'Күнді таңдау қажет';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Кем дегенде бір тамақ қосыңыз';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const totalNutrition = formData.items.reduce(
        (acc, item) => {
          acc.calories += item.calories;
          acc.protein += item.protein;
          acc.carbs += item.carbs;
          acc.fat += item.fat;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      const dataToSubmit = {
        ...formData,
        total_calories: totalNutrition.calories,
        total_protein: totalNutrition.protein,
        total_carbs: totalNutrition.carbs,
        total_fat: totalNutrition.fat,
        // Format time as "HH:MM" string
        time: new Date().toTimeString().split(' ')[0].slice(0, 5),
        // Pass items array as is
        items: formData.items
      };
      
      console.log('Sending data to server:', dataToSubmit);
      onSubmit(dataToSubmit);
    }
  };

  // Calculate totals
  const totals = formData.items.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Тамақтану атауы</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? 'input-error' : ''}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="meal_type">Тамақтану түрі</label>
        <select
          id="meal_type"
          name="meal_type"
          value={formData.meal_type}
          onChange={handleChange}
        >
          <option value="breakfast">Таңғы ас</option>
          <option value="lunch">Түскі ас</option>
          <option value="dinner">Кешкі ас</option>
          <option value="snack">Жеңіл тамақтану</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="date">Күні</label>
        <input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className={errors.date ? 'input-error' : ''}
        />
        {errors.date && <span className="error">{errors.date}</span>}
      </div>

      <div className="food-selection-container">
        <h3>Тамақ қосу</h3>

        <div className="food-selection">
          <div className="form-group">
            <label htmlFor="food">Тамақты таңдау</label>
            <select
              id="food"
              name="food"
              value={selectedFood}
              onChange={handleFoodSelect}
              className={errors.selectedFood ? 'input-error' : ''}
            >
              <option value="">Тамақты таңдаңыз...</option>
              {foods && foods.length > 0 ? (
                foods.map(food => (
                  <option key={food.id} value={food.id}>
                    {food.name} ({food.calories} кал / 100г)
                  </option>
                ))
              ) : (
                <option value="" disabled>Тамақтар жоқ</option>
              )}
            </select>
            {errors.selectedFood && <span className="error">{errors.selectedFood}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Мөлшері (г)</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={selectedQuantity}
              onChange={handleQuantityChange}
              min="1"
              className={errors.selectedQuantity ? 'input-error' : ''}
            />
            {errors.selectedQuantity && <span className="error">{errors.selectedQuantity}</span>}
          </div>

          <button
            type="button"
            className="add-food-button"
            onClick={addFoodItem}
          >
            Тамақ қосу
          </button>
        </div>
      </div>
      {errors.items && <span className="error center">{errors.items}</span>}
      <div className="meal-items-container">
        <h3>Тамақтану тізімі</h3>
        {formData.items.length > 0 ? (
          <div className="meal-items">
            <div className="meal-items-header">
              <span>Тамақ</span>
              <span>Мөлшері</span>
              <span>Калориялар</span>
              <span>Әрекет</span>
            </div>

            {formData.items.map(item => (
              <div key={item.id} className="meal-item">
                <span className="food-name">{item.food_name}</span>
                <span className="food-quantity">{item.quantity}г</span>
                <span className="food-calories">{item.calories} кал</span>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => removeFoodItem(item.id)}
                >
                  Жою
                </button>
              </div>
            ))}

            <div className="meal-totals">
              <span>Жалпы:</span>
              <span></span>
              <span>{totals.calories} кал</span>
              <span></span>
            </div>

            <div className="nutrition-summary">
              <div className="nutrition-item">
                <span>Ақуыз:</span>
                <span>{totals.protein.toFixed(1)}г</span>
              </div>
              <div className="nutrition-item">
                <span>Көмірсулар:</span>
                <span>{totals.carbs.toFixed(1)}г</span>
              </div>
              <div className="nutrition-item">
                <span>Май:</span>
                <span>{totals.fat.toFixed(1)}г</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-items">
            <p>Әлі тамақ қосылмаған</p>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="submit-button"
        disabled={isLoading}
      >
        {isLoading ? <Loader size="small" /> : (initialData ? 'Тамақтануды жаңарту' : 'Тамақтану жасау')}
      </button>
    </form>
  );
};

export default MealForm;