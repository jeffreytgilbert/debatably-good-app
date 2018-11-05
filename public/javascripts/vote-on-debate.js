var $ = window.$;

// TODO http://loov.io/jsfx/ <-- add this for randomness on the waiting screen

var errorHandler = function () {
	$('#page').hide().after(
		'<h3>Your connection to the debate has been lost. <br>'+
		'Please refresh page to continue.</h3>'
	);
};

var sessionCode;

$(function() {

	sessionCode = $('#sessionCode').text();

	// Create WebSocket connection.
	var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
	var socket = new WebSocket(protocol+'//'+location.host+'/vote-on-debate/?sessionCode='+sessionCode);

	window['debugSocket'] = socket;

	var A = $('#voteForA'),
		B = $('#voteForB'),
		C = $('#undecided');

	var resetButtonStyles = function () {
		A.removeClass('button-primary');
		B.removeClass('button-primary');
		C.removeClass('button-primary');
	};

	var handleClick = function (target) {
		var participant = {
			'type':'vote',
			'data':{
				'participant': target.text()
			}
		};

		resetButtonStyles();
		target.addClass('button-primary');
		socket.send(JSON.stringify(participant));
	};

	var bindHandlers = function () {
		A.on('click', evt => handleClick(A) );
		B.on('click', evt => handleClick(B) );
		C.on('click', evt => handleClick(C) );
	};
	
	var unbindHandlers = function () {
		A.unbind();
		B.unbind();
		C.unbind();
	};
	
	var requestInitialStatus = function () {
		var request = {
			'type':'voter-check-in'
		};
		socket.send(JSON.stringify(request));
	};

	var states = ['pending', 'live', 'over'];
	var stateRefs = {
		'pending': $('#sessionIsPending'),
		'live': $('#sessionIsLive'),
		'over': $('#sessionOver')
	};

	var toggleState = function (state) {
		states.forEach( state => stateRefs[state].hide() );
		stateRefs[state].show();
	};

	socket.addEventListener('close', (evt) => {
		console.log('Session closed', evt);
		errorHandler();
	});

	socket.addEventListener('error', (errEvt) => {
		console.log('error', errEvt);
		errorHandler();
	});

	socket.addEventListener('open', (evt) => {
		console.log('open', evt);
		requestInitialStatus();
	});

	// Listen for messages
	socket.addEventListener('message', (msgEvt) => {
		if (msgEvt.data) {
			var event = JSON.parse(msgEvt.data);

			switch (event.type) {
				case 'start':
					toggleState('live');
					bindHandlers();
					break;
				case 'end':
					toggleState('over');
					unbindHandlers();
					break;
				case 'pending':
					toggleState('pending');
				break;
				default:
					console.log('Unknown event received', msgEvt);
					break;
			}
		}
	});

});
