// server/server.js
const { createServer } = require('http');
const { Server } = require('socket.io');

const server = createServer();
const io = new Server(server, {
  cors: {
    origin: 'https://scrapple.vercel.app',
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map();

const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8); // 6-character alphanumeric ID
};

const getGameState = (roomId) => {
  const room = rooms.get(roomId) || { players: [], gameState: {} };
  if (!room.gameState.board) {
    room.gameState.board = Array(15).fill().map(() => Array(15).fill(null));
  }
  if (!room.gameState.playerTiles) {
    room.gameState.playerTiles = {};
  }
  if (!room.gameState.placedTiles) {
    room.gameState.placedTiles = [];
  }
  if (!room.gameState.scores) {
    room.gameState.scores = {};
  }
  if (!room.gameState.currentTurn) {
    room.gameState.currentTurn = null;
  }
  rooms.set(roomId, room);
  return room.gameState;
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createRoom', () => {
    console.log('Create room request received from:', socket.id);
    const roomId = generateRoomId();
    const gameState = getGameState(roomId);
    rooms.set(roomId, { players: [socket.id], gameState });
    socket.join(roomId);
    gameState.currentTurn = socket.id; // First player starts
    socket.emit('roomCreated', { roomId });
    io.to(roomId).emit('gameStateUpdate', gameState);
    console.log(`Room created: ${roomId}, emitting to client ${socket.id}`);
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    console.log(`Join room request: ${roomId} by ${playerName}`);
    if (!rooms.has(roomId)) {
      socket.emit('error', 'Room does not exist');
      return;
    }
    const room = rooms.get(roomId);
    room.players.push(socket.id);
    socket.join(roomId);
    socket.emit('roomJoined', { roomId, playerName });
    io.to(roomId).emit('gameStateUpdate', room.gameState);
    console.log(`${playerName} joined room: ${roomId}`);
  });

  socket.on('placeTile', ({ roomId, row, col, tile, playerId }) => {
    if (!rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    if (!room.gameState.board) {
      room.gameState.board = Array(15).fill().map(() => Array(15).fill(null));
    }
    room.gameState.board[row][col] = tile;
    io.to(roomId).emit('tilePlaced', { row, col, tile });
    io.to(roomId).emit('gameStateUpdate', room.gameState);
  });

  socket.on('drawTiles', ({ roomId, count }) => {
    console.log(`Drawing ${count} tiles for room ${roomId}, player ${socket.id}`);
    if (!rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    if (!room.gameState.playerTiles) {
      room.gameState.playerTiles = {};
    }
    if (!room.gameState.playerTiles[socket.id]) {
      room.gameState.playerTiles[socket.id] = [];
    }
    const newTiles = Array.from({ length: count }, () => ({
      letter: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
      score: Math.floor(Math.random() * 10) + 1,
    }));
    room.gameState.playerTiles[socket.id].push(...newTiles);
    console.log('Updated playerTiles:', room.gameState.playerTiles[socket.id]);
    io.to(roomId).emit('gameStateUpdate', room.gameState);
  });

  socket.on('requestGameState', ({ roomId }) => {
    if (!rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    socket.emit('gameStateUpdate', room.gameState);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [roomId, room] of rooms.entries()) {
      room.players = room.players.filter((id) => id !== socket.id);
      if (room.players.length === 0) {
        rooms.delete(roomId);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});