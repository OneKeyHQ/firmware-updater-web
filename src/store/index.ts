import { configureStore } from '@reduxjs/toolkit';
import device from './reducers/device';
import runtime from './reducers/runtime';

export const store = configureStore({
  reducer: { device, runtime },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
