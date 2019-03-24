let socket = io();

let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");
let audio = document.getElementById("audio");
let video = document.getElementById("video");

let localStream;
let remoteStream;
let rtcPeerConnection;
let iceServers = {
    'iceServers': [{
            'url': 'stun:stun.services.mozilla.com'
        },
        {
            'url': 'stun:stun.l.google.com:19302'
        }
    ]
}

const streamConstraints = {
    video: true,
    audio: true
};

let isCaller = false;

let caller = null;
let receiver = null;

$(document).ready(function () {
    showHome();

    $('#createBtn').click(function() {
        showCreate();
    });

    $('#joinBtn').click(function() {
        showJoin();
    });

    //---------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------

    socket.emit('create', function (res) {
        $('#secret_code').val(res);
        caller = res;
    });

    $('#startCallBtn').click(function() {
        // showCallScreen();
        navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
            addLocalStream(stream);
            isCaller = true;
        }).catch(function (err) {
            console.log('An error ocurred when accessing media devices', err);
        });
    });

    socket.on('ready', function(code) {
        console.log('receiver ready');
        receiver = code;
        createPeerConnection();
        let offerOptions = {
            offerToReceiveAudio: 1
        }
        rtcPeerConnection.createOffer(offerOptions)
            .then(desc => setLocalAndOffer(desc))
            .catch(e => console.log(e));
    });

    //---------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------

    $('#joinCallBtn').click(function() {
        const code = $('#secret_code').val();
        navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
            addLocalStream(stream);
            socket.emit('join', code);
        }).catch(function (err) {
            console.log('An error ocurred when accessing media devices', err);
        });
    });
});

function showHome() {
    $('#home').show();
    $('#create').hide();
    $('#join').hide();
}

function showCreate() {
    $('#home').hide();
    $('#create').show();
    $('#join').hide();
}

function showJoin() {
    $('#home').hide();
    $('#create').hide();
    $('#join').show();
}

// var socket = io();

// initiateCall();

// audio.onclick = function(){
//     toggleAudio();
// };
// video.onclick = function(){
//     toggleVideo();
// // };

// function initiateCall() {
//     streamConstraints = {
//         video: true,
//         audio: true
//     }
//     socket.emit('create or join', roomName);
// }

// socket.on('created', function (room) {
//     navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
//         addLocalStream(stream);
//         isCaller = true;
//     }).catch(function (err) {
//         console.log('An error ocurred when accessing media devices', err);
//     });
// });

// socket.on('joined', function (room) {
//     navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
//         addLocalStream(stream);
//         socket.emit('ready', roomName);
//     }).catch(function (err) {
//         console.log('An error ocurred when accessing media devices', err);
//     });
// });

socket.on('candidate', function (event) {
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    rtcPeerConnection.addIceCandidate(candidate);
});

// socket.on('ready', function () {
//     if (isCaller) {
//         createPeerConnection();
//         let offerOptions = {
//             offerToReceiveAudio: 1
//         }
//         rtcPeerConnection.createOffer(offerOptions)
//             .then(desc => setLocalAndOffer(desc))
//             .catch(e => console.log(e));
//     }
// });

socket.on('offer', function (event) {
    createPeerConnection();
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
    rtcPeerConnection.createAnswer()
        .then(desc => setLocalAndAnswer(desc))
        .catch(e => console.log(e));
});

socket.on('answer', function (event) {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
})

function onIceCandidate(event) {
    let id = isCaller ? receiver: caller;
    if (event.candidate) {
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            sendTo: id
        })
    }
}

function onAddStream(event) {
    remoteVideo.srcObject = event.stream;
    remoteStream = event.stream;
}

function setLocalAndOffer(sessionDescription) {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('offer', {
        type: 'offer',
        sdp: sessionDescription,
        receiver: receiver
    });
}

function setLocalAndAnswer(sessionDescription) {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('answer', {
        type: 'answer',
        sdp: sessionDescription,
        caller: caller
    });
}

function addLocalStream(stream) {
    localStream = stream;
    localVideo.srcObject = stream;
}

function createPeerConnection() {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.onaddstream = onAddStream;
    rtcPeerConnection.addStream(localStream);
}