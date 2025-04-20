// client/src/hooks/useSocket.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://rabble-l5gj.onrender.com';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketIo = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketIo.on('connect', () => {
      console.log('Connected to server:', socketIo.id);
      setSocket(socketIo);
    });

    socketIo.on('connect_error', (error) => {
      console.log('Socket connection error:', error.message);
    });

    socketIo.on('disconnect', () => {
      console.log('Disconnected from server');
      setSocket(null);
    });

    return () => {
      socketIo.disconnect();
    };
  }, []);

  return socket;
};