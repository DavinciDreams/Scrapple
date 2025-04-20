// context/GameContext.js
import { createContext, useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const socket = useSocket();
  const [board, setBoard] = useState(
    Array(15)
      .fill()
      .map(() => Array(15).fill(null))
  );
  const [playerTiles, setPlayerTiles] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('gameStateUpdate', (newState) => {
      setBoard(newState.board);
      setPlayerTiles(newState.playerTiles || []);
    });

    socket.on('error', (message) => {
      alert(message); // Display server errors (e.g., invalid word)
    });

    return () => {
      socket.off('gameStateUpdate');
      socket.off('error');
    };
  }, [socket]);

  return (
    <GameContext.Provider
      value={{ board, setBoard, playerTiles, setPlayerTiles, selectedTile, setSelectedTile }}
    >
      {children}
    </GameContext.Provider>
  );
};