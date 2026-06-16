// src/pages/Dashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/dashboard.css';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      {/* Welcome Header with Scan Button */}
      <div className="dashboard-welcome">
        <div className="welcome-content">
          <h1 className="welcome-title">
            Welcome back, <span className="doctor-name">{user?.name || 'Dr. John Doe'}!</span> 🎉
          </h1>
          <p className="welcome-subtitle">Manage your patients and practice efficiently.</p>
        </div>
        <button className="btn-scan-small" onClick={() => navigate('/scanner')}>
          <span className="scan-icon">📷</span>
          Scan
        </button>
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <p>© 2026 Swasthya AI. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Dashboard;