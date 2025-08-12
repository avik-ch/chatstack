import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { messagesAPI, usersAPI } from '../../services/api';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import UserProfile from '../user/UserProfile';
import './Chat.css';

const ChatDashboard = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const { socket } = useSocket();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new_direct_message', handleNewDirectMessage);
      socket.on('new_group_message', handleNewGroupMessage);
      socket.on('message_sent', handleMessageSent);

      return () => {
        socket.off('new_direct_message');
        socket.off('new_group_message');
        socket.off('message_sent');
      };
    }
  }, [socket, conversations]);

  const fetchInitialData = async () => {
    try {
      const [conversationsRes, friendsRes] = await Promise.all([
        messagesAPI.getConversations(),
        usersAPI.getFriends()
      ]);
      
      setConversations(conversationsRes.data.conversations);
      setFriends(friendsRes.data.friends);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewDirectMessage = (message) => {
    // Update conversations with new message
    setConversations(prev => {
      const updated = [...prev];
      const conversationIndex = updated.findIndex(
        conv => conv.type === 'direct' && conv.id === message.author.id
      );

      if (conversationIndex >= 0) {
        updated[conversationIndex].lastMessage = message;
        // Move to top
        const conversation = updated.splice(conversationIndex, 1)[0];
        updated.unshift(conversation);
      } else {
        // Create new conversation
        updated.unshift({
          type: 'direct',
          id: message.author.id,
          partner: message.author,
          lastMessage: message
        });
      }

      return updated;
    });

    // If this is the active chat, the ChatWindow will handle adding the message
  };

  const handleNewGroupMessage = (message) => {
    // Update conversations with new group message
    setConversations(prev => {
      const updated = [...prev];
      const conversationIndex = updated.findIndex(
        conv => conv.type === 'group' && conv.id === message.groupId
      );

      if (conversationIndex >= 0) {
        updated[conversationIndex].lastMessage = message;
        // Move to top
        const conversation = updated.splice(conversationIndex, 1)[0];
        updated.unshift(conversation);
      }

      return updated;
    });
  };

  const handleMessageSent = (message) => {
    // Update conversations when user sends a message
    const isGroupMessage = message.groupId;
    
    setConversations(prev => {
      const updated = [...prev];
      const conversationIndex = updated.findIndex(conv => 
        isGroupMessage 
          ? (conv.type === 'group' && conv.id === message.groupId)
          : (conv.type === 'direct' && conv.id === message.recipient.id)
      );

      if (conversationIndex >= 0) {
        updated[conversationIndex].lastMessage = message;
        // Move to top
        const conversation = updated.splice(conversationIndex, 1)[0];
        updated.unshift(conversation);
      }

      return updated;
    });
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setShowProfile(false);
  };

  const handleStartDirectChat = (friend) => {
    const existingConversation = conversations.find(
      conv => conv.type === 'direct' && conv.id === friend.id
    );

    if (existingConversation) {
      setSelectedChat(existingConversation);
    } else {
      const newChat = {
        type: 'direct',
        id: friend.id,
        partner: friend,
        lastMessage: null
      };
      setSelectedChat(newChat);
    }
    setShowProfile(false);
  };

  if (loading) {
    return (
      <div className="chat-dashboard loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="chat-dashboard">
      <Sidebar
        conversations={conversations}
        friends={friends}
        selectedChat={selectedChat}
        onSelectChat={handleSelectChat}
        onStartDirectChat={handleStartDirectChat}
        onShowProfile={() => setShowProfile(true)}
        onRefreshConversations={fetchInitialData}
      />
      
      <div className="chat-main">
        {showProfile ? (
          <UserProfile onClose={() => setShowProfile(false)} />
        ) : selectedChat ? (
          <ChatWindow 
            chat={selectedChat}
            onBack={() => setSelectedChat(null)}
          />
        ) : (
          <div className="no-chat-selected">
            <div className="welcome-message">
              <h2>Welcome to ChatStack!</h2>
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatDashboard;
