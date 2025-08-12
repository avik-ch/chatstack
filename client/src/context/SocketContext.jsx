import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const newSocket = io('http://localhost:8080');
      
      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnected(true);
        newSocket.emit('join', user.id);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated, user]);

  const sendDirectMessage = (recipientId, content) => {
    if (socket && connected) {
      socket.emit('send_direct_message', { recipientId, content });
    }
  };

  const sendGroupMessage = (groupId, content) => {
    if (socket && connected) {
      socket.emit('send_group_message', { groupId, content });
    }
  };

  const joinGroup = (groupId) => {
    if (socket && connected) {
      socket.emit('join_group', groupId);
    }
  };

  const leaveGroup = (groupId) => {
    if (socket && connected) {
      socket.emit('leave_group', groupId);
    }
  };

  const value = {
    socket,
    connected,
    sendDirectMessage,
    sendGroupMessage,
    joinGroup,
    leaveGroup
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
