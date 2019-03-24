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

    socket.on('join', function (code) {
        io.to(code).emit('ready', socket.id);
    });

    socket.on('candidate', function (event) {
        io.to(event.sendTo).emit('candidate', event);
    });

    socket.on('offer', function (event) {
        io.to(event.receiver).emit('offer', event.sdp);
    });

    socket.on('answer', function (event) {
        io.to(event.caller).emit('answer', event.sdp);
    });

});

http.listen(3000, function () {
    console.log('listening on *:3000');
});