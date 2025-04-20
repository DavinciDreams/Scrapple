// context/GameContext.jsx
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
  const [placedTiles, setPlacedTiles] = useState([]);
  const [tileBag, setTileBag] = useState([
    ...Array(9).fill({ letter: 'A', score: 1 }),
    ...Array(2).fill({ letter: 'B', score: 3 }),
    // ... (from HTML template's tileBag)
    ...Array(2).fill({ letter: '*', score: 0 }),
  ]);

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
    const newBag = [...tileBag];
    for (let i = 0; i < count && newBag.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * newBag.length);
      newTiles.push(newBag[randomIndex]);
      newBag.splice(randomIndex, 1);
    }
    setPlayerTiles([...playerTiles, ...newTiles]);
    setTileBag(newBag);
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('gameStateUpdate', (newState) => {
      setBoard(newState.board);
      setPlayerTiles(newState.playerTiles || []);
      setPlacedTiles(newState.placedTiles || []);
    });

    socket.on('tilePlaced', ({ row, col, tile }) => {
      const newBoard = [...board];
      newBoard[row][col] = tile;
      setBoard(newBoard);
      setPlacedTiles([...placedTiles, { row, col, tile }]);
      if (playerTiles.some(t => t.letter === tile.letter && t.score === tile.score)) {
        setPlayerTiles(playerTiles.filter(t => t.letter !== tile.letter || t.score !== tile.score));
      }
    });

    socket.on('error', (message) => {
      alert(message);
    });

    // Initial tile draw
    drawTiles(7);

    return () => {
      socket.off('gameStateUpdate');
      socket.off('tilePlaced');
      socket.off('error');
    };
  }, [socket]);

  return (
    <GameContext.Provider
      value={{ board, setBoard, playerTiles, setPlayerTiles, selectedTile, setSelectedTile, placedTiles, placeTile, drawTiles }}
    >
      {children}
    </GameContext.Provider>
  );
};