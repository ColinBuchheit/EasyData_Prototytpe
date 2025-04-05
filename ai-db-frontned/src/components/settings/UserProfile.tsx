import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

const UserProfile: React.FC = () => {
  const [profile, setProfile] = useState({
    username: 'greg',
    email: 'greg@example.com',
  });

  const handleChange = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = () => {
    console.log('Updating user profile:', profile);
    // TODO: Send to backend
  };

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-lg font-semibold text-zinc-100">User Profile</h2>

      <Input
        label="Username"
        value={profile.username}
        onChange={(e) => handleChange('username', e.target.value)}
      />
      <Input
        label="Email"
        type="email"
        value={profile.email}
        onChange={(e) => handleChange('email', e.target.value)}
      />

      <Button onClick={handleUpdate}>Update Profile</Button>
    </div>
  );
};

export default UserProfile;
