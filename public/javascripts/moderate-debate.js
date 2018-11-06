var $ = window.$;
var TweenMax = window.TweenMax;
var Elastic = window.Elastic;
var Howl = window.Howl;

var win = function () { 
	window.youWon();
};

var errorHandler = function() {
	$('#page')
		.hide()
		.after(
			'<h1>Your connection to the debate server has been lost. <br>' +
				'Please refresh the page.</h1>'
		);
};

var goodjobSound = new Howl({
	src: ['/images/good.mp3']
});

var kickoffSound = new Howl({
	src: ['/images/nfl.mp3']
});

var sadSound = new Howl({
	src: ['/images/Sad_Trombone-Joe_Lamb-665429450.mp3']
});

var aBar = document.querySelector('#aBar');
var bBar = document.querySelector('#bBar');
var cBar = document.querySelector('#cBar');

var total = 0.001; //protect from div/0
var aVote = 0.0;
var bVote = 0.0;
var cVote = 0.0;

var scalar = 1;
var easing = 0.85;

var reset = () => {
	total = 0.001; //protect from div/0
	aVote = 0.0;
	bVote = 0.0;
	cVote = 0.0;
};

var onVote = (voteA, voteB, voteC, time, duration) => {
	aVote = parseFloat(voteA);
	bVote = parseFloat(voteB);
	cVote = parseFloat(voteC);
	total = duration;
};

var scaleBars = (bar, votes) => {
	var curScale = bar.getAttribute('scale');
	var curPos = bar.getAttribute('position');
	var mag = Math.sqrt(votes * votes + total * total);
	var targetY = (Math.sqrt(votes * votes) / mag) * scalar * easing;
	if (isNaN(curScale.y)) curScale.y = 0.01;
	curScale.y = (curScale.y + targetY) * easing;
	curPos.y = curScale.y * 0.5 + 0.01;
	bar.setAttribute('scale', curScale);
	bar.setAttribute('position', curPos);
};

var quitFlag = null;

var renderLoop = () => {
	scaleBars(aBar, aVote);
	scaleBars(bBar, bVote);
	scaleBars(cBar, cVote);
	quitFlag || requestAnimationFrame(renderLoop);
};

$(function() {
	sessionCode = $('#audienceCode').text();
	// prep the stats so they don't barf onload
	onVote(1, 1, 1, 1, 1);
	renderLoop();

	// Create WebSocket connection.
	var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
	var socket = new WebSocket(
		protocol +
			'//' +
			location.host +
			'/moderate-debate/?sessionCode=' +
			sessionCode
	);

	window['debugSocket'] = socket;

	$('#joinLocation').text(' ' + location.host + ' ');

	var handleSocketClosed = evt => {
		console.log('Session closed', evt);
		errorHandler();
	};

	var handleSocketError = errEvt => {
		console.log('error', errEvt);
		errorHandler();
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

	var animateWinnerIn = function(details) {
		var winner,
			isItATie = false;

		if (totals['A'] > totals['B']) {
			winner = $('#opinionA').text()+' wins!';
		} else if (totals['A'] < totals['B']) {
			winner = $('#opinionB').text()+' wins!';
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
					'<h1 id="winner">' +
					winner +
					'</h1>' +
					'<br>' +
					'<br>' +
					showTotals(details.participantA, details.participantB, details.undecided) +
				'</div>'
			);

		quitFlag = true;

		if(!isItATie) {
			goodjobSound.play();
		} else {
			sadSound.play();
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
				'font-size': '6em',
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
	socket.addEventListener('message', msgEvt => {
		if (msgEvt.data) {
			var event = JSON.parse(msgEvt.data);

			switch (event.type) {
				case 'moderator-update':
					var audience = event.data.audience;
					$('#audience').html('<li>' + audience.join('</li><li>') + '</li>');

					// expected format is {started:bool, completed:bool, timeRemaining:ms}
					var debateDetails = event.data.debateDetails;
					if (debateDetails.completed) {
						var button = $('#startDebate:visible');
						if (button) {
							button.hide();
						}
					} else if (!debateDetails.started) {
						var button = $('#startDebate:hidden');
						if (button) {
							button.show();
						}
					} else {
						var button = $('#startDebate:visible');
						if (button) {
							button.hide();
						}

						var chartData = event.data.chartData;
						// expected line data format:
						// var lineData = { time: time, participantA: 1-10, participantB: 1-10, undecided: 1-10 };
						totals['A'] = chartData.participantA.total;
						totals['B'] = chartData.participantB.total;
						onVote(
							chartData.participantA.total,
							chartData.participantB.total,
							chartData.undecided.total,
							debateDetails.timeRemaining,
							debateDetails.allowedDuration
						);

						var secondsRemaining = Math.round(
							debateDetails.timeRemaining / 1000
						);
						if (secondsRemaining < 1) {
							$('#timeRemaining').text('Done! Fin!');

							var request = {
								type: 'close-debate'
							};
							socket.removeEventListener('close', handleSocketClosed);
							socket.removeEventListener('error', handleSocketError);
							socket.send(JSON.stringify(request));
							socket.close();
							animateWinnerIn(chartData);
						} else {
							$('#timeRemaining')
								.removeClass('hidden')
								.text(secondsRemaining + ' seconds remaining.');
						}
					}

					break;
				default:
					console.log('Unknown event received', msgEvt);
					break;
			}
		}
	});

	socket.addEventListener('close', handleSocketClosed);
	socket.addEventListener('error', handleSocketError);

	var startDebateButton = $('#startDebate');

	startDebateButton.on('click', () => {
		startDebateButton.unbind().remove();

		kickoffSound.on('end', () => {
			socket.send('{"type":"start-session"}');
		});

		kickoffSound.play();
	});
});
