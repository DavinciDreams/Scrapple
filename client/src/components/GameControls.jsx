// components/GameControls.jsx
import { useContext } from 'react';
import { GameContext } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';

const GameControls = () => {
  const { playerTiles } = useContext(GameContext);
  const socket = useSocket();

  const handleResetBoard = () => {
    socket.emit('resetBoard', {
      roomId: window.location.pathname.split('/').pop(),
    });
  };

  const handleShuffleTiles = () => {
    socket.emit('shuffleTiles', {
      roomId: window.location.pathname.split('/').pop(),
    });
  };

  const handleSubmitWord = () => {
    if (playerTiles.length === 7) {
      alert('Place some tiles first!');
      return;
    }
    socket.emit('submitWord', {
      roomId: window.location.pathname.split('/').pop(),
    });
  };

  return (
    <div className="flex gap-4 justify-center mt-5 flex-wrap">
      <button
        className="px-5 py-2.5 text-white bg-scrabble-brown rounded-md hover:bg-scrabble-brown-dark transition-colors duration-200"
        onClick={handleResetBoard}
      >
        Reset Board
      </button>
      <button
        className="px-5 py-2.5 text-white bg-scrabble-brown rounded-md hover:bg-scrabble-brown-dark transition-colors duration-200"
        onClick={handleShuffleTiles}
      >
        Shuffle Tiles
      </button>
      <button
        className="px-5 py-2.5 text-white bg-scrabble-brown rounded-md hover:bg-scrabble-brown-dark transition-colors duration-200"
        onClick={handleSubmitWord}
      >
        Submit Word
      </button>
    </div>
  );
};

export default GameControls;