var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");
var audio = document.getElementById("audio");
var video = document.getElementById("video");
var full = document.getElementById("full");


var roomName = 'webrtc-room';
var localStream;
var remoteStream;
var rtcPeerConnection;
var iceServers = {
    'iceServers': [{
            'url': 'stun:stun.services.mozilla.com'
        },
        {
            'url': 'stun:stun.l.google.com:19302'
        }
    ]
}

var streamConstraints;
var isCaller;

var socket = io();

initiateCall();

audio.onclick = function(){
    toggleAudio();
};
video.onclick = function(){
    toggleVideo();
};
full.onclick = function(){
    goFull();
};

function initiateCall() {
    streamConstraints = {
        video: true,
        audio: true
    }
    socket.emit('create or join', roomName);
}

socket.on('created', function (room) {
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        addLocalStream(stream);
        isCaller = true;
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
});

socket.on('joined', function (room) {
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        addLocalStream(stream);
        socket.emit('ready', roomName);
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
});

socket.on('candidate', function (event) {
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    rtcPeerConnection.addIceCandidate(candidate);
});

socket.on('ready', function () {
    if (isCaller) {
        createPeerConnection();
        let offerOptions = {
            offerToReceiveAudio: 1
        }
        rtcPeerConnection.createOffer(offerOptions)
            .then(desc => setLocalAndOffer(desc))
            .catch(e => console.log(e));
    }
});

socket.on('offer', function (event) {
    if (!isCaller) {
        createPeerConnection();
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
        rtcPeerConnection.createAnswer()
            .then(desc => setLocalAndAnswer(desc))
            .catch(e => console.log(e));
    }
});

socket.on('answer', function (event) {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
})

function onIceCandidate(event) {
    if (event.candidate) {
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomName
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
        room: roomName
    });
}

function setLocalAndAnswer(sessionDescription) {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('answer', {
        type: 'answer',
        sdp: sessionDescription,
        room: roomName
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

function toggleAudio() {
    localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled
}

function toggleVideo() {
    localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled
}

function goFull() {
    remoteVideo.mozRequestFullScreen();
}