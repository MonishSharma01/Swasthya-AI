// src/pages/Profile.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import '../styles/profile.css';

const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {user?.name?.[0] || 'D'}
          </div>
          <h1 className="profile-name">{user?.name || 'Doctor'}</h1>
          <p className="profile-role">{user?.role || 'Doctor'}</p>
          <span className="profile-status-badge">● Active</span>
        </div>

        <div className="profile-details">
          <div className="profile-detail-item">
            <span className="detail-label">Phone Number</span>
            <span className="detail-value">{user?.phoneNumber || 'Not provided'}</span>
          </div>
          <div className="profile-detail-item">
            <span className="detail-label">Email</span>
            <span className="detail-value">{user?.email || 'Not provided'}</span>
          </div>
          <div className="profile-detail-item">
            <span className="detail-label">Role</span>
            <span className="detail-value">{user?.role || 'Doctor'}</span>
          </div>
          <div className="profile-detail-item">
            <span className="detail-label">Member Since</span>
            <span className="detail-value">{new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;