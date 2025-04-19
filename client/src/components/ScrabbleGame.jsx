import React, { useState, useEffect } from 'react';
import ScrabbleBoard from './ScrabbleBoard';

const tileBag = [
  { letter: 'A', score: 1, count: 9 }, { letter: 'B', score: 3, count: 2 },
  { letter: 'C', score: 3, count: 2 }, { letter: 'D', score: 2, count: 4 },
  { letter: 'E', score: 1, count: 12 }, { letter: 'F', score: 4, count: 2 },
  { letter: 'G', score: 2, count: 3 }, { letter: 'H', score: 4, count: 2 },
  { letter: 'I', score: 1, count: 9 }, { letter: 'J', score: 8, count: 1 },
  { letter: 'K', score: 5, count: 1 }, { letter: 'L', score: 1, count: 4 },
  { letter: 'M', score: 3, count: 2 }, { letter: 'N', score: 1, count: 6 },
  { letter: 'O', score: 1, count: 8 }, { letter: 'P', score: 3, count: 2 },
  { letter: 'Q', score: 10, count: 1 }, { letter: 'R', score: 1, count: 6 },
  { letter: 'S', score: 1, count: 4 }, { letter: 'T', score: 1, count: 6 },
  { letter: 'U', score: 1, count: 4 }, { letter: 'V', score: 4, count: 2 },
  { letter: 'W', score: 4, count: 2 }, { letter: 'X', score: 8, count: 1 },
  { letter: 'Y', score: 4, count: 2 }, { letter: 'Z', score: 10, count: 1 },
  { letter: '*', score: 0, count: 2 }
];

const ScrabbleGame = ({ roomId, players, isCreator, socket }) => {
  const [board, setBoard] = useState(Array(15).fill().map(() => Array(15).fill(null)));
  const [playerTiles, setPlayerTiles] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [placedTiles, setPlacedTiles] = useState([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameState, setGameState] = useState('waiting');
  const [validationError, setValidationError] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('timeUpdate', ({ timeLeft }) => {
      setTimeLeft(timeLeft);
    });

    socket.on('gameStarted', ({ initialTiles, firstPlayer }) => {
      setPlayerTiles(initialTiles);
      setGameState('playing');
      setIsMyTurn(firstPlayer === socket.id);
      setBoard(Array(15).fill().map(() => Array(15).fill(null)));
      setPlacedTiles([]);
      setScore(0);
    });

    socket.on('turnUpdate', ({ currentPlayer, board: newBoard }) => {
      setIsMyTurn(currentPlayer === socket.id);
      if (newBoard) {
        setBoard(newBoard);
      }
    });

    socket.on('boardUpdate', ({ newBoard, lastPlacedTiles }) => {
      setBoard(newBoard);
      setPlacedTiles(lastPlacedTiles);
    });

    socket.on('tileUpdate', ({ newTiles }) => {
      setPlayerTiles(newTiles);
    });

    socket.on('moveError', ({ message }) => {
      setValidationError(message);
      setTimeout(() => setValidationError(null), 3000);
    });

    return () => {
      socket.off('timeUpdate');
      socket.off('gameStarted');
      socket.off('turnUpdate');
      socket.off('boardUpdate');
      socket.off('tileUpdate');
      socket.off('moveError');
    };
  }, [socket]);

  const handleTileSelect = (index) => {
    setSelectedTile(selectedTile === index ? null : index);
  };

  const handlePlaceTile = (row, col) => {
    if (!isMyTurn || selectedTile === null || board[row][col]) return;

    const tile = playerTiles[selectedTile];
    const newBoard = [...board];
    newBoard[row][col] = tile;
    
    const newPlacedTiles = [...placedTiles, { row, col, tile }];
    
    socket.emit('placeTile', {
      roomId,
      row,
      col,
      tile,
      tileIndex: selectedTile
    });

    setBoard(newBoard);
    setPlacedTiles(newPlacedTiles);
    setPlayerTiles(playerTiles.filter((_, i) => i !== selectedTile));
    setSelectedTile(null);
  };

  const submitMove = () => {
    if (!isMyTurn || placedTiles.length === 0) return;
    setValidationError(null);
    socket.emit('submitMove', { roomId, placedTiles });
    setPlacedTiles([]);
  };

  const shuffleTiles = () => {
    const shuffled = [...playerTiles].sort(() => Math.random() - 0.5);
    setPlayerTiles(shuffled);
  };

  const resetMove = () => {
    if (!isMyTurn) return;
    
    const newBoard = [...board];
    const returnedTiles = [];
    
    placedTiles.forEach(({ row, col, tile }) => {
      newBoard[row][col] = null;
      returnedTiles.push(tile);
    });
    
    setBoard(newBoard);
    setPlacedTiles([]);
    setPlayerTiles([...playerTiles, ...returnedTiles]);
  };

  const exchangeTiles = (selectedTileIndices) => {
    if (!isMyTurn || placedTiles.length > 0) return;
    
    const tilesToExchange = selectedTileIndices.map(index => playerTiles[index]);
    socket.emit('exchangeTiles', { roomId, tiles: tilesToExchange });
    setSelectedTile(null);
  };

  const drawTiles = () => {
    if (playerTiles.length >= 7) return;
    const numTilesToDraw = 7 - playerTiles.length;
    socket.emit('drawTiles', { roomId, numTiles: numTilesToDraw });
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isTimeRunningLow = (seconds) => {
    return seconds <= 300; // 5 minutes or less
  };

  return (
    <div className="scrabble-game">
      {validationError && (
        <div className="error-message">{validationError}</div>
      )}
      <div className="game-info">
        <div className="score">Score: {score}</div>
        {timeLeft && (
          <div className={`timer ${isTimeRunningLow(timeLeft) ? 'warning' : ''}`}>
            Time Left: {formatTime(timeLeft)}
          </div>
        )}
        <div className="turn-indicator">
          {isMyTurn ? "Your Turn!" : "Waiting for opponent..."}
        </div>
      </div>
      
      <ScrabbleBoard
        board={board}
        onPlaceTile={handlePlaceTile}
        placedTiles={placedTiles}
      />
      
      <div className="player-tiles">
        {playerTiles.map((tile, index) => (
          <div
            key={index}
            className={`tile ${selectedTile === index ? 'selected' : ''}`}
            onClick={() => handleTileSelect(index)}
          >
            <span className="letter">{tile.letter}</span>
            <span className="score">{tile.score}</span>
          </div>
        ))}
      </div>
      
      <div className="game-controls">
        <button 
          className="control-button"
          onClick={shuffleTiles}
          disabled={!isMyTurn}
        >
          Shuffle
        </button>
        <button
          className="control-button"
          onClick={resetMove}
          disabled={!isMyTurn || placedTiles.length === 0}
        >
          Reset
        </button>
        <button
          className="control-button"
          onClick={() => exchangeTiles([selectedTile])}
          disabled={!isMyTurn || selectedTile === null}
        >
          Exchange
        </button>
        <button
          className="control-button primary"
          onClick={submitMove}
          disabled={!isMyTurn || placedTiles.length === 0}
        >
          Submit Word
        </button>
      </div>
    </div>
  );
};

export default ScrabbleGame;
