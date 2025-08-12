import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { groupsAPI, usersAPI } from '../../services/api';
import CreateGroup from './CreateGroup';
import '../user/Lists.css';

const GroupsList = () => {
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroupsData();
  }, []);

  const fetchGroupsData = async () => {
    try {
      const [groupsRes, friendsRes] = await Promise.all([
        groupsAPI.getGroups(),
        usersAPI.getFriends()
      ]);
      
      setGroups(groupsRes.data.groups);
      setFriends(friendsRes.data.friends);
    } catch (error) {
      console.error('Failed to fetch groups data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = (groupId) => {
    navigate(`/chat/group/${groupId}`);
  };

  const handleLeaveGroup = async (groupId) => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    
    try {
      await groupsAPI.leaveGroup(groupId);
      fetchGroupsData(); // Refresh the data
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  const getUserRole = (group) => {
    const membership = group.members.find(member => member.userId === user.id);
    return membership?.role || 'MEMBER';
  };

  if (loading) {
    return (
      <div className="list-page loading">
        <div className="loading-spinner">Loading groups...</div>
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
            <h1>Groups</h1>
          </div>
          
          <nav className="header-nav">
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/friends" className="nav-link">Friends</Link>
            <Link to="/groups" className="nav-link active">Groups</Link>
            <Link to="/profile" className="nav-link">Profile</Link>
          </nav>
        </div>
      </header>

      <main className="list-main">
        <div className="list-content">
          {/* Actions */}
          <div className="list-actions">
            <button onClick={() => setShowCreateGroup(true)} className="action-btn primary">
              Create Group
            </button>
          </div>

          {/* Groups List */}
          <section className="list-section">
            <h2>My Groups ({groups.length})</h2>
            
            {groups.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <h3>No groups yet</h3>
                <p>Create a group to start collaborating with your friends!</p>
                <button onClick={() => setShowCreateGroup(true)} className="action-btn primary">
                  Create Your First Group
                </button>
              </div>
            ) : (
              <div className="groups-grid">
                {groups.map((group) => {
                  const userRole = getUserRole(group);
                  return (
                    <div key={group.id} className="group-card">
                      <div className="group-header">
                        <div className="group-avatar">
                          👥
                        </div>
                        <div className="group-badge">
                          {userRole === 'ADMIN' ? 'Admin' : 'Member'}
                        </div>
                      </div>
                      
                      <div className="group-info">
                        <h3>{group.name}</h3>
                        {group.description && <p className="description">{group.description}</p>}
                        <p className="member-count">
                          {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="group-members">
                        {group.members.slice(0, 4).map((member) => (
                          <div 
                            key={member.user.id} 
                            className="member-avatar"
                            title={`${member.user.username} (${member.role})`}
                          >
                            {member.user.firstName 
                              ? member.user.firstName[0].toUpperCase()
                              : member.user.username[0].toUpperCase()}
                          </div>
                        ))}
                        {group.members.length > 4 && (
                          <div className="member-count-badge">
                            +{group.members.length - 4}
                          </div>
                        )}
                      </div>

                      <div className="group-actions">
                        <button 
                          onClick={() => handleJoinGroup(group.id)}
                          className="chat-btn"
                        >
                          💬 Open Chat
                        </button>
                        <button 
                          onClick={() => handleLeaveGroup(group.id)}
                          className="leave-btn"
                          title="Leave Group"
                        >
                          🚪 Leave
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {showCreateGroup && (
        <CreateGroup
          friends={friends}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={fetchGroupsData}
        />
      )}
    </div>
  );
};

export default GroupsList;
