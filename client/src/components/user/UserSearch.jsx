import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';

const UserSearch = ({ onClose, onFriendAdded }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingRequests, setSendingRequests] = useState(new Set());
  const [sentRequests, setSentRequests] = useState(new Set());

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await usersAPI.searchUsers(searchQuery);
      setSearchResults(response.data.users);
    } catch (error) {
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      setSendingRequests(prev => new Set([...prev, userId]));
      await usersAPI.sendFriendRequest(userId);
      setSentRequests(prev => new Set([...prev, userId]));
      
      if (onFriendAdded) {
        onFriendAdded();
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to send friend request');
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content user-search-modal">
        <div className="modal-header">
          <h3>Find Friends</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="search-section">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or name..."
            className="search-input"
            autoFocus
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="search-results">
          {loading && <div className="loading-spinner">Searching...</div>}
          
          {!loading && searchQuery.length < 2 && (
            <div className="search-hint">
              Type at least 2 characters to search for users
            </div>
          )}
          
          {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="no-results">
              No users found matching "{searchQuery}"
            </div>
          )}

          {searchResults.map((user) => (
            <div key={user.id} className="user-result">
              <div className="user-avatar">
                {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                </div>
                <div className="user-username">@{user.username}</div>
                {user.bio && <div className="user-bio">{user.bio}</div>}
              </div>
              <div className="user-actions">
                {sentRequests.has(user.id) ? (
                  <span className="request-sent">Request Sent</span>
                ) : (
                  <button
                    onClick={() => handleSendFriendRequest(user.id)}
                    disabled={sendingRequests.has(user.id)}
                    className="add-friend-btn"
                  >
                    {sendingRequests.has(user.id) ? 'Sending...' : 'Add Friend'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;
