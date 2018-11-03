document.addEventListener("DOMContentLoaded", function() {

	// Create WebSocket connection.
	const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
	const socket = new WebSocket(protocol+'//'+location.host);

	window['debugSocket'] = socket;

	socket.addEventListener('open', (evt) => {
		// if you're starting a new debate, that indicates that the old ones are completed.
		socket.send('{"type":"close-any-existing-debates"}');
	});

});