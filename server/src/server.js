const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { ScrabbleGame } = require('./utils/scrabbleLogic');
const { addBotPlayers } = require('./utils/botLogic');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "https://urban-succotash-p9rqv5qxxg5cr4v4-3000.app.github.dev",
  "https://acrophylia.vercel.app",
  "https://*.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.get('/', (req, res) => {
  res.send('Scrabble Game Server is running. Connect via the frontend.');
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.debug('New client connected:', socket.id);

  socket.on('createRoom', () => {
    const roomId = Math.random().toString(36).substr(2, 9);
    rooms.set(roomId, {
      name: `Room ${roomId}`,
      creatorId: socket.id,
      players: [{ id: socket.id, name: '', score: 0, isBot: false }],
      started: false,
      game: null,
      gameTimer: null,
      gameDuration: null,
      gameStartTime: null
    });
    
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
    io.to(roomId).emit('playerUpdate', { 
      players: rooms.get(roomId).players, 
      roomName: rooms.get(roomId).name 
    });
  });

  socket.on('joinRoom', ({ roomId, creatorId }) => {
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        name: `Room ${roomId}`,
        creatorId: null,
        players: [],
        started: false,
      };
      rooms.set(roomId, room);
    }

    const isOriginalCreator = creatorId && creatorId === room.creatorId;
    const playerExists = room.players.some(player => player.id === socket.id);

    if (isOriginalCreator && room.creatorId !== socket.id) {
      const oldCreatorIndex = room.players.findIndex(p => p.id === room.creatorId);
      if (oldCreatorIndex !== -1) {
        room.players[oldCreatorIndex].id = socket.id;
        room.creatorId = socket.id;
      }
    } else if (!playerExists) {
      room.players.push({ id: socket.id, name: '', score: 0, isBot: false });
    }

    if (!room.creatorId && room.players.length > 0) {
      room.creatorId = room.players[0].id;
    }

    socket.join(roomId);
    const isCreator = socket.id === room.creatorId;
    socket.emit('roomJoined', { roomId, isCreator, roomName: room.name });

    io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
    if (room.started) {
      socket.emit('gameStarted');
      socket.emit('boardUpdate', {
        board: room.game.board,
        lastMove: room.game.lastMove
      });
      const playerTiles = room.game.getPlayerTiles(socket.id);
      if (playerTiles) {
        socket.emit('tileUpdate', { newTiles: playerTiles });
      }
      socket.emit('turnUpdate', { currentPlayer: room.game.currentTurn });
    }

    io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
  });

  socket.on('setRoomName', ({ roomId, roomName }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.creatorId && !room.started) {
      room.name = roomName.trim().substring(0, 20); // Sanitize and limit length
      io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
    }
  });

  socket.on('setName', ({ roomId, name }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && !player.isBot) {
        player.name = name.trim().substring(0, 20);
        io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
      }
    }
  });
  socket.on('startGame', ({ roomId, gameDuration }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.creatorId && !room.started) {
      room.started = true;
      room.gameDuration = gameDuration * 60; // Convert minutes to seconds
      room.gameStartTime = Date.now();
      room.game = new ScrabbleGame(); // Initialize new game

      // Add players and send initial tiles
      room.players.forEach(player => {
        const tiles = room.game.addPlayer(player.id);
        io.to(player.id).emit('tileUpdate', { newTiles: tiles });
      });

      // Initialize game timer
      const startTime = Date.now();
      room.gameTimer = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const remainingSeconds = room.gameDuration - elapsedSeconds;
        
        if (remainingSeconds <= 0) {
          clearInterval(room.gameTimer);
          const winner = room.players.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
          io.to(roomId).emit('gameEnd', { winner });
          room.started = false;
        } else {
          io.to(roomId).emit('timeUpdate', { timeLeft: remainingSeconds });
        }
      }, 1000);

      // Notify clients that game has started
      io.to(roomId).emit('gameStarted');
      io.to(roomId).emit('turnUpdate', { currentPlayer: room.game.currentTurn });
      io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
      io.to(roomId).emit('boardUpdate', {
        board: room.game.board,
        lastMove: null
      });
    }
  });

  socket.on('placeTile', ({ roomId, row, col, tile, tileIndex }) => {
    const room = rooms.get(roomId);
    if (!room || !room.started || room.game.currentTurn !== socket.id) return;

    const placement = { row, col, tile };
    room.game.board[row][col] = tile;
    
    io.to(roomId).emit('boardUpdate', {
      board: room.game.board,
      lastMove: placement
    });
  });
  socket.on('submitMove', async ({ roomId, placedTiles }) => {
    const room = rooms.get(roomId);
    if (!room || !room.started) {
      socket.emit('moveError', { message: 'Game has not started' });
      return;
    }
    
    if (room.game.currentTurn !== socket.id) {
      socket.emit('moveError', { message: 'Not your turn' });
      return;
    }

    try {
      const moveResult = await room.game.makeMove(socket.id, placedTiles);
      if (moveResult) {
        const gameState = room.game.getGameState();
        io.to(roomId).emit('boardUpdate', {
          board: gameState.board,
          lastMove: gameState.lastMove
        });
        
        room.players.forEach(player => {
          const playerState = gameState.players.find(p => p.id === player.id);
          if (playerState) {
            player.score = playerState.score;
          }
          if (player.id === socket.id) {
            const newTiles = room.game.getPlayerTiles(player.id);
            io.to(player.id).emit('tileUpdate', { newTiles });
          }
        });

        io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
        io.to(roomId).emit('turnUpdate', { currentPlayer: gameState.currentTurn });

        if (gameState.remainingTiles === 0) {
          const winner = room.players.reduce((prev, curr) => 
            prev.score > curr.score ? prev : curr
          );
          io.to(roomId).emit('gameEnd', { winner });
          room.started = false;
        }
      } else {
        socket.emit('moveError', { message: 'Invalid move - please check word placement' });
      }
    } catch (error) {
      console.error('Move error:', error);
      socket.emit('moveError', { message: 'An error occurred while validating your move' });
    }
  });


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

  socket.on('sendMessage', ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        const senderName = player.name || socket.id;
        io.to(roomId).emit('chatMessage', { senderId: socket.id, senderName, message });
      }
    }
  });

  socket.on('leaveRoom', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        socket.leave(roomId);
        io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
        if (socket.id === room.creatorId && room.players.length > 0) {
          room.creatorId = room.players[0].id;
          io.to(roomId).emit('creatorUpdate', room.creatorId);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
        if (socket.id === room.creatorId && room.players.length > 0) {
          room.creatorId = room.players[0].id;
          io.to(roomId).emit('creatorUpdate', room.creatorId);
        }
      }
    });
  });
});

async function startGame(roomId) {
  const room = rooms.get(roomId);
  while (room.players.length < 4) {
    room.players = addBotPlayers(room.players, 1);
    const newBot = room.players[room.players.length - 1];
    io.to(roomId).emit('chatMessage', {
      senderId: newBot.id,
      senderName: newBot.name,
      message: `${newBot.name} has joined the chat!`
    });
  }

  // Initialize game timer
  const startTime = Date.now();
  room.gameTimer = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const remainingSeconds = room.gameDuration - elapsedSeconds;
    
    if (remainingSeconds <= 0) {
      clearInterval(room.gameTimer);
      const winner = room.players.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
      io.to(roomId).emit('gameEnd', { winner });
      room.started = false;
    } else {
      io.to(roomId).emit('timeUpdate', { timeLeft: remainingSeconds });
    }
  }, 1000);

  io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
  room.started = true;
  io.to(roomId).emit('gameStarted');
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} - v1.0`);
});
