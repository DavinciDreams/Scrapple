// server/server.js
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: ['*', 'https://scrapple.vercel.app//'], // Replace with your Vercel URL in production (e.g., https://your-vercel-url)
    methods: ['GET', 'POST'],
  },
});

// In-memory game state (replace with database like MongoDB for production)
const games = new Map();

const getGameState = (roomId) => {
  if (!games.has(roomId)) {
    games.set(roomId, {
      board: Array(15).fill().map(() => Array(15).fill(null)),
      placedTiles: [],
      scores: {},
      playerTiles: {},
      currentTurn: null,
      tileBag: [
        ...Array(9).fill({ letter: 'A', score: 1 }),
        ...Array(2).fill({ letter: 'B', score: 3 }),
        ...Array(2).fill({ letter: 'C', score: 3 }),
        ...Array(4).fill({ letter: 'D', score: 2 }),
        ...Array(12).fill({ letter: 'E', score: 1 }),
        ...Array(2).fill({ letter: 'F', score: 4 }),
        ...Array(3).fill({ letter: 'G', score: 2 }),
        ...Array(2).fill({ letter: 'H', score: 4 }),
        ...Array(9).fill({ letter: 'I', score: 1 }),
        ...Array(1).fill({ letter: 'J', score: 8 }),
        ...Array(1).fill({ letter: 'K', score: 5 }),
        ...Array(4).fill({ letter: 'L', score: 1 }),
        ...Array(2).fill({ letter: 'M', score: 3 }),
        ...Array(6).fill({ letter: 'N', score: 1 }),
        ...Array(8).fill({ letter: 'O', score: 1 }),
        ...Array(2).fill({ letter: 'P', score: 3 }),
        ...Array(1).fill({ letter: 'Q', score: 10 }),
        ...Array(6).fill({ letter: 'R', score: 1 }),
        ...Array(4).fill({ letter: 'S', score: 1 }),
        ...Array(6).fill({ letter: 'T', score: 1 }),
        ...Array(4).fill({ letter: 'U', score: 1 }),
        ...Array(2).fill({ letter: 'V', score: 4 }),
        ...Array(2).fill({ letter: 'W', score: 4 }),
        ...Array(1).fill({ letter: 'X', score: 8 }),
        ...Array(2).fill({ letter: 'Y', score: 4 }),
        ...Array(1).fill({ letter: 'Z', score: 10 }),
        ...Array(2).fill({ letter: '*', score: 0 }),
      ],
    });
  }
  return games.get(roomId);
};

const generateRoomId = () => {
  return Math.random().toString(36).slice(2, 8);
};

const drawTiles = (roomId, socketId, count) => {
  const gameState = getGameState(roomId);
  const tileBag = gameState.tileBag;
  const tiles = [];
  for (let i = 0; i < count && tileBag.length > 0; i++) {
    const index = Math.floor(Math.random() * tileBag.length);
    tiles.push(tileBag.splice(index, 1)[0]);
  }
  gameState.playerTiles[socketId] = [...(gameState.playerTiles[socketId] || []), ...tiles];
  return tiles;
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createRoom', ({ playerName }) => {
    const roomId = generateRoomId();
    socket.join(roomId);
    const gameState = getGameState(roomId);
    gameState.playerTiles[socket.id] = drawTiles(roomId, socket.id, 7);
    gameState.currentTurn = socket.id; // First player starts
    socket.emit('roomCreated', { roomId });
    io.to(roomId).emit('gameStateUpdate', gameState);
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (io.sockets.adapter.rooms.has(roomId)) {
      socket.join(roomId);
      const gameState = getGameState(roomId);
      gameState.playerTiles[socket.id] = drawTiles(roomId, socket.id, 7);
      if (!gameState.currentTurn) gameState.currentTurn = socket.id;
      socket.emit('roomJoined', { roomId });
      io.to(roomId).emit('gameStateUpdate', gameState);
    } else {
      socket.emit('error', 'Room does not exist');
    }
  });

  socket.on('requestGameState', ({ roomId }) => {
    if (io.sockets.adapter.rooms.has(roomId)) {
      const gameState = getGameState(roomId);
      socket.emit('gameStateUpdate', gameState);
    } else {
      socket.emit('error', 'Room does not exist');
    }
  });

  socket.on('placeTile', ({ roomId, row, col, tile, playerId }) => {
    const gameState = getGameState(roomId);
    if (gameState.currentTurn !== socket.id) {
      socket.emit('error', 'Not your turn!');
      return;
    }
    if (!gameState.board[row][col]) {
      gameState.board[row][col] = tile;
      gameState.placedTiles.push({ row, col, tile });
      io.to(roomId).emit('tilePlaced', { row, col, tile });
      io.to(roomId).emit('gameStateUpdate', gameState);
    } else {
      socket.emit('error', 'Tile already placed!');
    }
  });

  socket.on('submitWord', async ({ roomId, word, score }) => {
    const gameState = getGameState(roomId);
    if (gameState.currentTurn !== socket.id) {
      socket.emit('error', 'Not your turn!');
      return;
    }
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      if (response.ok) {
        gameState.scores[socket.id] = (gameState.scores[socket.id] || 0) + score;
        gameState.placedTiles = [];
        // Rotate turn
        const players = Object.keys(gameState.playerTiles);
        const currentIndex = players.indexOf(gameState.currentTurn);
        gameState.currentTurn = players[(currentIndex + 1) % players.length] || players[0];
        io.to(roomId).emit('wordSubmitted', { word, score });
        io.to(roomId).emit('gameStateUpdate', gameState);
      } else {
        socket.emit('error', 'Invalid word!');
      }
    } catch (error) {
      socket.emit('error', 'Error validating word.');
    }
  });

  socket.on('resetBoard', ({ roomId }) => {
    const gameState = getGameState(roomId);
    if (gameState.currentTurn !== socket.id) {
      socket.emit('error', 'Not your turn!');
      return;
    }
    gameState.board = Array(15).fill().map(() => Array(15).fill(null));
    gameState.placedTiles = [];
    io.to(roomId).emit('gameStateUpdate', gameState);
  });

  socket.on('shuffleTiles', ({ roomId }) => {
    const gameState = getGameState(roomId);
    if (gameState.currentTurn !== socket.id) {
      socket.emit('error', 'Not your turn!');
      return;
    }
    const tiles = gameState.playerTiles[socket.id];
    gameState.playerTiles[socket.id] = tiles.sort(() => Math.random() - 0.5);
    io.to(roomId).emit('gameStateUpdate', gameState);
  });

  socket.on('drawTiles', ({ roomId, count }) => {
    const gameState = getGameState(roomId);
    if (gameState.currentTurn !== socket.id) {
      socket.emit('error', 'Not your turn!');
      return;
    }
    drawTiles(roomId, socket.id, count);
    io.to(roomId).emit('gameStateUpdate', gameState);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up game state
    for (const [roomId, gameState] of games) {
      if (gameState.playerTiles[socket.id]) {
        delete gameState.playerTiles[socket.id];
        delete gameState.scores[socket.id];
        const players = Object.keys(gameState.playerTiles);
        if (players.length > 0 && gameState.currentTurn === socket.id) {
          gameState.currentTurn = players[0];
        } else if (players.length === 0) {
          games.delete(roomId);
        }
        io.to(roomId).emit('gameStateUpdate', gameState);
      }
    }
  });
});

// assign room id
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

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createRoom', () => {
    const roomId = Math.random().toString(36).substring(2, 8); // Generate a 6-character room ID
    rooms.set(roomId, { players: [socket.id], gameState: {} });
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
    console.log(`Room created: ${roomId}`);
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
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

server.listen(process.env.PORT || 3000, () => {
  console.log('Socket.IO server running on port', process.env.PORT || 3000);
});