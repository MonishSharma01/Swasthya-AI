// src/components/common/Layout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/layout.css';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/medicine', label: 'Medicine' },
    { path: '/appointments', label: 'Appointments' },
    { path: '/profile', label: 'Profile' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const DashboardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );

  const MedicineIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const AppointmentsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );

  const ProfileIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const getNavIcon = (label: string) => {
    switch(label) {
      case 'Dashboard': return <DashboardIcon />;
      case 'Medicine': return <MedicineIcon />;
      case 'Appointments': return <AppointmentsIcon />;
      case 'Profile': return <ProfileIcon />;
      default: return null;
    }
  };

  return (
    <div className="layout-container">
      <nav className={`top-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo" onClick={() => navigate('/dashboard')}>
            <div className="logo-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="logo-text-wrapper">
              <span className="logo-text">Swasthya</span>
              <span className="logo-subtext">AI</span>
            </div>
          </div>

          <div className="nav-links">
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="nav-icon">{getNavIcon(item.label)}</span>
                <span className="nav-label">{item.label}</span>
                {location.pathname === item.path && <span className="nav-indicator" />}
              </button>
            ))}
          </div>

          <div className="nav-profile">
            <button 
              className="profile-btn"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="profile-avatar">
                {user?.name?.[0] || 'D'}
                <span className="profile-status" />
              </div>
              <div className="profile-info">
                <span className="profile-name">{user?.name || 'Doctor'}</span>
                <span className="profile-role">Online</span>
              </div>
              <span className={`profile-arrow ${showProfileDropdown ? 'open' : ''}`}>▾</span>
            </button>

            {showProfileDropdown && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">
                    {user?.name?.[0] || 'D'}
                  </div>
                  <div className="dropdown-info">
                    <span className="dropdown-name">{user?.name || 'Doctor'}</span>
                    <span className="dropdown-email">{user?.phoneNumber || 'doctor@swasthya.com'}</span>
                    <span className="dropdown-status">● Online</span>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item" onClick={() => navigate('/profile')}>
                  <span className="dropdown-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <div className="dropdown-item-content">
                    <span>Profile</span>
                    <span className="dropdown-item-sub">View your profile</span>
                  </div>
                </button>
                <button className="dropdown-item" onClick={() => navigate('/settings')}>
                  <span className="dropdown-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v4" />
                      <path d="M12 19v4" />
                      <path d="M4.22 4.22l2.83 2.83" />
                      <path d="M16.95 16.95l2.83 2.83" />
                      <path d="M1 12h4" />
                      <path d="M19 12h4" />
                      <path d="M4.22 19.78l2.83-2.83" />
                      <path d="M16.95 7.05l2.83-2.83" />
                    </svg>
                  </span>
                  <div className="dropdown-item-content">
                    <span>Settings</span>
                    <span className="dropdown-item-sub">Manage preferences</span>
                  </div>
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout" onClick={handleLogout}>
                  <span className="dropdown-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </span>
                  <div className="dropdown-item-content">
                    <span>Logout</span>
                    <span className="dropdown-item-sub">Sign out of your account</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;