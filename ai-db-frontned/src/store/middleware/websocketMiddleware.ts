// src/store/middleware/websocketMiddleware.ts
import { Middleware } from 'redux';
import websocketService from '../../api/websocket.api';
import { getToken } from '../../utils/auth.utils';
import { RootState } from '../index';
import { addMessage, updateQueryStatus } from '../slices/chatSlice';
import { QueryStatus } from '../../types/query.types';

// Actions that require WebSocket
const WS_CONNECT = 'ws/connect';
const WS_DISCONNECT = 'ws/disconnect';
const WS_SEND_MESSAGE = 'ws/sendMessage';
const WS_SEND_QUERY = 'ws/sendQuery';

// Action creators
export const wsConnect = () => ({ type: WS_CONNECT });
export const wsDisconnect = () => ({ type: WS_DISCONNECT });
export const wsSendMessage = (message: any) => ({ 
  type: WS_SEND_MESSAGE, 
  payload: message 
});
export const wsSendQuery = (task: string, dbId?: number) => ({ 
  type: WS_SEND_QUERY, 
  payload: { task, dbId } 
});

const websocketMiddleware: Middleware<{}, RootState> = store => next => action => {
  switch (action.type) {
    case WS_CONNECT:
      // Connect to WebSocket with auth token
      const token = getToken();
      if (token) {
        websocketService.connect(token)
          .then((connected) => {
            if (connected) {
              store.dispatch({ type: 'ws/connected' });
            } else {
              store.dispatch({ type: 'ws/connectionFailed' });
            }
          });
      }
      break;
      
    // src/store/middleware/websocketMiddleware.ts (continued)
    case WS_DISCONNECT:
      websocketService.disconnect();
      store.dispatch({ type: 'ws/disconnected' });
      break;
      
    case WS_SEND_MESSAGE:
      websocketService.sendMessage(action.payload.type, action.payload.data);
      break;
      
    case WS_SEND_QUERY:
      // Update UI to show processing
      store.dispatch(updateQueryStatus({ 
        status: QueryStatus.PROCESSING, 
        message: 'Processing your query...' 
      }));
      
      // Add user message to chat
      store.dispatch(addMessage({
        id: Date.now().toString(),
        role: 'user',
        content: action.payload.task,
        timestamp: new Date().toISOString()
      }));
      
      // Send query via WebSocket
      websocketService.sendNaturalLanguageQuery(
        action.payload.task, 
        action.payload.dbId
      );
      break;
      
    default:
      // Not a WebSocket action, pass it through
      return next(action);
  }
  
  // Pass WebSocket actions through the middleware
  return next(action);
};

export default websocketMiddleware;