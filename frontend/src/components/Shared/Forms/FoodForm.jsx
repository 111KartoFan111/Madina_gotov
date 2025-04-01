import React, { useState } from 'react';
import Loader from '../UI/Loader';
import '../../../styles/Forms.css';

const FoodForm = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
    serving_size: '',
    category: 'other'
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Тамақ атауы қажет';
    }

    if (!formData.calories) {
      newErrors.calories = 'Калориялар қажет';
    } else if (isNaN(formData.calories) || formData.calories < 0) {
      newErrors.calories = 'Калориялар оң сан болуы керек';
    }

    if (!formData.protein) {
      newErrors.protein = 'Ақуыз мөлшері қажет';
    } else if (isNaN(formData.protein) || formData.protein < 0) {
      newErrors.protein = 'Ақуыз оң сан болуы керек';
    }

    if (!formData.carbs) {
      newErrors.carbs = 'Көмірсулар мөлшері қажет';
    } else if (isNaN(formData.carbs) || formData.carbs < 0) {
      newErrors.carbs = 'Көмірсулар оң сан болуы керек';
    }

    if (!formData.fat) {
      newErrors.fat = 'Май мөлшері қажет';
    } else if (isNaN(formData.fat) || formData.fat < 0) {
      newErrors.fat = 'Май оң сан болуы керек';
    }
    if (!formData.serving_size) {
      newErrors.serving_size = 'Порция мөлшері қажет';
    } else if (isNaN(formData.serving_size) || formData.serving_size < 0) {
      newErrors.serving_size = 'Порция мөлшері оң сан болуы керек';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validate()) {
      // Convert string values to numbers
      const numericFormData = {
        ...formData,
        calories: Number(formData.calories),
        protein: Number(formData.protein),
        carbs: Number(formData.carbs),
        fat: Number(formData.fat),
        fiber: formData.fiber ? Number(formData.fiber) : 0,
        sugar: formData.sugar ? Number(formData.sugar) : 0,
        serving_size: Number(formData.serving_size)
      };

      onSubmit(numericFormData);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Тамақ атауы</label>
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
        <label htmlFor="category">Санаты</label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
        >
          <option value="protein">Ақуыз</option>
          <option value="carbs">Көмірсулар</option>
          <option value="fat">Май</option>
          <option value="vegetable">Көкөніс</option>
          <option value="fruit">Жеміс</option>
          <option value="dairy">Сүт өнімдері</option>
          <option value="other">Басқа</option>
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="calories">Калориялар</label>
          <input
            type="number"
            id="calories"
            name="calories"
            value={formData.calories}
            onChange={handleChange}
            className={errors.calories ? 'input-error' : ''}
          />
          {errors.calories && <span className="error">{errors.calories}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="serving_size">Порция мөлшері (г)</label>
          <input
            type="number"
            id="serving_size"
            name="serving_size"
            value={formData.serving_size}
            onChange={handleChange}
            className={errors.serving_size ? 'input-error' : ''}
          />
          {errors.serving_size && <span className="error">{errors.serving_size}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="protein">Ақуыз (г)</label>
          <input
            type="number"
            id="protein"
            name="protein"
            value={formData.protein}
            onChange={handleChange}
            className={errors.protein ? 'input-error' : ''}
          />
          {errors.protein && <span className="error">{errors.protein}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="carbs">Көмірсулар (г)</label>
          <input
            type="number"
            id="carbs"
            name="carbs"
            value={formData.carbs}
            onChange={handleChange}
            className={errors.carbs ? 'input-error' : ''}
          />
          {errors.carbs && <span className="error">{errors.carbs}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="fat">Май (г)</label>
          <input
            type="number"
            id="fat"
            name="fat"
            value={formData.fat}
            onChange={handleChange}
            className={errors.fat ? 'input-error' : ''}
          />
          {errors.fat && <span className="error">{errors.fat}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="fiber">Талшық (г)</label>
          <input
            type="number"
            id="fiber"
            name="fiber"
            value={formData.fiber}
            onChange={handleChange}
            className={errors.fiber ? 'input-error' : ''}
          />
          {errors.fiber && <span className="error">{errors.fiber}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="sugar">Қант (г)</label>
          <input
            type="number"
            id="sugar"
            name="sugar"
            value={formData.sugar}
            onChange={handleChange}
            className={errors.sugar ? 'input-error' : ''}
          />
          {errors.sugar && <span className="error">{errors.sugar}</span>}
        </div>
      </div>

      <button
        type="submit"
        className="submit-button"
        disabled={isLoading}
      >
        {isLoading ? <Loader size="small" /> : 'Тамақты сақтау'}
      </button>
    </form>
  );
};

export default FoodForm;