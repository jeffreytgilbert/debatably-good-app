

var errorHandler = function () {
	$('#page').hide().after(
		'<h1>Your connection to the debate server has been lost. '+
		'Please refresh page.</h1>'
	);
};

document.addEventListener("DOMContentLoaded", function() {

	// Create WebSocket connection.
	const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
	const socket = new WebSocket(protocol+'//'+location.host);

	window['debugSocket'] = socket;

	var bindHandlers = function () {
		// TODO add styles for enabled and stuff
		$('#voteForA').on('click',(evt) => {
			console.log('Got a click on participant A', $(this).text());
			var participant = {
				"type":"vote",
				"data":{
					"participant": $('#voteForA').text()
				}
			};
			socket.send(JSON.stringify(participant));
		});
	
		$('#voteForB').on('click',(evt) => {
			console.log('Got a click on participant B', $(this).text());
			var participant = {
				"type":"vote",
				"data":{
					"participant": $('#voteForB').text()
				}
			};
			socket.send(JSON.stringify(participant));
		});
	
		$('#undecided').on('click',(evt) => {
			console.log('Got a click on undecided', $(this).text());
			var participant = {
				"type":"vote",
				"data":{
					"participant": $('#undecided').text()
				}
			};
			socket.send(JSON.stringify(participant));
		});
	};
	
	var unbindHandlers = function () {
		// TODO add styles for disabled and stuff
		$('#voteForA').unbind();
		$('#voteForB').unbind();
		$('#undecided').unbind();
	};
	
	var requestInitialStatus = function () {
		var request = {
			"type":"voter-check-in"
		};
		socket.send(JSON.stringify(request));
	};

	// Listen for messages
	socket.addEventListener('message', (msgEvt) => {
		console.log('got a message');
		if (msgEvt.data) {
			var event = JSON.parse(msgEvt.data);
			console.log(event);
			switch (event.type) {
				case 'start':
					console.log('updating user stuff to start/unlock');
					bindHandlers();
					$('#sessionIsPending').addClass('hidden');
					$('#sessionIsLive').removeClass('hidden');
					$('#sessionOver').addClass('hidden');
					break;
				case 'end':
					console.log('updating user stuff to end/lock');
					unbindHandlers();
					$('#sessionIsPending').addClass('hidden');
					$('#sessionIsLive').addClass('hidden');
					$('#sessionOver').removeClass('hidden');
					break;
				case 'pending':
					console.log('got pending as the status');
					$('#sessionIsPending').removeClass('hidden');
					$('#sessionIsLive').addClass('hidden');
					$('#sessionOver').addClass('hidden');
					break;
				default:
					console.log('Unknown event received', msgEvt);
					break;
			}
		}
		console.log('Message from server ', event.data);
	});

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
});
