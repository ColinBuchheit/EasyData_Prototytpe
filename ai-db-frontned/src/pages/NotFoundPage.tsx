import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404 – Page Not Found</h1>
        <p className="text-zinc-400">Sorry, we couldn't find what you were looking for.</p>
        <Link to="/" className="text-blue-500 hover:underline">
          Go back home →
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
