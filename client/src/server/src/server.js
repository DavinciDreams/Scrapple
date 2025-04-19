  socket.on('resetGame', (roomId) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.creatorId) {
      room.game = new ScrabbleGame();
      
      // Clear all timers
      if (room.gameTimer) clearInterval(room.gameTimer);
      room.gameTimer = null;
      room.gameDuration = null;
      room.gameStartTime = null;

      // Reset game state
      room.started = false;
      room.players.forEach(player => { player.score = 0 });
      io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
      io.to(roomId).emit('gameReset');
    }
  });