// src/store/middleware/websocketMiddleware.ts
import { Middleware } from 'redux';
import websocketService from '../../api/websocket.api';
import { getToken } from '../../utils/auth.utils';
import { addMessage, updateQueryStatus } from '../slices/chatSlice';
import { addProgressUpdate } from '../slices/querySlice';
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

// Define interfaces for our action types
interface WSConnectAction {
  type: typeof WS_CONNECT;
}

interface WSDisconnectAction {
  type: typeof WS_DISCONNECT;
}

interface WSSendMessageAction {
  type: typeof WS_SEND_MESSAGE;
  payload: {
    type: string;
    data: any;
  };
}

interface WSSendQueryAction {
  type: typeof WS_SEND_QUERY;
  payload: {
    task: string;
    dbId?: number;
  };
}

// Create a union type of all our WebSocket related actions
type WebSocketAction = 
  | WSConnectAction 
  | WSDisconnectAction 
  | WSSendMessageAction 
  | WSSendQueryAction;

// Helper function to check if an action is a WebSocket action
const isWebSocketAction = (action: any): action is WebSocketAction => {
  return [WS_CONNECT, WS_DISCONNECT, WS_SEND_MESSAGE, WS_SEND_QUERY].includes(action.type);
};

// Create middleware
const middleware: Middleware = ({ dispatch }) => 
  (next) => (action: any) => {
    if (!isWebSocketAction(action)) {
      return next(action);
    }

    // Since we've verified this is a WebSocket action, we can use type assertions
    switch (action.type) {
      case WS_CONNECT:
        // Connect to WebSocket with auth token
        const token = getToken();
        if (token) {
          websocketService.connect(token)
            .then((connected) => {
              if (connected) {
                dispatch({ type: 'ws/connected' });
              } else {
                dispatch({ type: 'ws/connectionFailed' });
              }
            });
        }
        break;
        
      case WS_DISCONNECT:
        websocketService.disconnect();
        dispatch({ type: 'ws/disconnected' });
        break;
        
      case WS_SEND_MESSAGE:
        const msgAction = action as WSSendMessageAction;
        websocketService.sendMessage(msgAction.payload.type, msgAction.payload.data);
        break;
        
      case WS_SEND_QUERY:
        const queryAction = action as WSSendQueryAction;
        // Update UI to show processing
        dispatch(updateQueryStatus({ 
          status: QueryStatus.PROCESSING, 
          message: 'Processing your query...' 
        }));
        
        // Add user message to chat
        dispatch(addMessage({
          id: Date.now().toString(),
          role: 'user',
          content: queryAction.payload.task,
          timestamp: new Date().toISOString()
        }));
        
        // Send query via WebSocket
        websocketService.sendNaturalLanguageQuery(
          queryAction.payload.task, 
          queryAction.payload.dbId
        );
        break;
    }
    
    // Pass all actions through the middleware chain
    return next(action);
  };

export default middleware;
