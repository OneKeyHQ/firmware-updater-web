import { configureStore } from '@reduxjs/toolkit';
import firmware from './reducers/firmware';
import runtime from './reducers/runtime';

export const store = configureStore({
  reducer: { runtime, firmware },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
