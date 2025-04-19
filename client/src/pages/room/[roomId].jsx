import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import Head from 'next/head';
import ScrabbleGame from '../../components/ScrabbleGame';
import PlayerList from '../../components/PlayerList';

const socket = io('https://acrophylia.onrender.com', {
  withCredentials: true,
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  timeout: 30000,
});

function GameRoom() {
  const router = useRouter();
  const { roomId: urlRoomId, creatorId } = router.query;
  const [roomId, setRoomId] = useState(urlRoomId || null);
  const [roomName, setRoomName] = useState('');
  const [roomNameSet, setRoomNameSet] = useState(false);
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState('waiting');
  const [winner, setWinner] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [nameSet, setNameSet] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const chatListRef = useRef(null);
  const chatContainerRef = useRef(null);

  const checkIfNearBottom = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 100;
      if (isNearBottom && chatListRef.current) {
        chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCreator = sessionStorage.getItem('isCreator') === 'true';
      setIsCreator(storedCreator);
    }

    if (!urlRoomId || hasJoined) return;

    socket.on('connect', () => {
      setIsConnected(true);
      if (urlRoomId && !hasJoined) {
        socket.emit('joinRoom', { roomId: urlRoomId, creatorId });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('roomJoined', ({ roomId, isCreator: serverIsCreator, roomName }) => {
      setRoomId(roomId);
      setIsCreator(serverIsCreator);
      setRoomName(roomName);
      setRoomNameSet(!!roomName && roomName !== `Room ${roomId}`);
      sessionStorage.setItem('isCreator', serverIsCreator);
    });

    socket.on('roomNotFound', () => {
      alert('Room not found!');
      router.push('/');
    });

    socket.on('playerUpdate', ({ players, roomName }) => {
      setPlayers(players);
      setRoomName(roomName);
      setRoomNameSet(!!roomName && roomName !== `Room ${roomId}`);
      const currentPlayer = players.find(p => p.id === socket.id);
      if (currentPlayer && currentPlayer.name) setNameSet(true);
    });

    socket.on('creatorUpdate', (newCreatorId) => {
      setIsCreator(socket.id === newCreatorId);
      sessionStorage.setItem('isCreator', socket.id === newCreatorId);
    });

    socket.on('gameStarted', () => {
      setGameStarted(true);
      setGameState('playing');
    });

    socket.on('gameEnd', ({ winner }) => {
      setWinner(winner);
      setGameState('ended');
    });

    socket.on('gameReset', () => {
      setGameState('waiting');
      setWinner(null);
      setGameStarted(false);
    });

    socket.on('chatMessage', ({ senderId, senderName, message }) => {
      setChatMessages((prev) => [...prev, { senderId, senderName, message }]);
    });

    socket.emit('joinRoom', { roomId: urlRoomId, creatorId });
    setHasJoined(true);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('roomJoined');
      socket.off('roomNotFound');
      socket.off('playerUpdate');
      socket.off('creatorUpdate');
      socket.off('gameStarted');
      socket.off('gameEnd');
      socket.off('gameReset');
      socket.off('chatMessage');
    };
  }, [urlRoomId, router, creatorId]);

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  const startGame = useCallback(
    debounce(() => {
      if (roomId && isCreator && !isStarting) {
        setIsStarting(true);        socket.emit('startGame', { roomId, gameDuration: 30 }); // 30 minute game duration
        setTimeout(() => setIsStarting(false), 1000);
      }
    }, 500),
    [roomId, isCreator, isStarting]
  );

  const setRoomNameHandler = () => {
    if (roomName.trim() && roomId && isCreator && !roomNameSet) {
      socket.emit('setRoomName', { roomId, roomName });
      setRoomNameSet(true);
    }
  };

  const leaveRoom = () => {
    if (roomId) {
      socket.emit('leaveRoom', roomId);
      setRoomId(null);
      setRoomName('');
      setRoomNameSet(false);
      setPlayers([]);
      setGameState('waiting');
      setGameStarted(false);
      setHasJoined(false);
      sessionStorage.clear();
      router.push('/');
    }
  };

  const resetGame = () => {
    if (isCreator && roomId) {
      socket.emit('resetGame', roomId);
    }
  };

  const setName = () => {
    if (playerName.trim() && roomId) {
      socket.emit('setName', { roomId, name: playerName });
      setNameSet(true);
      setPlayerName('');
    }
  };

  const sendChatMessage = () => {
    if (chatInput.trim() && roomId) {
      socket.emit('sendMessage', { roomId: urlRoomId, message: chatInput });
      setChatInput('');
    }
  };

  const inviteLink = roomId ? `${window.location.origin}/room/${roomId}` : '';

  return (
    <>
      <Head>
        <title>{`Scrabble - Room ${roomId || ''}`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Join a Scrabble game room and play with friends!" />
      </Head>
      
      <div className="game-room-container">
        {roomId ? (
          <>
            <header className="header">
              <div className="room-title-container">
                {isEditingRoomName && isCreator && !roomNameSet && gameState === 'waiting' ? (
                  <div className="room-name-edit">
                    <input
                      className="input"
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="Enter room name"
                      maxLength={20}
                      onKeyPress={(e) => e.key === 'Enter' && setRoomNameHandler()}
                    />
                    <button className="button" onClick={setRoomNameHandler}>
                      Save
                    </button>
                    <button
                      className="button"
                      onClick={() => setIsEditingRoomName(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h2 className="title">
                    {roomName || `Room ${roomId}`}
                    {isCreator && !roomNameSet && gameState === 'waiting' && (
                      <button
                        onClick={() => setIsEditingRoomName(true)}
                        aria-label="Edit Room Name"
                      >
                        ✏️
                      </button>
                    )}
                  </h2>
                )}
              </div>
              <div className="status-container">
                {!isConnected && (
                  <div className="reconnecting-badge">
                    <span className="reconnecting-text">RECONNECTING</span>
                    <span className="reconnecting-dots">...</span>
                  </div>
                )}
                <span className={`game-status ${gameState}`}>
                  {gameState.charAt(0).toUpperCase() + gameState.slice(1)}
                </span>
              </div>
            </header>

            {!gameStarted && (
              <div className="invite-section">
                <input className="input" type="text" value={inviteLink} readOnly />
                <button className="button" onClick={() => navigator.clipboard.writeText(inviteLink)}>
                  Copy Link
                </button>
              </div>
            )}            {!nameSet && gameState === 'waiting' && (
              <div className="section">
                <h3 className="subtitle">Set Your Name</h3>
                <input
                  className="input"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                />
                <button className="button" onClick={setName}>Set Name</button>
              </div>
            )}

            {nameSet && gameState === 'waiting' && !gameStarted && (
              <div className="section">
                <p>Waiting for players... (Game starts with 2-4 players)</p>
                {isCreator ? (
                  <button 
                    className="button primary"
                    onClick={startGame}
                    disabled={isStarting || players.length < 2}
                  >
                    {isStarting ? 'Starting...' : 'Start Game'}
                  </button>
                ) : (
                  <p className="note">Waiting for the room creator to start the game...</p>
                )}
              </div>
            )}

            {gameStarted && (
              <ScrabbleGame
                roomId={roomId}
                players={players}
                isCreator={isCreator}
                socket={socket}
              />
            )}
            
            <PlayerList players={players} leaveRoom={leaveRoom} />
            
            <div className="container">
              <h3 className="section-header">GAME CHAT</h3>
              <div 
                className="chat-list-wrapper" 
                ref={chatContainerRef}
                onScroll={checkIfNearBottom}
              >
                <ul className="chat-list" ref={chatListRef}>
                  {chatMessages.map((msg, index) => (
                    <li
                      key={index}
                      className={`chat-item ${msg.senderId === socket.id ? 'own-message' : ''}`}
                    >
                      <div className="pill chat-pill">
                        {msg.senderName}
                      </div>
                      <div className="chat-message">{msg.message}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="chat-input-container">
                <input
                  className="main-input chat-input"
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={100}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                />
                <button className="button" onClick={sendChatMessage}>
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="loading-message">Loading room...</p>
        )}
      </div>
    </>
  );
}

export default GameRoom;