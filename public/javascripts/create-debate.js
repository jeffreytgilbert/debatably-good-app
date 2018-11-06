document.addEventListener("DOMContentLoaded", function() {

	// Create WebSocket connection.
	const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
	const socket = new WebSocket(protocol+'//'+location.host+'/create-debate/');

	window['debugSocket'] = socket;

	socket.addEventListener('open', (evt) => {
		// if you're starting a new debate, that indicates that the old ones are completed.
		socket.send('{"type":"close-any-existing-debates"}');
	});

	// TODO make sure Option A and Option B cannot be equivalent, otherwise you get a runtime oddity where the result is always a tie.

});