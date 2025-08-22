import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { messagesAPI, groupsAPI } from '../../services/api';
import './Chat.css';

const GroupChat = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  
  const { user } = useAuth();
  const { socket, sendGroupMessage, joinGroup, leaveGroup } = useSocket();

  useEffect(() => {
    fetchChatData();
    
    // Join group for real-time updates
    if (groupId) {
      joinGroup(groupId);
    }

    return () => {
      if (groupId) {
        leaveGroup(groupId);
      }
    };
  }, [groupId]);

  useEffect(() => {
    if (socket) {
      socket.on('new_group_message', handleNewMessage);
      socket.on('message_sent', handleMessageSent);

      return () => {
        socket.off('new_group_message');
        socket.off('message_sent');
      };
    }
  }, [socket, groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (group) {
      document.title = `${group.name} - ChatStack`;
    } else {
      document.title = 'ChatStack';
    }
    
    return () => {
      document.title = 'ChatStack';
    };
  }, [group]);

  const fetchChatData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [groupRes, messagesRes] = await Promise.all([
        groupsAPI.getGroup(groupId),
        messagesAPI.getGroupMessages(groupId)
      ]);
      
      setGroup(groupRes.data.group);
      setMessages(messagesRes.data.messages);
    } catch (error) {
      console.error('Failed to fetch group chat data:', error);
      setError('Failed to load group chat. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const handleNewMessage = useCallback((message) => {
    if (message.groupId === groupId) {
      setMessages(prev => [...prev, message]);
    }
  }, [groupId]);

  const handleMessageSent = useCallback((message) => {
    if (message.groupId === groupId) {
      setMessages(prev => [...prev, message]);
    }
  }, [groupId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    sendGroupMessage(groupId, newMessage.trim());
    setNewMessage('');
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const shouldShowDateSeparator = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.createdAt).toDateString();
    const previousDate = new Date(previousMessage.createdAt).toDateString();
    
    return currentDate !== previousDate;
  };

  const shouldShowAuthor = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    if (currentMessage.author.id !== previousMessage.author.id) return true;
    
    // Show author if messages are more than 5 minutes apart
    const currentTime = new Date(currentMessage.createdAt).getTime();
    const previousTime = new Date(previousMessage.createdAt).getTime();
    return (currentTime - previousTime) > 5 * 60 * 1000;
  };

  if (loading) {
    return (
      <div className="chat-page loading">
        <div className="loading-spinner">Loading group chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-page error">
        <div className="error-state">
          <h2>Error Loading Group Chat</h2>
          <p>{error}</p>
          <button onClick={fetchChatData} className="retry-btn">Retry</button>
          <Link to="/dashboard" className="back-link">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="chat-page error">
        <div className="error-state">
          <h2>Group Not Found</h2>
          <p>The group you're trying to access could not be found.</p>
          <Link to="/dashboard" className="back-link">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      {/* Header */}
      <header className="chat-header">
        <div className="header-content">
          <div className="header-left">
            <button onClick={() => navigate('/dashboard')} className="back-btn">
              ← Back
            </button>
            <div className="chat-info">
              <div className="chat-avatar group">
                👥
              </div>
              <div className="chat-details">
                <h1 className="chat-title">{group.name}</h1>
                <p className="chat-subtitle">
                  {group.description && `${group.description}`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="group-members">
              {group.members?.slice(0, 5).map((member) => (
                <div key={member.user.id} className="member-avatar" title={member.user.username}>
                  {member.user.firstName 
                    ? member.user.firstName[0].toUpperCase()
                    : member.user.username[0].toUpperCase()}
                </div>
              ))}
              {group.members?.length > 5 && (
                <div className="member-count">+{group.members.length - 5}</div>
              )}
            </div>
            
            <nav className="header-nav">
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/friends" className="nav-link">Friends</Link>
              <Link to="/groups" className="nav-link">Groups</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="chat-messages">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="no-messages">
              <div className="no-messages-icon">💬</div>
              <h2>Welcome to {group.name}!</h2>
              <p>Start the conversation by sending the first message.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <React.Fragment key={message.id}>
                {shouldShowDateSeparator(message, messages[index - 1]) && (
                  <div className="date-separator">
                    <span>{formatDate(message.createdAt)}</span>
                  </div>
                )}
                <div className={`message ${message.author.id === user.id ? 'own' : 'other'} ${
                  shouldShowAuthor(message, messages[index - 1]) ? 'show-author' : ''
                }`}>
                  {message.author.id !== user.id && shouldShowAuthor(message, messages[index - 1]) && (
                    <div className="message-author">{message.author.username}</div>
                  )}
                  <div className="message-content">{message.content}</div>
                  <div className="message-time">{formatTime(message.createdAt)}</div>
                </div>
              </React.Fragment>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Message Input */}
      <footer className="chat-input">
        <form onSubmit={handleSendMessage} className="message-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${group.name}...`}
            className="message-input"
            autoFocus
          />
          <button type="submit" disabled={!newMessage.trim()} className="send-btn">
            Send
          </button>
        </form>
      </footer>
    </div>
  );
};

export default GroupChat;
