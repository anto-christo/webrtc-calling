const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

io.on('connection', function (socket) {
    socket.on('create', function (callback) {
        console.log('created', socket.id);
        callback(socket.id);
    });

    socket.on('ready', function (room) {
        socket.broadcast.to(room).emit('ready');
    });

    socket.on('candidate', function (event) {
        socket.broadcast.to(event.room).emit('candidate', event);
    });

    socket.on('offer', function (event) {
        socket.broadcast.to(event.room).emit('offer', event.sdp);
    });

    socket.on('answer', function (event) {
        socket.broadcast.to(event.room).emit('answer', event.sdp);
    });

});

http.listen(3000, function () {
    console.log('listening on *:3000');
});