var $ = window.$;
var TweenMax = window.TweenMax;
var Elastic = window.Elastic;
var Howl = window.Howl;

var win = function () { 
	window.youWon();
};

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

	var applauseSound = new Howl({
		src: ['/images/SMALL_CROWD_APPLAUSE-Yannick_Lemieux-1268806408.mp3']
	});

	var largeApplauseSound = new Howl({
		src: ['/images/Audience_Applause-Matthiew11-1206899159.mp3']
	});

	var airhornSound = new Howl({
		src: ['/images/air.mp3']
	});

	var booSound = new Howl({
		src: ['/images/Crowd-Boo-1-SoundBible.com-183064743.mp3']
	});

	// var kidLaughingSound = new Howl({
	// 	src: ['/images/SMALL_CROWD_APPLAUSE-Yannick_Lemieux-1268806408.mp3']
	// });

	// var yeySound = new Howl({
	// 	src: ['/images/1_person_cheering-Jett_Rifkin-1851518140.mp3']
	// });

	// Put some toys on the hold screen
	$('#twiddle').click(evt => {
		airhornSound.play();
	});

	var A = $('#voteForA'),
		B = $('#voteForB'),
		C = $('#undecided');

	var resetButtonStyles = () => {
		A.removeClass('button-primary');
		B.removeClass('button-primary');
		C.removeClass('button-primary');
	};

	var handleClick = (target) => {
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

	var bindHandlers = () => {
		A.on('click', evt => handleClick(A) );
		B.on('click', evt => handleClick(B) );
		C.on('click', evt => handleClick(C) );
	};
	
	var unbindHandlers = () => {
		A.unbind();
		B.unbind();
		C.unbind();
	};
	
	var requestInitialStatus = () => {
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

	var toggleState = (state) => {
		states.forEach( state => stateRefs[state].hide() );
		stateRefs[state].show();
	};

	var closeHandler = (evt) => {
		console.log('Session closed', evt);
		errorHandler();
	};

	socket.addEventListener('close', closeHandler);

	socket.addEventListener('open', (evt) => {
		console.log('open', evt);
		requestInitialStatus();
	});

	var flip = function () {  
		if (Math.floor(Math.random() * 2) === 0){
			return largeApplauseSound;
		} else {
			return applauseSound;
		}
	};

	var totals = { A: 0, B: 0 };

	var showTotals = function (oA, oB, oC) {
		var grandTotal = parseInt(oA.total,10) + parseInt(oB.total,10) + parseInt(oC.total,10);

		return '<table style="width:80%">'+
			'<tr>'+
				'<td>'+oA.label+'</td>'+
				'<td>'+Math.round((oA.total/grandTotal)*100)+'%</td>'+
			'</tr>'+
			'<tr>'+
				'<td>'+oB.label+'</td>'+
				'<td>'+Math.round((oB.total/grandTotal)*100)+'%</td>'+
			'</tr>'+
			'<tr>'+
				'<td>'+oC.label+'</td>'+
				'<td>'+Math.round((oC.total/grandTotal)*100)+'%</td>'+
			'</tr>'+
		'<table>'
	};

	var animateWinnerIn = function (details) {
		var winner,
			isItATie = false;
		
		if (totals['A'] > totals['B']) {
			winner = A.text()+' wins!';
		} else if (totals['A'] < totals['B']) {
			winner = B.text()+' wins!';
		} else {
			winner = 'It\'s a tie!';
			isItATie = true;
		}

		$(document.body).css({ position: 'relative' });

		$('#page').hide();
		$('.wrapper')
			.css({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 })
			.html(
				'<div style="width:40%;margin-top:20%;text-align:center;margin-left:30%;margin-right:30%;">' +
					'<h2 id="winner" style="text-align:center;">' +
					winner +
					'</h2>' +
					'<br>' +
					'<br>' +
					showTotals(details.participantA, details.participantB, details.undecided) +
				'</div>'
			);

		if (!isItATie) {
			flip().play();
		} else {
			booSound.play();
		}
	
		var tween = TweenMax.fromTo(
			document.querySelector('#winner'), // target
			2, // seconds
			// from vars
			{
				'font-size': '0.1em',
				opacity: '0'
			},
			// to vars
			{
				'font-size': '3em',
				opacity: '1',
				ease: Elastic.easeOut,
				onComplete: () => {
					if (!isItATie) {
						win();
					}
				}
			}
		);
	};

	// Listen for messages
	socket.addEventListener('message', (msgEvt) => {
		console.log(msgEvt);
		if (msgEvt.data) {
			var event = JSON.parse(msgEvt.data);

			console.log(event);

			switch (event.type) {
				case 'start':
					toggleState('live');
					bindHandlers();
					break;

				case 'end':
					toggleState('over');
//					console.log(event.data.results);
					unbindHandlers();
					
					animateWinnerIn(event.data.results);
					
					socket.removeEventListener('close', closeHandler);
					socket.close();
					break;

				case 'pending':
					toggleState('pending');
					break;

				case 'voter-update':
					var chartData = event.data.chartData;
					totals['A'] = chartData.participantA.total;
					totals['B'] = chartData.participantB.total;

					var debateDetails = event.data.debateDetails;
					var secondsRemaining = Math.round(
						debateDetails.timeRemaining / 1000
					);

					break;
				default:
					console.log('Unknown event received', msgEvt);
					break;
			}
		}
	});

});
