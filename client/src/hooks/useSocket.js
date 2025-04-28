// client/src/hooks/useSocket.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:3001'
    : 'https://rabble-l5gj.onrender.com');

export const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    console.log('Attempting to connect to socket at:', SOCKET_URL);
    const socketIo = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Try WebSocket, fallback to polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketIo.on('connect', () => {
      console.log('Connected to server:', socketIo.id);
      console.log('Transport used:', socketIo.io.engine.transport.name);
      setSocket(socketIo);
    });

    socketIo.on('connect_error', (error) => {
      console.log('Socket connection error:', error.message);
      console.log('Error details:', error);
    });

    socketIo.on('reconnect_attempt', (attempt) => {
      console.log('Reconnection attempt:', attempt);
    });

    socketIo.on('reconnect_failed', () => {
      console.log('Reconnection failed after all attempts');
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