import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';
import UserSearch from './UserSearch';
import './Lists.css';

const FriendsList = () => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFriendsData();
  }, []);

  const fetchFriendsData = async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        usersAPI.getFriends(),
        usersAPI.getFriendRequests()
      ]);
      
      setFriends(friendsRes.data.friends);
      setFriendRequests(requestsRes.data.friendRequests);
    } catch (error) {
      console.error('Failed to fetch friends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await usersAPI.respondToFriendRequest(requestId, 'ACCEPTED');
      fetchFriendsData(); // Refresh the data
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await usersAPI.respondToFriendRequest(requestId, 'REJECTED');
      fetchFriendsData(); // Refresh the data
    } catch (error) {
      console.error('Failed to decline friend request:', error);
    }
  };

  const handleStartChat = (friendId) => {
    navigate(`/chat/direct/${friendId}`);
  };

  if (loading) {
    return (
      <div className="list-page loading">
        <div className="loading-spinner">Loading friends...</div>
      </div>
    );
  }

  return (
    <div className="list-page">
      {/* Header */}
      <header className="list-header">
        <div className="header-content">
          <div className="header-left">
            <button onClick={() => navigate('/dashboard')} className="back-btn">
              ← Back
            </button>
            <h1>Friends</h1>
          </div>
          
          <nav className="header-nav">
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/friends" className="nav-link active">Friends</Link>
            <Link to="/groups" className="nav-link">Groups</Link>
            <Link to="/profile" className="nav-link">Profile</Link>
          </nav>
        </div>
      </header>

      <main className="list-main">
        <div className="list-content">
          {/* Actions */}
          <div className="list-actions">
            <button onClick={() => setShowUserSearch(true)} className="action-btn primary">
              Add Friends
            </button>
          </div>

          {/* Friend Requests */}
          {friendRequests.length > 0 && (
            <section className="list-section">
              <h2>Friend Requests ({friendRequests.length})</h2>
              <div className="requests-list">
                {friendRequests.map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="user-avatar">
                      {request.requester.firstName 
                        ? request.requester.firstName[0].toUpperCase()
                        : request.requester.username[0].toUpperCase()}
                    </div>
                    <div className="user-info">
                      <h3>{request.requester.firstName && request.requester.lastName 
                        ? `${request.requester.firstName} ${request.requester.lastName}`
                        : request.requester.username}</h3>
                      <p>@{request.requester.username}</p>
                      {request.requester.bio && <p className="bio">{request.requester.bio}</p>}
                    </div>
                    <div className="request-actions">
                      <button 
                        onClick={() => handleAcceptRequest(request.id)}
                        className="accept-btn"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleDeclineRequest(request.id)}
                        className="decline-btn"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Friends List */}
          <section className="list-section">
            <h2>My Friends ({friends.length})</h2>
            
            {friends.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>No friends yet</h3>
                <p>Start building your network by searching for and adding friends!</p>
                <button onClick={() => setShowUserSearch(true)} className="action-btn primary">
                  Find Friends
                </button>
              </div>
            ) : (
              <div className="friends-grid">
                {friends.map((friend) => (
                  <div key={friend.id} className="friend-card">
                    <div className="user-avatar">
                      {friend.firstName 
                        ? friend.firstName[0].toUpperCase()
                        : friend.username[0].toUpperCase()}
                    </div>
                    <div className="user-info">
                      <h3>{friend.firstName && friend.lastName 
                        ? `${friend.firstName} ${friend.lastName}`
                        : friend.username}</h3>
                      <p>@{friend.username}</p>
                      {friend.bio && <p className="bio">{friend.bio}</p>}
                    </div>
                    <div className="friend-actions">
                      <button 
                        onClick={() => handleStartChat(friend.id)}
                        className="chat-btn"
                      >
                        💬 Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {showUserSearch && (
        <UserSearch 
          onClose={() => setShowUserSearch(false)}
          onFriendAdded={fetchFriendsData}
        />
      )}
    </div>
  );
};

export default FriendsList;
