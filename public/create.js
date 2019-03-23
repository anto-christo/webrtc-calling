$(document).ready(function () {
    let socket = io();
    socket.emit('create', function (res) {
        $('#secret_code').val(res);
    });
});