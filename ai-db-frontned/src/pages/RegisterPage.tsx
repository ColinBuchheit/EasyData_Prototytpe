import React from 'react';
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100 px-4">
      <div className="max-w-md w-full space-y-6 p-6 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center">Create an Account</h1>
        <RegisterForm />
      </div>
    </div>
  );
};

export default RegisterPage;
