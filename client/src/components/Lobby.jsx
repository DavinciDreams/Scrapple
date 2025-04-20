// client/src/components/Lobby.jsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSocket } from '../hooks/useSocket';
import { useSocketEvents } from '../utils/socketEvents';

export default function Lobby() {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const socket = useSocket();
  const router = useRouter();

  useEffect(() => {
    if (socket) {
      console.log('Socket connected:', socket.id);
    } else {
      console.log('Socket not connected');
    }
  }, [socket]);

  const handleCreateRoom = () => {
    if (!playerName) {
      alert('Please enter your player name');
      return;
    }
    if (!socket) {
      alert('Cannot connect to server. Please try again later.');
      return;
    }
    setIsCreatingRoom(true);
    socket.emit('createRoom');
  };

  const handleJoinRoom = () => {
    if (!playerName) {
      alert('Please enter your player name');
      return;
    }
    if (roomIdInput) {
      router.push(`/game/${roomIdInput}?playerName=${encodeURIComponent(playerName)}`);
    }
  };

  useSocketEvents(socket, {
    onRoomCreated: ({ roomId }) => {
      console.log('Room created:', roomId);
      setCreatedRoomId(roomId);
      setIsCreatingRoom(false);
      router.push(`/game/${roomId}?playerName=${encodeURIComponent(playerName)}`);
    },
    onError: (message) => {
      console.log('Error:', message);
      alert(message);
      setIsCreatingRoom(false);
    },
  });

  const shareableLink = createdRoomId
    ? `https://scrapple.vercel.app/game/${createdRoomId}?playerName=${encodeURIComponent(playerName)}`
    : null;

  return (
    <div className="container max-w-[600px] mx-auto py-6">
      <h1 className="text-3xl font-bold text-center mb-6">Scrapple Lobby</h1>
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your player name"
            className="border p-2 rounded"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <button
            onClick={handleCreateRoom}
            disabled={isCreatingRoom}
            className={`bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 ${
              isCreatingRoom ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isCreatingRoom ? 'Creating Room...' : 'Create Room'}
          </button>
          {createdRoomId && shareableLink && (
            <div className="mt-4 p-4 bg-green-100 rounded">
              <p className="text-green-800">
                Room created! Share this link to invite players:
              </p>
              <a
                href={shareableLink}
                className="text-blue-600 underline break-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                {shareableLink}
              </a>
            </div>
          )}
        </div>
        <div className="flex flex-col space-y-2">
          <input
            type="text"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            placeholder="Enter Room ID"
            className="border p-2 rounded"
          />
          <button
            onClick={handleJoinRoom}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}