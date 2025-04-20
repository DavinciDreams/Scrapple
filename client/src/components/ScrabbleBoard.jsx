// components/ScrabbleBoard.jsx
import React, { useContext } from 'react';
import { GameContext } from '../context/GameContext';
import { getSpecialTile } from '../utils/constants';

const boardSize = 15;

const ScrabbleBoard = () => {
  const { board, selectedTile, placeTile, playerTiles } = useContext(GameContext);

  const handlePlaceTile = (row, col) => {
    if (selectedTile !== null && playerTiles[selectedTile]) {
      placeTile(row, col, selectedTile, 'player-id'); // Replace with actual playerId
    }
  };

  return (
    <div className="scrabble-board grid grid-cols-15 gap-[2px] bg-scrabble-brown max-w-[600px] aspect-square mx-auto">
      {Array(boardSize)
        .fill()
        .map((_, row) =>
          Array(boardSize)
            .fill()
            .map((_, col) => {
              const tile = getSpecialTile(row, col);
              const placedTile = board[row]?.[col];
              return (
                <div
                  key={`${row}-${col}`}
                  className={`tile flex items-center justify-center text-sm font-bold ${
                    tile?.class || ''
                  } ${placedTile ? 'placed bg-scrabble-beige' : ''}`}
                  onClick={() => handlePlaceTile(row, col)}
                >
                  {placedTile ? (
                    <>
                      <span className="tile-letter">{placedTile.letter}</span>
                      <span className="tile-score">{placedTile.score}</span>
                    </>
                  ) : (
                    tile?.text || (row === 7 && col === 7 ? '★' : '')
                  )}
                </div>
              );
            })
        )}
    </div>
  );
};

export default ScrabbleBoard;