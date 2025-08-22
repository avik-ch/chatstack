import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { messagesAPI, usersAPI } from '../../services/api';
import './Chat.css';

const DirectChat = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  
  const { user } = useAuth();
  const { socket, sendDirectMessage } = useSocket();

  useEffect(() => {
    fetchChatData();
  }, [userId]);

  useEffect(() => {
    if (socket) {
      socket.on('new_direct_message', handleNewMessage);
      socket.on('message_sent', handleMessageSent);

      return () => {
        socket.off('new_direct_message');
        socket.off('message_sent');
      };
    }
  }, [socket, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (partner) {
      document.title = `${partner.firstName} ${partner.lastName} - ChatStack`;
    } else {
      document.title = 'ChatStack';
    }
    
    return () => {
      document.title = 'ChatStack';
    };
  }, [partner]);

  const fetchChatData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [partnerRes, messagesRes] = await Promise.all([
        usersAPI.getProfile(userId),
        messagesAPI.getDirectMessages(userId)
      ]);
      
      setPartner(partnerRes.data.user);
      setMessages(messagesRes.data.messages);
    } catch (error) {
      console.error('Failed to fetch chat data:', error);
      setError('Failed to load chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message) => {
    // Only add message if it's from the current chat partner
    if (message.author.id === userId || message.recipient?.id === userId) {
      setMessages(prev => [...prev, message]);
    }
  };

  const handleMessageSent = (message) => {
    // Add the sent message to the chat if it's for this conversation
    if (message.recipient?.id === userId) {
      setMessages(prev => [...prev, message]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    sendDirectMessage(userId, newMessage.trim());
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

  if (loading) {
    return (
      <div className="chat-page loading">
        <div className="loading-spinner">Loading chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-page error">
        <div className="error-state">
          <h2>Error Loading Chat</h2>
          <p>{error}</p>
          <button onClick={fetchChatData} className="retry-btn">Retry</button>
          <Link to="/dashboard" className="back-link">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="chat-page error">
        <div className="error-state">
          <h2>User Not Found</h2>
          <p>The user you're trying to chat with could not be found.</p>
          <Link to="/dashboard" className="back-link">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const partnerName = partner.firstName && partner.lastName 
    ? `${partner.firstName} ${partner.lastName}`
    : partner.username;

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
              <div className="chat-avatar">
                {partner.firstName 
                  ? partner.firstName[0].toUpperCase()
                  : partner.username[0].toUpperCase()}
              </div>
              <div className="chat-details">
                <h1 className="chat-title">{partnerName}</h1>
                <p className="chat-subtitle">@{partner.username}</p>
              </div>
            </div>
          </div>
          
          <nav className="header-nav">
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/friends" className="nav-link">Friends</Link>
            <Link to="/groups" className="nav-link">Groups</Link>
          </nav>
        </div>
      </header>

      {/* Messages */}
      <main className="chat-messages">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="no-messages">
              <div className="no-messages-icon">💬</div>
              <h2>Start the conversation!</h2>
              <p>Send a message to {partnerName} to begin chatting.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <React.Fragment key={message.id}>
                {shouldShowDateSeparator(message, messages[index - 1]) && (
                  <div className="date-separator">
                    <span>{formatDate(message.createdAt)}</span>
                  </div>
                )}
                <div className={`message ${message.author.id === user.id ? 'own' : 'other'}`}>
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
            placeholder={`Message ${partnerName}...`}
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

export default DirectChat;
