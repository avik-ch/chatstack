import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserSearch from '../user/UserSearch';
import CreateGroup from '../group/CreateGroup';

const Sidebar = ({ 
  conversations, 
  friends, 
  selectedChat, 
  onSelectChat, 
  onStartDirectChat,
  onShowProfile,
  onRefreshConversations 
}) => {
  const [activeTab, setActiveTab] = useState('chats');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { user, logout } = useAuth();

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
    
    return prefix + (message.content.length > 30 
      ? message.content.substring(0, 30) + '...'
      : message.content);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="user-info" onClick={onShowProfile}>
          <div className="user-avatar">
            {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
          </div>
          <div className="user-details">
            <div className="user-name">
              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
            </div>
            <div className="user-status">Online</div>
          </div>
        </div>
        <button onClick={logout} className="logout-btn" title="Logout">
          ↗
        </button>
      </div>

      <div className="sidebar-tabs">
        <button 
          className={`tab ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          Chats
        </button>
        <button 
          className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends
        </button>
      </div>

      <div className="sidebar-actions">
        {activeTab === 'chats' && (
          <button 
            className="action-btn"
            onClick={() => setShowCreateGroup(true)}
          >
            + New Group
          </button>
        )}
        {activeTab === 'friends' && (
          <button 
            className="action-btn"
            onClick={() => setShowUserSearch(true)}
          >
            + Add Friend
          </button>
        )}
      </div>

      <div className="sidebar-content">
        {activeTab === 'chats' && (
          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="empty-state">
                <p>No conversations yet</p>
                <p>Start chatting with your friends!</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={`${conversation.type}-${conversation.id}`}
                  className={`conversation-item ${selectedChat?.id === conversation.id && selectedChat?.type === conversation.type ? 'active' : ''}`}
                  onClick={() => onSelectChat(conversation)}
                >
                  <div className="conversation-avatar">
                    {conversation.type === 'group' ? '👥' : (
                      conversation.partner.firstName 
                        ? conversation.partner.firstName[0].toUpperCase()
                        : conversation.partner.username[0].toUpperCase()
                    )}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-name">
                      {getConversationName(conversation)}
                    </div>
                    <div className="conversation-preview">
                      {getLastMessagePreview(conversation)}
                    </div>
                  </div>
                  <div className="conversation-time">
                    {conversation.lastMessage && formatTime(conversation.lastMessage.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="friends-list">
            {friends.length === 0 ? (
              <div className="empty-state">
                <p>No friends yet</p>
                <p>Search for users to add as friends!</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  className="friend-item"
                  onClick={() => onStartDirectChat(friend)}
                >
                  <div className="friend-avatar">
                    {friend.firstName ? friend.firstName[0].toUpperCase() : friend.username[0].toUpperCase()}
                  </div>
                  <div className="friend-info">
                    <div className="friend-name">
                      {friend.firstName && friend.lastName ? `${friend.firstName} ${friend.lastName}` : friend.username}
                    </div>
                    <div className="friend-username">@{friend.username}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showUserSearch && (
        <UserSearch 
          onClose={() => setShowUserSearch(false)}
          onFriendAdded={onRefreshConversations}
        />
      )}

      {showCreateGroup && (
        <CreateGroup
          friends={friends}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={onRefreshConversations}
        />
      )}
    </div>
  );
};

export default Sidebar;
