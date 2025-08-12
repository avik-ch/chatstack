import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { messagesAPI, usersAPI } from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [conversationsRes, friendsRes, friendRequestsRes] = await Promise.all([
        messagesAPI.getConversations(),
        usersAPI.getFriends(),
        usersAPI.getFriendRequests()
      ]);
      
      setConversations(conversationsRes.data.conversations);
      setFriends(friendsRes.data.friends);
      setFriendRequests(friendRequestsRes.data.friendRequests);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getConversationName = (conversation) => {
    if (conversation.type === 'group') {
      return conversation.name;
    } else {
      const partner = conversation.partner;
      return partner.firstName && partner.lastName 
        ? `${partner.firstName} ${partner.lastName}`
        : partner.username;
    }
  };

  const getLastMessagePreview = (conversation) => {
    if (!conversation.lastMessage) return 'No messages yet';
    
    const message = conversation.lastMessage;
    const isOwn = message.author.id === user.id;
    const prefix = isOwn ? 'You: ' : `${message.author.username}: `;
    
    return prefix + (message.content.length > 50 
      ? message.content.substring(0, 50) + '...'
      : message.content);
  };

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>ChatStack</h1>
          <nav className="main-nav">
            <Link to="/dashboard" className="nav-link active">Dashboard</Link>
            <Link to="/friends" className="nav-link">Friends</Link>
            <Link to="/groups" className="nav-link">Groups</Link>
            <Link to="/profile" className="nav-link">Profile</Link>
          </nav>
          <div className="user-menu">
            <span className="welcome-text">Welcome, {user.firstName || user.username}!</span>
            <button onClick={logout} className="logout-btn">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          {/* Recent Conversations */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Recent Conversations</h2>
              {conversations.length > 0 && (
                <span className="section-count">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            
            {conversations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>No conversations yet</h3>
                <p>Start chatting with your friends or create a group!</p>
                <div className="empty-actions">
                  <Link to="/friends" className="action-btn primary">Find Friends</Link>
                  <Link to="/groups" className="action-btn secondary">Create Group</Link>
                </div>
              </div>
            ) : (
              <div className="conversations-grid">
                {conversations.slice(0, 6).map((conversation) => (
                  <Link
                    key={`${conversation.type}-${conversation.id}`}
                    to={conversation.type === 'group' 
                      ? `/chat/group/${conversation.id}` 
                      : `/chat/direct/${conversation.id}`}
                    className="conversation-card"
                  >
                    <div className="conversation-avatar">
                      {conversation.type === 'group' ? '👥' : (
                        conversation.partner.firstName 
                          ? conversation.partner.firstName[0].toUpperCase()
                          : conversation.partner.username[0].toUpperCase()
                      )}
                    </div>
                    <div className="conversation-info">
                      <h3 className="conversation-name">
                        {getConversationName(conversation)}
                      </h3>
                      <p className="conversation-preview">
                        {getLastMessagePreview(conversation)}
                      </p>
                      <span className="conversation-time">
                        {conversation.lastMessage && formatTime(conversation.lastMessage.createdAt)}
                      </span>
                    </div>
                    <div className="conversation-badge">
                      {conversation.type === 'group' ? 'Group' : 'Direct'}
                    </div>
                  </Link>
                ))}
              </div>
            )}
            
            {conversations.length > 6 && (
              <div className="view-all">
                <Link to="/conversations" className="view-all-link">
                  View all conversations ({conversations.length})
                </Link>
              </div>
            )}
          </section>

          {/* Friend Requests */}
          {friendRequests.length > 0 && (
            <section className="dashboard-section">
              <div className="section-header">
                <h2>Friend Requests</h2>
                <span className="section-count urgent">{friendRequests.length} pending</span>
              </div>
              
              <div className="friend-requests-list">
                {friendRequests.map((request) => (
                  <div key={request.id} className="friend-request-card">
                    <div className="friend-avatar">
                      {request.requester.firstName 
                        ? request.requester.firstName[0].toUpperCase()
                        : request.requester.username[0].toUpperCase()}
                    </div>
                    <div className="friend-info">
                      <h4>{request.requester.firstName && request.requester.lastName 
                        ? `${request.requester.firstName} ${request.requester.lastName}`
                        : request.requester.username}</h4>
                      <p>@{request.requester.username}</p>
                    </div>
                    <div className="friend-actions">
                      <button className="accept-btn">Accept</button>
                      <button className="decline-btn">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quick Stats */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Quick Stats</h2>
            </div>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <span className="stat-number">{friends.length}</span>
                  <span className="stat-label">Friends</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">💬</div>
                <div className="stat-info">
                  <span className="stat-number">{conversations.filter(c => c.type === 'direct').length}</span>
                  <span className="stat-label">Direct Chats</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">🏢</div>
                <div className="stat-info">
                  <span className="stat-number">{conversations.filter(c => c.type === 'group').length}</span>
                  <span className="stat-label">Groups</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">📨</div>
                <div className="stat-info">
                  <span className="stat-number">{friendRequests.length}</span>
                  <span className="stat-label">Pending Requests</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
