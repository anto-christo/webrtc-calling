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
    video: {
        width: {
            min: '640',
            max: '640'
        },
        height: {
            min: '480',
            max: '480'
        }
    },
    audio: true
};

let isCaller = false;

let caller = null;
let receiver = null;

$(document).ready(function () {
    showHome();
    $('#startBtn').click(function () {
        socket.emit('create', function (res) {
            console.log('send create');
            $('#caller_code').val(res);
            caller = res;
            showCreate();
            UIkit.tooltip('#caller_code').show();
            navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
                addLocalStream(stream);
                isCaller = true;
            }).catch(function (err) {
                console.log('An error ocurred when accessing media devices', err);
            });
        });
    });

    $('#joinBtn').click(function () {
        showJoin();
        UIkit.tooltip('#caller_code').show();
    });

    //---------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------

    $('#startCallBtn').click(function () {
        showCallScreen();
    });

    socket.on('ready', function (code) {
        console.log('receiver ready at', code);
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

    $('#joinCallBtn').click(function () {
        showCallScreen();
        const code = $('#join_code').val();
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
    $('#call').hide();
}

function showCreate() {
    $('#home').hide();
    $('#create').show();
    $('#join').hide();
    $('#call').hide();
}

function showJoin() {
    $('#home').hide();
    $('#create').hide();
    $('#join').show();
    $('#call').hide();
}

function showCallScreen() {
    $('#home').hide();
    $('#create').hide();
    $('#join').hide();
    $('#call').show();
}

socket.on('candidate', function (event) {
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    rtcPeerConnection.addIceCandidate(candidate);
});

socket.on('offer', function (param) {
    caller = param.caller;
    createPeerConnection();
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(param.event));
    rtcPeerConnection.createAnswer()
        .then(desc => setLocalAndAnswer(desc))
        .catch(e => console.log(e));
});

socket.on('answer', function (event) {
    console.log(event);
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
})

function onIceCandidate(event) {
    let id = isCaller ? receiver : caller;
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
    console.log('sending offer to', receiver);
    socket.emit('offer', {
        type: 'offer',
        sdp: sessionDescription,
        receiver: receiver
    });
}

function setLocalAndAnswer(sessionDescription) {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    console.log('sending answer to ', caller);
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