// src/components/common/UserProfileHeader.tsx
import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { getUserProfile } from '../../store/slices/authSlice';
import { Link } from 'react-router-dom';

const UserProfileHeader: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  const { profile, loading } = useAppSelector(state => state.user);

  // Fetch user profile data when component mounts
  useEffect(() => {
    if (isAuthenticated && user) {
      dispatch(getUserProfile());
    }
  }, [dispatch, isAuthenticated, user]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center space-x-2">
        <div className="text-sm text-red-500">Not logged in</div>
        <Link to="/login" className="px-3 py-1 text-sm bg-blue-600 rounded-md hover:bg-blue-700">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <div className="relative">
        <button className="flex items-center space-x-3 focus:outline-none" type="button">
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt="User avatar"
              className="w-8 h-8 rounded-full border border-zinc-700"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user.username.substring(0, 1).toUpperCase()}
              </span>
            </div>
          )}
          <div className="text-left">
            <div className="text-sm font-medium text-zinc-200">
              {profile?.displayName || user.username}
            </div>
            <div className="text-xs text-zinc-400">{user.email}</div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default UserProfileHeader;