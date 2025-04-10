// src/components/settings/ProfileSettings.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { updateUserProfile, fetchUserProfile } from '../../store/slices/userSlice';
import Input from '../common/Input';
import Button from '../common/Button';
import { UserProfile } from '../../types/user.types';
import { Save, Upload, User as UserIcon } from 'lucide-react';
import { addToast } from '../../store/slices/uiSlice';

const ProfileSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profile, loading } = useAppSelector((state) => state.user);
  const { user } = useAppSelector((state) => state.auth);
  
  // Local state for form
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    firstName: '',
    lastName: '',
    displayName: '',
    bio: '',
    jobTitle: '',
    organization: '',
    location: '',
    contactEmail: '',
    socialLinks: {
      linkedIn: '',
      twitter: '',
      github: '',
      website: '',
    },
  });

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        jobTitle: profile.jobTitle || '',
        organization: profile.organization || '',
        location: profile.location || '',
        contactEmail: profile.contactEmail || user?.email || '',
        socialLinks: {
          linkedIn: profile.socialLinks?.linkedIn || '',
          twitter: profile.socialLinks?.twitter || '',
          github: profile.socialLinks?.github || '',
          website: profile.socialLinks?.website || '',
        },
      });
    } else {
      // Fetch user profile if not loaded
      dispatch(fetchUserProfile());
    }
  }, [profile, user, dispatch]);

  // Handle form input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle nested social links
    if (name.startsWith('social.')) {
      const socialPlatform = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [socialPlatform]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle profile picture upload
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    // Implement file upload logic here
    const file = e.target.files?.[0];
    if (file) {
      // Mock implementation - in a real app, you would upload to a server
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(updateUserProfile(formData)).unwrap();
      dispatch(addToast({
        type: 'success',
        message: 'Profile updated successfully',
      }));
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to update profile',
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Profile Settings</h2>
        <p className="text-zinc-400 mb-6">
          Update your personal information and how others see you in the application.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture */}
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
              {formData.avatar ? (
                <img 
                  src={formData.avatar} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <UserIcon className="w-12 h-12 text-zinc-600" />
              )}
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-sm font-medium text-zinc-200 mb-2">Profile Picture</h3>
            <p className="text-xs text-zinc-400 mb-3">
              Upload a picture to make your profile more personalized.
              PNG, JPG or GIF, max 2MB.
            </p>
            <div className="flex gap-3">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-200 rounded-md hover:bg-zinc-700 transition-colors text-sm">
                  <Upload className="w-4 h-4" />
                  Upload Image
                </span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
              {formData.avatar && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, avatar: undefined }))}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="John"
          />
          
          <Input
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Doe"
          />
          
          <Input
            label="Display Name"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            placeholder="JohnDoe123"
            hint="This is how you'll appear in the application"
          />
          
          <Input
            label="Contact Email"
            name="contactEmail"
            type="email"
            value={formData.contactEmail}
            onChange={handleChange}
            placeholder="john.doe@example.com"
          />
        </div>

        {/* Job/Organization Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Job Title"
            name="jobTitle"
            value={formData.jobTitle}
            onChange={handleChange}
            placeholder="Data Scientist"
          />
          
          <Input
            label="Organization"
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            placeholder="Acme Corp"
          />
          
          <Input
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="San Francisco, CA"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Bio
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us a bit about yourself..."
            rows={4}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Social Links */}
        <div>
          <h3 className="text-sm font-medium text-zinc-200 mb-3">Social Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="LinkedIn"
              name="social.linkedIn"
              value={formData.socialLinks?.linkedIn}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/username"
            />
            
            <Input
              label="Twitter"
              name="social.twitter"
              value={formData.socialLinks?.twitter}
              onChange={handleChange}
              placeholder="https://twitter.com/username"
            />
            
            <Input
              label="GitHub"
              name="social.github"
              value={formData.socialLinks?.github}
              onChange={handleChange}
              placeholder="https://github.com/username"
            />
            
            <Input
              label="Website"
              name="social.website"
              value={formData.socialLinks?.website}
              onChange={handleChange}
              placeholder="https://example.com"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            isLoading={loading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;