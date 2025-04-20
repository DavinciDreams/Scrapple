// server/index.js (assumed)
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  socket.on('placeTile', ({ roomId, row, col, tile, playerId }) => {
    // Update game state (e.g., in memory or database)
    const gameState = getGameState(roomId); // Implement storage
    if (!gameState.board[row][col]) {
      gameState.board[row][col] = tile;
      gameState.placedTiles.push({ row, col, tile });
      io.to(roomId).emit('tilePlaced', { row, col, tile });
      io.to(roomId).emit('gameStateUpdate', gameState);
    } else {
      socket.emit('error', 'Tile already placed!');
    }
  });
});
// server/index.js (assumed)
io.on('connection', (socket) => {
  socket.on('submitWord', async ({ roomId, word, score }) => {
    const gameState = getGameState(roomId);
    // Validate word (server-side for security)
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      if (response.ok) {
        gameState.scores[socket.id] = (gameState.scores[socket.id] || 0) + score;
        gameState.placedTiles = [];
        io.to(roomId).emit('gameStateUpdate', gameState);
        io.to(roomId).emit('wordSubmitted', { word, score });
      } else {
        socket.emit('error', 'Invalid word!');
      }
    } catch (error) {
      socket.emit('error', 'Error validating word.');
    }
  });
});
io.on('connection', (socket) => {
  socket.on('createRoom', ({ playerName }) => {
    const roomId = generateRoomId(); // e.g., UUID
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
  });
  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (io.sockets.adapter.rooms.has(roomId)) {
      socket.join(roomId);
      socket.emit('roomJoined', { roomId });
    } else {
      socket.emit('error', 'Room does not exist');
    }
  });
});