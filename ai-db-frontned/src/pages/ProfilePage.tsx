import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import UserProfile from '../components/settings/UserProfile';
import Preferences from '../components/settings/Preferences';

const ProfilePage: React.FC = () => {
  return (
    <MainLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl">
        <UserProfile />
        <Preferences />
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
