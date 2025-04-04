// src/store/slices/uiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserTheme } from '../../types/user.types';

interface UIState {
  theme: UserTheme;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelContent: 'schema' | 'connections' | 'history' | null;
  modalOpen: boolean;
  modalContent: string | null;
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
  }>;
}

const initialState: UIState = {
  theme: 'system', // Default to system theme
  sidebarOpen: true,
  rightPanelOpen: false,
  rightPanelContent: null,
  modalOpen: false,
  modalContent: null,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<UserTheme>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleRightPanel: (state, action: PayloadAction<'schema' | 'connections' | 'history' | null>) => {
      if (state.rightPanelContent === action.payload && state.rightPanelOpen) {
        // If clicking the same panel that's already open, close it
        state.rightPanelOpen = false;
        state.rightPanelContent = null;
      } else {
        // Open the panel with the requested content
        state.rightPanelOpen = true;
        state.rightPanelContent = action.payload;
      }
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.modalOpen = true;
      state.modalContent = action.payload;
    },
    closeModal: (state) => {
      state.modalOpen = false;
      state.modalContent = null;
    },
    addToast: (state, action: PayloadAction<{
      type: 'success' | 'error' | 'info' | 'warning';
      message: string;
      duration?: number;
    }>) => {
      const id = Date.now().toString();
      state.toasts.push({
        id,
        ...action.payload,
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
  },
});

export const {
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  toggleRightPanel,
  openModal,
  closeModal,
  addToast,
  removeToast,
} = uiSlice.actions;
export default uiSlice.reducer;