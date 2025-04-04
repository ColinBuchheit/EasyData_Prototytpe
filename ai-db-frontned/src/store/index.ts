// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import databaseReducer from './slices/databaseSlice';
import queryReducer from './slices/querySlice';
import chatReducer from './slices/chatSlice';
import uiReducer from './slices/uiSlice';
import websocketMiddleware from './middleware/websocketMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    database: databaseReducer,
    query: queryReducer,
    chat: chatReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['chat/setWebSocketStatus'],
        // Ignore these field paths in state
        ignoredPaths: ['chat.webSocketInstance'],
      },
    }).concat(websocketMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;