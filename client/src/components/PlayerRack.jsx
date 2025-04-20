// client/src/components/PlayerRack.jsx (from prior update)
import { useContext } from 'react';
import { GameContext } from '../context/GameContext';
import Tile from './Tile';

const PlayerRack = () => {
  const { playerTiles, selectedTile, setSelectedTile } = useContext(GameContext);

  const handleTileClick = (tile, index) => {
    if (selectedTile?.index === index) {
      setSelectedTile(null); // Deselect if already selected
    } else {
      setSelectedTile({ ...tile, index }); // Select the tile
    }
  };

  return (
    <div className="flex space-x-2 p-4 bg-gray-200 rounded-lg">
      {playerTiles.length === 0 ? (
        <p className="text-gray-500">No tiles available. Waiting for tiles...</p>
      ) : (
        playerTiles.map((tile, index) => (
          <Tile
            key={`${tile.letter}-${index}`}
            letter={tile.letter}
            score={tile.score}
            onClick={() => handleTileClick(tile, index)}
            isSelected={selectedTile?.index === index}
          />
        ))
      )}
    </div>
  );
};

export default PlayerRack;