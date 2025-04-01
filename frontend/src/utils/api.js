// utils/api.js
const API_URL = 'http://localhost:8000';

// Қателерді өңдеуге арналған көмекші функция
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || `Сервер қатесі: ${response.status}`;
    throw new Error(errorMessage);
  }
  return response.json();
};

// JSON сұраулары үшін авторизация тақырыптарын алуға арналған көмекші функция
const getAuthHeaders = (contentType = 'application/json') => {
  const token = localStorage.getItem('token');
  
  return {
    'Content-Type': contentType,
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Аутентификация API-лары
export const loginUser = async (credentials) => {
  // Тіркелгі деректерін form-urlencoded пішіміне түрлендіру
  const formData = new URLSearchParams();
  formData.append('username', credentials.email); // Электрондық поштаны пайдаланушы аты ретінде қолдану
  formData.append('password', credentials.password);

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Кіру сәтсіз аяқталды');
  }

  return await response.json();
};

export const registerUser = async (userData) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });

  return handleResponse(response);
};

export const logoutUser = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { success: true, message: 'Жүйеден шығу (токен жоқ)' };
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    // Сервер жауабына қарамастан локалды қойманы тазалау
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    if (response.ok) {
      return response.json().catch(() => ({ success: true, message: 'Жүйеден сәтті шықты' }));
    } else {
      console.log(`Жүйеден шығу сұранысы сәтсіз аяқталды, күй: ${response.status}`);
      // Локалды қойманы тазалағандықтан сәтті деп қайтару
      return { success: true, message: 'Жүйеден шықты (тек клиент жағында)' };
    }
  } catch (error) {
    console.error('Жүйеден шығу кезінде қате:', error);
    // Токенді тазалап, сәтті деп қайтару
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { success: true, message: 'Жүйеден шықты (тек клиент жағында)' };
  }
};

// Пайдаланушы профилі API-лары
export const getUserProfile = async () => {
  const response = await fetch(`${API_URL}/users/me`, {
    headers: getAuthHeaders()
  });

  return handleResponse(response);
};

export const updateUserProfile = async (userData) => {
  const response = await fetch(`${API_URL}/users/me`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });

  return handleResponse(response);
};

// Тамақтар API-лары
export const fetchFoods = async (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.search) queryParams.append('search', params.search);
  if (params.category) queryParams.append('category', params.category);
  if (params.skip) queryParams.append('skip', params.skip);
  if (params.limit) queryParams.append('limit', params.limit);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  const response = await fetch(`${API_URL}/foods${queryString}`, {
    headers: getAuthHeaders()
  });

  return handleResponse(response);
};

export const getFoodById = async (foodId) => {
  const response = await fetch(`${API_URL}/foods/${foodId}`, {
    headers: getAuthHeaders()
  });

  return handleResponse(response);
};

export const addFood = async (foodData) => {
  const response = await fetch(`${API_URL}/foods`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(foodData)
  });

  return handleResponse(response);
};

export const updateFood = async (foodId, foodData) => {
  const response = await fetch(`${API_URL}/foods/${foodId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(foodData)
  });

  return handleResponse(response);
};

export const deleteFood = async (foodId) => {
  const response = await fetch(`${API_URL}/foods/${foodId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  return handleResponse(response);
};

// Тамақтанулар API-лары
export const fetchMeals = async (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.date) queryParams.append('date', params.date);
  if (params.start_date) queryParams.append('start_date', params.start_date);
  if (params.end_date) queryParams.append('end_date', params.end_date);
  if (params.meal_type) queryParams.append('meal_type', params.meal_type);
  if (params.skip) queryParams.append('skip', params.skip);
  if (params.limit) queryParams.append('limit', params.limit);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  const response = await fetch(`${API_URL}/meals${queryString}`, {
    headers: getAuthHeaders()
  });

  return handleResponse(response);
};

export const getMealById = async (mealId) => {
  const response = await fetch(`${API_URL}/meals/${mealId}`, {
    headers: getAuthHeaders()
  });

  return handleResponse(response);
};

export const createMeal = async (mealData) => {
  const response = await fetch(`${API_URL}/meals`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(mealData)
  });

  return handleResponse(response);
};

export const updateMeal = async (mealId, mealData) => {
  const response = await fetch(`${API_URL}/meals/${mealId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(mealData)
  });

  return handleResponse(response);
};

export const deleteMeal = async (mealId) => {
  const response = await fetch(`${API_URL}/meals/${mealId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  return handleResponse(response);
};

// Тамақтану жоспарлары API-лары
export const fetchMealPlans = async (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.skip) queryParams.append('skip', params.skip);
  if (params.limit) queryParams.append('limit', params.limit);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  const response = await fetch(`${API_URL}/meal-plans${queryString}`, {
    headers: getAuthHeaders()
  });

  return handleResponse(response);
};

export const getMealPlanById = async (mealPlanId) => {
  const response = await fetch(`${API_URL}/meal-plans/${mealPlanId}`, {
    headers: getAuthHeaders()
  });

  return handleResponse(response);
};

export const createMealPlan = async (mealPlanData) => {
  console.log('Creating meal plan with data:', mealPlanData);

  const response = await fetch(`${API_URL}/meal-plans`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(mealPlanData)
  });

  console.log('Create meal plan response:', response);

  return handleResponse(response);
};


export const updateMealPlan = async (mealPlanId, mealPlanData) => {
  console.log('Updating meal plan with ID:', mealPlanId);
  console.log('Meal plan data:', mealPlanData);

  const response = await fetch(`${API_URL}/meal-plans/${mealPlanId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(mealPlanData)
  });

  console.log('Update meal plan response:', response);

  return handleResponse(response);
};

export const deleteMealPlan = async (mealPlanId) => {
  console.log('Deleting meal plan with ID:', mealPlanId);

  const response = await fetch(`${API_URL}/meal-plans/${mealPlanId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  console.log('Delete meal plan response:', response);

  return handleResponse(response);
};

// Басқару тақтасы API
export const fetchDashboardData = async () => {
  const response = await fetch(`${API_URL}/dashboard`, {
    headers: getAuthHeaders()
  });

  return handleResponse(response);
};