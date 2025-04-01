import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchFoods } from '../utils/api';

export const getFoods = createAsyncThunk(
  'foods/getFoods',
  async (userId, { rejectWithValue }) => {
    try {
      const foods = await fetchFoods(userId);
      return foods;
    } catch (error) {
      return rejectWithValue(error.message || 'Тамақтарды жүктеу сәтсіз аяқталды');
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null
};

const foodSlice = createSlice({
  name: 'foods',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Тамақтарды жүктеу
      .addCase(getFoods.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFoods.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(getFoods.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default foodSlice.reducer;