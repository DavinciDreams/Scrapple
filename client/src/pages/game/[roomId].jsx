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
  const { roomId, playerName: queryPlayerName } = router.query;
  const socket = useSocket();
  const [playerName, setPlayerName] = useState(queryPlayerName || 'Player');
  const [isJoining, setIsJoining] = useState(true);

  useEffect(() => {
    if (!queryPlayerName) {
      // Prompt for player name if not provided in query
      const name = prompt('Enter your player name:', 'Player');
      if (name) {
        setPlayerName(name);
      }
    }
  }, [queryPlayerName]);

  useEffect(() => {
    if (socket && roomId) {
      socket.emit('joinRoom', { roomId, playerName });
      setIsJoining(false);
    }
  }, [socket, roomId, playerName]);

  if (!roomId) {
    return <div>Loading...</div>;
  }

  if (isJoining) {
    return <div>Joining room...</div>;
  }

  const shareableLink = `https://scrapple.vercel.app/game/${roomId}`;

  return (
    <GameProvider>
      <div className="container max-w-[800px] mx-auto py-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          Scrapple - Room {roomId}
        </h1>
        <div className="mb-4 p-2 bg-blue-100 rounded text-center">
          <p className="text-blue-800">
            Invite others:{' '}
            <a
              href={shareableLink}
              className="text-blue-600 underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {shareableLink}
            </a>
          </p>
        </div>
        <GameStatus />
        <ScrabbleBoard />
        <PlayerRack />
        <GameControls />
      </div>
    </GameProvider>
  );
}