import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchMealPlans } from '../utils/api';

export const getMeals = createAsyncThunk(
  'meals/getMeals',
  async ({ userId, date }, { rejectWithValue }) => {
    try {
      const meals = await fetchMealPlans(userId, date);
      return meals;
    } catch (error) {
      return rejectWithValue(error.message || 'Тамақтануларды жүктеу сәтсіз аяқталды');
    }
  }
);

const initialState = {
  items: [],
  currentMeal: null,
  loading: false,
  error: null
};

const mealSlice = createSlice({
  name: 'meals',
  initialState,
  reducers: {
    setCurrentMeal: (state, action) => {
      state.currentMeal = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Тамақтануларды жүктеу
      .addCase(getMeals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMeals.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(getMeals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { setCurrentMeal } = mealSlice.actions;
export default mealSlice.reducer;