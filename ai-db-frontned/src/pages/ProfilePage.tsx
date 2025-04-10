// src/pages/ProfilePage.tsx
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  // Redirect to settings page with profile tab selected
  return <Navigate to="/settings/profile" replace />;
};

export default ProfilePage;