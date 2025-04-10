import React from 'react';
// Removed MainLayout import
import UserProfile from '../components/settings/UserProfile';
import Preferences from '../components/settings/Preferences';

const ProfilePage: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl">
      <UserProfile />
      <Preferences />
    </div>
  );
};

export default ProfilePage;