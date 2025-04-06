// src/pages/PasswordResetPage.tsx
import React from 'react';
import PasswordResetForm from '../components/auth/PasswordResetForm';
import PasswordResetRequestForm from '../components/auth/PasswordResetRequestForm';

interface PasswordResetPageProps {
  isForgotPassword?: boolean;
}

const PasswordResetPage: React.FC<PasswordResetPageProps> = ({ isForgotPassword = false }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        {isForgotPassword ? (
          <PasswordResetRequestForm />
        ) : (
          <PasswordResetForm />
        )}
      </div>
    </div>
  );
};

export default PasswordResetPage;
