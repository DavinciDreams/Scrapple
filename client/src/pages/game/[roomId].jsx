// client/src/pages/game/[roomId].jsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GameProvider } from '../../context/GameContext';
import ScrabbleBoard from '../../components/ScrabbleBoard';
import PlayerRack from '../../components/PlayerRack';
import GameControls from '../../components/GameControls';
import GameStatus from '../../components/GameStatus';
import { useSocket } from '../../hooks/useSocket';

export default function GameRoom() {
  const router = useRouter();
  const { roomId } = router.query;
  const socket = useSocket();
  const [playerName, setPlayerName] = useState('Player'); // Temporary state for player name

  useEffect(() => {
    // Prompt for player name (temporary solution; can be passed from Lobby later)
    const name = prompt('Enter your player name:', 'Player');
    if (name) {
      setPlayerName(name);
    }
  }, []);

  useEffect(() => {
    if (socket && roomId) {
      socket.emit('joinRoom', { roomId, playerName });
    }
  }, [socket, roomId, playerName]);

  if (!roomId) {
    return <div>Loading...</div>;
  }

  return (
    <GameProvider>
      <div className="container max-w-[800px] mx-auto py-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          Rabble - Room {roomId}
        </h1>
        <GameStatus />
        <ScrabbleBoard />
        <PlayerRack />
        <GameControls />
      </div>
    </GameProvider>
  );
}