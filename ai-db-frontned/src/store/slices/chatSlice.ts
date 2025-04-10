// src/store/slices/chatSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import {
  ChatState,
  Message,
  ChatSession,
} from '../../types/chat.types';
import { QueryStatus } from '../../types/query.types';

const initialState: ChatState = {
  sessions: [],
  currentSessionId: null,
  messages: [],
  status: 'idle',
  error: null,
};

// Create a new chat session
export const createChatSession = createAsyncThunk(
  'chat/createChatSession',
  async (params: { title: string; sessionId: string } | string, { getState }) => {
    // Handle both string and object params
    const title = typeof params === 'string' ? params : params.title;
    const sessionId = typeof params === 'string' ? uuidv4() : params.sessionId;
    
    const session: ChatSession = {
      id: sessionId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    
    // Example of using getState to access current state
    const state = getState() as any;
    console.log(`Creating new chat session. Current session count: ${state.chat.sessions.length}`);
    
    return session;
  }
);

// Chat slice
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Set active chat session
    setCurrentSession: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload;
      const session = state.sessions.find(s => s.id === sessionId);
      
      if (session) {
        state.currentSessionId = sessionId;
        state.messages = session.messages;
      }
    },
    
    // Add a message to the chat
    addMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      
      // Check if this is an update to an existing streaming message
      if (message.isStreaming && message.role === 'assistant') {
        const existingMsgIndex = state.messages.findIndex(
          m => m.role === 'assistant' && m.isStreaming
        );
        
        if (existingMsgIndex !== -1) {
          // Update existing streaming message
          state.messages[existingMsgIndex] = message;
          
          // If we have a current session, update it too
          if (state.currentSessionId) {
            const sessionIndex = state.sessions.findIndex(s => s.id === state.currentSessionId);
            if (sessionIndex !== -1) {
              const msgIndex = state.sessions[sessionIndex].messages.findIndex(
                m => m.role === 'assistant' && m.isStreaming
              );
              
              if (msgIndex !== -1) {
                state.sessions[sessionIndex].messages[msgIndex] = message;
              } else {
                state.sessions[sessionIndex].messages.push(message);
              }
              
              state.sessions[sessionIndex].updatedAt = new Date().toISOString();
            }
          }
          return;
        }
      }
      
      // Normal case - add new message
      state.messages.push(message);
      
      // If we have a current session, update it too
      if (state.currentSessionId) {
        const sessionIndex = state.sessions.findIndex(s => s.id === state.currentSessionId);
        if (sessionIndex !== -1) {
          state.sessions[sessionIndex].messages.push(message);
          state.sessions[sessionIndex].updatedAt = new Date().toISOString();
          
          // If it's the first message, update the title based on content
          if (state.sessions[sessionIndex].messages.length === 1 && message.role === 'user') {
            // Truncate and clean the title if needed
            const title = message.content.length > 30 
              ? `${message.content.substring(0, 30)}...` 
              : message.content;
            state.sessions[sessionIndex].title = title;
          }
        }
      }
    },
    
    // Update query status
    updateQueryStatus: (state, action: PayloadAction<{ 
      status: QueryStatus; 
      message?: string 
    }>) => {
      if (action.payload.status === QueryStatus.PROCESSING) {
        state.status = 'loading';
      } else if (action.payload.status === QueryStatus.STREAMING) {
        state.status = 'streaming';
      } else if (action.payload.status === QueryStatus.COMPLETED) {
        state.status = 'success';
      } else if (action.payload.status === QueryStatus.FAILED) {
        state.status = 'error';
        state.error = action.payload.message || 'Query execution failed';
      }
    },
    
    // Clear all messages in current session
    clearMessages: (state) => {
      state.messages = [];
      
      if (state.currentSessionId) {
        const sessionIndex = state.sessions.findIndex(s => s.id === state.currentSessionId);
        if (sessionIndex !== -1) {
          state.sessions[sessionIndex].messages = [];
          state.sessions[sessionIndex].updatedAt = new Date().toISOString();
        }
      }
    },
    
    // Delete a chat session
    deleteSession: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload;
      state.sessions = state.sessions.filter(s => s.id !== sessionId);
      
      // If we're deleting the current session, switch to another one or clear messages
      if (state.currentSessionId === sessionId) {
        if (state.sessions.length > 0) {
          state.currentSessionId = state.sessions[0].id;
          state.messages = state.sessions[0].messages;
        } else {
          state.currentSessionId = null;
          state.messages = [];
        }
      }
    },
    
    // Update an existing message (e.g., for streaming)
    updateMessage: (state, action: PayloadAction<{ id: string; updates: Partial<Message> }>) => {
      const { id, updates } = action.payload;
      
      // Find and update the message in state.messages
      const messageIndex = state.messages.findIndex(m => m.id === id);
      if (messageIndex !== -1) {
        state.messages[messageIndex] = { ...state.messages[messageIndex], ...updates };
      }
      
      // Also update in the session if applicable
      if (state.currentSessionId) {
        const sessionIndex = state.sessions.findIndex(s => s.id === state.currentSessionId);
        if (sessionIndex !== -1) {
          const sessionMessageIndex = state.sessions[sessionIndex].messages.findIndex(m => m.id === id);
          if (sessionMessageIndex !== -1) {
            state.sessions[sessionIndex].messages[sessionMessageIndex] = {
              ...state.sessions[sessionIndex].messages[sessionMessageIndex],
              ...updates
            };
          }
        }
      }
    },
    
    // Finish streaming for a message
    finishStreamingMessage: (state, action: PayloadAction<string>) => {
      const messageId = action.payload;
      
      // Find streaming message by ID
      const messageIndex = state.messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1 && state.messages[messageIndex].isStreaming) {
        state.messages[messageIndex].isStreaming = false;
      }
      
      // Also update in the session
      if (state.currentSessionId) {
        const sessionIndex = state.sessions.findIndex(s => s.id === state.currentSessionId);
        if (sessionIndex !== -1) {
          const sessionMessageIndex = state.sessions[sessionIndex].messages.findIndex(m => m.id === messageId);
          if (sessionMessageIndex !== -1) {
            state.sessions[sessionIndex].messages[sessionMessageIndex].isStreaming = false;
          }
        }
      }
      
      // Update status to success
      state.status = 'success';
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create chat session
    builder.addCase(createChatSession.fulfilled, (state, action) => {
      state.sessions.unshift(action.payload); // Add to beginning
      state.currentSessionId = action.payload.id;
      state.messages = [];
    });
  },
});

export const {
  setCurrentSession,
  addMessage,
  updateMessage,
  updateQueryStatus,
  clearMessages,
  deleteSession,
  finishStreamingMessage,
  clearError,
} = chatSlice.actions;

export default chatSlice.reducer;