import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import ChatContainer from '../components/chat/ChatContainer';

const ChatPage: React.FC = () => {
  return (
    <MainLayout>
      <ChatContainer />
    </MainLayout>
  );
};

export default ChatPage;
