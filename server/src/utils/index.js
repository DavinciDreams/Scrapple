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