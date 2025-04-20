// components/PlayerRack.jsx
import { useContext } from 'react';
import { GameContext } from '../context/GameContext';

const PlayerRack = () => {
  const { playerTiles, selectedTile, setSelectedTile } = useContext(GameContext);

  const handleSelectTile = (index) => {
    setSelectedTile(index === selectedTile ? null : index); // Toggle selection
  };

  return (
    <div className="flex justify-center gap-2.5 mt-5 max-w-[600px] flex-wrap mx-auto">
      {playerTiles.map((tile, index) => (
        <div
          key={index}
          className={`
            bg-scrabble-beige w-10 h-10 flex items-center justify-center text-lg font-bold
            border-2 border-scrabble-brown rounded-sm cursor-pointer
            transition-transform duration-200
            ${selectedTile === index ? 'border-yellow-400 scale-110' : 'hover:scale-110'}
          `}
          onClick={() => handleSelectTile(index)}
        >
          <span className="tile-letter">{tile.letter === '*' ? ' ' : tile.letter}</span>
          <span className="tile-score text-[0.7em] text-gray-600 absolute bottom-[2px] right-[2px]">
            {tile.score}
          </span>
        </div>
      ))}
    </div>
  );
};

export default PlayerRack;