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

// Check if window is defined and get initial sidebar preference
const getInitialSidebarState = (): boolean => {
  if (typeof window !== 'undefined') {
    const savedState = localStorage.getItem('sidebarOpen');
    // Default to open if not saved, but close on small screens
    if (savedState !== null) {
      return savedState === 'true';
    }
    return window.innerWidth > 768;
  }
  return true; // Default for SSR
};

const initialState: UIState = {
  theme: 'system', // Default to system theme
  sidebarOpen: getInitialSidebarState(),
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
      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarOpen', state.sidebarOpen.toString());
      }
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarOpen', action.payload.toString());
      }
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