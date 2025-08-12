import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';
import './Lists.css';

const UserProfile = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    bio: user.bio || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await usersAPI.updateProfile(formData);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Update user in auth context
      const updatedUser = { ...user, ...formData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      bio: user.bio || ''
    });
    setIsEditing(false);
    setError('');
  };

  return (
    <div className="list-page">
      {/* Header */}
      <header className="list-header">
        <div className="header-content">
          <div className="header-left">
            {onClose ? (
              <button onClick={onClose} className="back-btn">
                ← Back
              </button>
            ) : (
              <button onClick={() => navigate('/dashboard')} className="back-btn">
                ← Back
              </button>
            )}
            <h1>My Profile</h1>
          </div>
          
          {!onClose && (
            <nav className="header-nav">
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/friends" className="nav-link">Friends</Link>
              <Link to="/groups" className="nav-link">Groups</Link>
              <Link to="/profile" className="nav-link active">Profile</Link>
            </nav>
          )}
        </div>
      </header>

      <main className="list-main">
        <div className="profile-content">
        <div className="profile-avatar-section">
          <div className="profile-avatar large">
            {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
          </div>
          <div className="profile-basic-info">
            <h3>{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}</h3>
            <p>@{user.username}</p>
            <p className="email">{user.email}</p>
          </div>
        </div>

        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="profile-form-section">
          {!isEditing ? (
            <div className="profile-display">
              <div className="profile-field">
                <label>First Name</label>
                <p>{user.firstName || 'Not set'}</p>
              </div>
              <div className="profile-field">
                <label>Last Name</label>
                <p>{user.lastName || 'Not set'}</p>
              </div>
              <div className="profile-field">
                <label>Bio</label>
                <p>{user.bio || 'No bio yet'}</p>
              </div>
              <div className="profile-field">
                <label>Member Since</label>
                <p>{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              <button 
                className="edit-btn"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="profile-edit-form">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter your first name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter your last name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself"
                  rows="3"
                />
              </div>

              <div className="form-buttons">
                <button type="button" onClick={handleCancel} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="save-btn">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="profile-actions">
          <button onClick={logout} className="logout-btn-large">
            Sign Out
          </button>
        </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
