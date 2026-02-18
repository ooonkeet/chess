const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('Chess Backend is Running');
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('create_room', (preferredColor) => {
    let roomId;
    // Ensure the room ID is unique to prevent double booking
    do {
      roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (rooms.has(roomId));

    const color = preferredColor === 'black' ? 'black' : 'white';

    rooms.set(roomId, { players: [socket.id], colors: { [socket.id]: color } });
    socket.join(roomId);
    socket.emit('room_created', { roomId, color });
    console.log(`Room created: ${roomId} with color ${color}`);
  });

  socket.on('join_room', (roomId) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      if (room.players.length < 2) {
        room.players.push(socket.id);
        
        const firstPlayerId = room.players[0];
        const firstPlayerColor = room.colors[firstPlayerId];
        const joinerColor = firstPlayerColor === 'white' ? 'black' : 'white';
        room.colors[socket.id] = joinerColor;

        socket.join(roomId);
        socket.emit('room_joined', { roomId, color: joinerColor });
        io.to(roomId).emit('game_start', { roomId });
        console.log(`User joined room: ${roomId}`);
      } else {
        socket.emit('error', 'Room is full');
      }
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('move', (data) => {
    // Broadcast move to the other player in the room
    socket.to(data.roomId).emit('receive_move', data);
  });

  socket.on('send_message', (data) => {
    io.to(data.roomId).emit('receive_message', data);
  });

  socket.on('request_rematch', (roomId) => {
    socket.to(roomId).emit('rematch_request_received');
  });

  socket.on('accept_rematch', (roomId) => {
    io.to(roomId).emit('game_reset');
  });

  socket.on('reject_rematch', (roomId) => {
    socket.to(roomId).emit('rematch_rejected');
  });

  socket.on('timeout', (data) => {
    io.to(data.roomId).emit('receive_timeout', data);
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected', socket.id);
    // Optional: Handle cleanup if a user leaves mid-game
    rooms.forEach((value, key) => {
      if (value.players.includes(socket.id)) {
        io.to(key).emit('opponent_disconnected');
        rooms.delete(key);
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
