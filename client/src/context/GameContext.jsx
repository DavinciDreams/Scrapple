// context/GameContext.jsx
import { createContext, useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useSocketEvents } from '../utils/socketEvents';

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
  const [placedTiles, setPlacedTiles] = useState([]);

  const placeTile = (row, col, tileIndex, playerId) => {
    if (!playerTiles[tileIndex] || board[row][col]) return;
    const tile = playerTiles[tileIndex];
    socket.emit('placeTile', {
      roomId: window.location.pathname.split('/').pop(),
      row,
      col,
      tile,
      playerId,
    });
  };

  const drawTiles = (count) => {
    const newTiles = [];
    const tileBag = [
      ...Array(9).fill({ letter: 'A', score: 1 }),
      ...Array(2).fill({ letter: 'B', score: 3 }),
      // ... (complete from HTML template)
    ];
    for (let i = 0; i < count && tileBag.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * tileBag.length);
      newTiles.push(tileBag[randomIndex]);
      tileBag.splice(randomIndex, 1);
    }
    setPlayerTiles([...playerTiles, ...newTiles]);
  };

  useSocketEvents(socket, {
    onGameStateUpdate: (newState) => {
      setBoard(newState.board);
      setPlayerTiles(newState.playerTiles || []);
      setPlacedTiles(newState.placedTiles || []);
    },
    onTilePlaced: ({ row, col, tile }) => {
      const newBoard = [...board];
      newBoard[row][col] = tile;
      setBoard(newBoard);
      setPlacedTiles([...placedTiles, { row, col, tile }]);
      if (playerTiles.some(t => t.letter === tile.letter && t.score === tile.score)) {
        setPlayerTiles(playerTiles.filter(t => t.letter !== tile.letter || t.score !== tile.score));
      }
    },
    onWordSubmitted: ({ word, score }) => {
      alert(`Word submitted: ${word}, Score: ${score}`);
    },
    onError: (message) => {
      alert(message);
    },
  });

  useEffect(() => {
    if (socket) drawTiles(7);
  }, [socket]);

  return (
    <GameContext.Provider
      value={{ board, setBoard, playerTiles, setPlayerTiles, selectedTile, setSelectedTile, placedTiles, placeTile, drawTiles }}
    >
      {children}
    </GameContext.Provider>
  );
};