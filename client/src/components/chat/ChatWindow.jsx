import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { messagesAPI } from '../../services/api';

const ChatWindow = ({ chat, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  
  const { user } = useAuth();
  const { socket, sendDirectMessage, sendGroupMessage, joinGroup, leaveGroup } = useSocket();

  useEffect(() => {
    fetchMessages();
    
    // Join group if it's a group chat
    if (chat.type === 'group') {
      joinGroup(chat.id);
    }

    return () => {
      if (chat.type === 'group') {
        leaveGroup(chat.id);
      }
    };
  }, [chat]);

  useEffect(() => {
    if (socket) {
      socket.on('new_direct_message', handleNewMessage);
      socket.on('new_group_message', handleNewMessage);
      socket.on('message_sent', handleMessageSent);

      return () => {
        socket.off('new_direct_message');
        socket.off('new_group_message');
        socket.off('message_sent');
      };
    }
  }, [socket, chat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      let response;
      
      if (chat.type === 'group') {
        response = await messagesAPI.getGroupMessages(chat.id);
      } else {
        response = await messagesAPI.getDirectMessages(chat.id);
      }
      
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message) => {
    // Only add message if it's for this chat
    const isForThisChat = chat.type === 'group' 
      ? message.groupId === chat.id
      : (message.author.id === chat.id || message.recipient?.id === chat.id);

    if (isForThisChat) {
      setMessages(prev => [...prev, message]);
    }
  };

  const handleMessageSent = (message) => {
    // Add the sent message to the chat if it's for this conversation
    const isForThisChat = chat.type === 'group'
      ? message.groupId === chat.id
      : message.recipient?.id === chat.id;

    if (isForThisChat) {
      setMessages(prev => [...prev, message]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    if (chat.type === 'group') {
      sendGroupMessage(chat.id, newMessage.trim());
    } else {
      sendDirectMessage(chat.id, newMessage.trim());
    }

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

  const getChatTitle = () => {
    if (chat.type === 'group') {
      return chat.name;
    } else {
      const partner = chat.partner;
      return partner.firstName && partner.lastName 
        ? `${partner.firstName} ${partner.lastName}`
        : partner.username;
    }
  };

  const getChatSubtitle = () => {
    if (chat.type === 'group') {
      return `${chat.members?.length || 0} members`;
    } else {
      return `@${chat.partner.username}`;
    }
  };

  if (loading) {
    return (
      <div className="chat-window loading">
        <div className="loading-spinner">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="chat-info">
          <div className="chat-avatar">
            {chat.type === 'group' ? '👥' : (
              chat.partner.firstName 
                ? chat.partner.firstName[0].toUpperCase()
                : chat.partner.username[0].toUpperCase()
            )}
          </div>
          <div className="chat-details">
            <div className="chat-title">{getChatTitle()}</div>
            <div className="chat-subtitle">{getChatSubtitle()}</div>
          </div>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet</p>
            <p>Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <React.Fragment key={message.id}>
              {shouldShowDateSeparator(message, messages[index - 1]) && (
                <div className="date-separator">
                  {formatDate(message.createdAt)}
                </div>
              )}
              <div className={`message ${message.author.id === user.id ? 'own' : 'other'}`}>
                {message.author.id !== user.id && chat.type === 'group' && (
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

      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
