import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import foodReducer from './foodSlice';
import mealReducer from './mealSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    foods: foodReducer,
    meals: mealReducer
  }
});

export default store;