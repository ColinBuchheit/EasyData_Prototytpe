// store/chat-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, Conversation, NaturalLanguageQueryRequest, ChatResponse } from '../lib/types/chat';
import { sendQuery, executeRawQuery } from '../lib/api/chat';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createConversation: (title?: string, dbId?: number) => string;
  setActiveConversation: (id: string) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // API Actions
  sendMessage: (message: string, dbId?: number) => Promise<void>;
  executeQuery: (query: string, dbId: number) => Promise<void>;
  
  // Selectors
  getActiveConversation: () => Conversation | null;
  getConversationById: (id: string) => Conversation | null;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isLoading: false,
      error: null,
      
      createConversation: (title = 'New Conversation', dbId) => {
        const id = uuidv4();
        const newConversation: Conversation = {
          id,
          title,
          dbId,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: id,
        }));
        
        return id;
      },
      
      setActiveConversation: (id) => {
        set({ activeConversationId: id });
      },
      
      addMessage: (message) => {
        const { activeConversationId, conversations } = get();
        
        if (!activeConversationId) return;
        
        const newMessage: ChatMessage = {
          id: uuidv4(),
          timestamp: new Date(),
          ...message,
        };
        
        set({
          conversations: conversations.map((conversation) => {
            if (conversation.id === activeConversationId) {
              return {
                ...conversation,
                messages: [...conversation.messages, newMessage],
                updatedAt: new Date(),
              };
            }
            return conversation;
          }),
        });
      },
      
      updateMessage: (id, updates) => {
        const { activeConversationId, conversations } = get();
        
        if (!activeConversationId) return;
        
        set({
          conversations: conversations.map((conversation) => {
            if (conversation.id === activeConversationId) {
              return {
                ...conversation,
                messages: conversation.messages.map((message) => {
                  if (message.id === id) {
                    return { ...message, ...updates };
                  }
                  return message;
                }),
                updatedAt: new Date(),
              };
            }
            return conversation;
          }),
        });
      },
      
      clearConversation: (id) => {
        set({
          conversations: get().conversations.map((conversation) => {
            if (conversation.id === id) {
              return {
                ...conversation,
                messages: [],
                updatedAt: new Date(),
              };
            }
            return conversation;
          }),
        });
      },
      
      deleteConversation: (id) => {
        const { activeConversationId, conversations } = get();
        
        set({
          conversations: conversations.filter((c) => c.id !== id),
          // If deleting the active conversation, set active to the next one or null
          activeConversationId:
            activeConversationId === id
              ? conversations.length > 1
                ? conversations.find((c) => c.id !== id)?.id ?? null
                : null
              : activeConversationId,
        });
      },
      
      setLoading: (isLoading) => {
        set({ isLoading });
      },
      
      setError: (error) => {
        set({ error });
      },
      
      sendMessage: async (message, dbId) => {
        const { addMessage, setLoading, setError, getActiveConversation } = get();
        
        const activeConversation = getActiveConversation();
        if (!activeConversation) return;
        
        // Add user message
        const userMessageId = uuidv4();
        addMessage({
          id: userMessageId,
          role: 'user',
          content: message,
        });
        
        // Add loading message for assistant
        const assistantMessageId = uuidv4();
        addMessage({
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          isLoading: true,
        });
        
        setLoading(true);
        setError(null);
        
        try {
          // Prepare the request
          const request: NaturalLanguageQueryRequest = {
            task: message,
            visualize: true,
          };
          
          // Use the specified dbId, or the conversation's dbId if available
          if (dbId) {
            request.dbId = dbId;
          } else if (activeConversation.dbId) {
            request.dbId = activeConversation.dbId;
          }
          
          // Send the query to the backend
          const response = await sendQuery(request);
          
          if (response.success) {
            // If context was switched to a new database, update the conversation
            if (response.contextSwitched && response.dbId) {
              set({
                conversations: get().conversations.map((c) => {
                  if (c.id === activeConversation.id) {
                    return { ...c, dbId: response.dbId };
                  }
                  return c;
                }),
              });
            }
            
            // Update the assistant message with the response
            get().updateMessage(assistantMessageId, {
              content: response.explanation || response.message || '',
              query: response.query,
              results: response.results,
              visualizationCode: response.visualizationCode,
              executionTimeMs: response.executionTimeMs,
              rowCount: response.rowCount,
              dbId: response.dbId,
              isLoading: false,
            });
          } else {
            // Handle error response
            get().updateMessage(assistantMessageId, {
              role: 'error',
              content: response.error || 'Failed to process your request.',
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Failed to send message:', error);
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          
          get().updateMessage(assistantMessageId, {
            role: 'error',
            content: `Error: ${errorMessage}`,
            isLoading: false,
          });
          
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      },
      
      executeQuery: async (query, dbId) => {
        const { addMessage, setLoading, setError } = get();
        
        // Add user message with the query
        addMessage({
          role: 'user',
          content: `SQL Query: ${query}`,
          query,
        });
        
        // Add loading message for results
        const resultMessageId = uuidv4();
        addMessage({
          id: resultMessageId,
          role: 'assistant',
          content: 'Executing query...',
          query,
          isLoading: true,
        });
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await executeRawQuery(dbId, query);
          
          if (response.success) {
            get().updateMessage(resultMessageId, {
              content: 'Query executed successfully.',
              query,
              results: response.rows || response.result,
              executionTimeMs: response.executionTimeMs,
              rowCount: response.rowCount,
              dbId,
              isLoading: false,
            });
          } else {
            get().updateMessage(resultMessageId, {
              role: 'error',
              content: response.error || 'Failed to execute query.',
              query,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Failed to execute query:', error);
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          
          get().updateMessage(resultMessageId, {
            role: 'error',
            content: `Error executing query: ${errorMessage}`,
            query,
            isLoading: false,
          });
          
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      },
      
      // Selectors
      getActiveConversation: () => {
        const { activeConversationId, conversations } = get();
        return activeConversationId
          ? conversations.find((c) => c.id === activeConversationId) || null
          : null;
      },
      
      getConversationById: (id) => {
        return get().conversations.find((c) => c.id === id) || null;
      },
    }),
    {
      name: 'maiquery-chats',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);