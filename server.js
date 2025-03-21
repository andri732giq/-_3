const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Перевірка статичної папки
app.use(express.static(__dirname + '/public'));

// Зберігання користувачів та повідомлень
const users = {};
const messages = [];

io.on('connection', (socket) => {
    console.log('Користувач підключився:', socket.id);

    socket.on('register', (username) => {
        if (username && typeof username === 'string') {
            users[socket.id] = username;
            socket.broadcast.emit('user-connected', username);
            io.emit('update-users', Object.values(users));
            socket.emit('chat-history', messages);
        }
    });

    socket.on('chat-message', (msg) => {
        if (msg && users[socket.id]) {
            const message = {
                username: users[socket.id],
                text: msg,
                time: new Date().toLocaleTimeString()
            };
            messages.push(message);
            io.emit('chat-message', message);
        }
    });

    socket.on('private-message', ({ to, message }) => {
        if (to && message && users[socket.id]) {
            const recipientId = Object.keys(users).find(id => users[id] === to);
            if (recipientId) {
                io.to(recipientId).emit('private-message', {
                    from: users[socket.id],
                    text: message
                });
            }
        }
    });

    socket.on('join-room', (room) => {
        if (room) {
            socket.join(room);
            socket.emit('room-joined', room);
        }
    });

    socket.on('room-message', ({ room, message }) => {
        if (room && message && users[socket.id]) {
            io.to(room).emit('chat-message', {
                username: users[socket.id],
                text: message,
                time: new Date().toLocaleTimeString()
            });
        }
    });

    socket.on('disconnect', () => {
        const username = users[socket.id];
        if (username) {
            delete users[socket.id];
            socket.broadcast.emit('user-disconnected', username);
            io.emit('update-users', Object.values(users));
        }
    });
});

server.listen(3000, () => {
    console.log('Сервер запущено на порту 3000');
});