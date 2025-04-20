// server/index.js
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust for production (e.g., Vercel URL)
    methods: ['GET', 'POST'],
  },
});

// In-memory game state (replace with database for production)
const games = new Map();

const getGameState = (roomId) => {
  if (!games.has(roomId)) {
    games.set(roomId, {
      board: Array(15).fill().map(() => Array(15).fill(null)),
      placedTiles: [],
      scores: {},
      playerTiles: {},
    });
  }
  return games.get(roomId);
};

const generateRoomId = () => {
  return Math.random().toString(36).slice(2, 8);
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createRoom', ({ playerName }) => {
    const roomId = generateRoomId();
    socket.join(roomId);
    const gameState = getGameState(roomId);
    gameState.playerTiles[socket.id] = drawTiles(7); // Initial tiles
    socket.emit('roomCreated', { roomId });
    io.to(roomId).emit('gameStateUpdate', gameState);
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (io.sockets.adapter.rooms.has(roomId)) {
      socket.join(roomId);
      const gameState = getGameState(roomId);
      gameState.playerTiles[socket.id] = drawTiles(7);
      socket.emit('roomJoined', { roomId });
      io.to(roomId).emit('gameStateUpdate', gameState);
    } else {
      socket.emit('error', 'Room does not exist');
    }
  });

  socket.on('placeTile', ({ roomId, row, col, tile, playerId }) => {
    const gameState = getGameState(roomId);
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
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      if (response.ok) {
        gameState.scores[socket.id] = (gameState.scores[socket.id] || 0) + score;
        gameState.placedTiles = [];
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
    gameState.board = Array(15).fill().map(() => Array(15).fill(null));
    gameState.placedTiles = [];
    io.to(roomId).emit('gameStateUpdate', gameState);
  });

  socket.on('shuffleTiles', ({ roomId }) => {
    const gameState = getGameState(roomId);
    const tiles = gameState.playerTiles[socket.id];
    gameState.playerTiles[socket.id] = tiles.sort(() => Math.random() - 0.5);
    io.to(roomId).emit('gameStateUpdate', gameState);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const drawTiles = (count) => {
  const tileBag = [
    ...Array(9).fill({ letter: 'A', score: 1 }),
    ...Array(2).fill({ letter: 'B', score: 3 }),
    // ... (complete from HTML template)
    ...Array(2).fill({ letter: '*', score: 0 }),
  ];
  const tiles = [];
  for (let i = 0; i < count && tileBag.length > 0; i++) {
    const index = Math.floor(Math.random() * tileBag.length);
    tiles.push(tileBag.splice(index, 1)[0]);
  }
  return tiles;
};

server.listen(process.env.PORT || 3000, () => {
  console.log('Socket.IO server running on port', process.env.PORT || 3000);
});