'use strict';

const codeGenerator = require('./generate-random-code');

const makeParticipant = function (name) {
	return {
		name: name
	};
}
/**
 * 
 * @param {String} sessionCode 
 * @param {String} topic 
 * @param {String} nameA 
 * @param {String} nameB 
 * @param {Number} duration 
 * @param {String} moderatorId 
 */
function Debate (sessionCode, topic, nameA, nameB, duration, moderatorId) {

	const __ = this;

	// sessionCode never changes
	// nameA never changes
	// nameB never changes
	// topic can be changed at any time
	__.topic = topic;

	__.sessionCode = sessionCode;

	// audience should be editable via the public interface of this class alone
	let audience = [];
	__.getAudience = function () {
		return audience.map(voter => voter.name);
	};

	// participants should be created on construction, but immutable for the duration of the debate
	let participantA = makeParticipant(nameA);
	let participantB = makeParticipant(nameB);
	let undecided = makeParticipant('Undecided');
	__.undecided = undecided;
	
	__.allowedDuration = duration || 10*60*1000;
	__.startTime = 0;
	__.started = false;
	__.completed = false;
	let timeoutInstance;

	__.getTimeRemaining = function () {
		return (__.startTime === 0) ? 
			__.allowedDuration :
			(__.startTime + __.allowedDuration) - Date.now();
	};

	__.getModeratorId = function () {
		return moderatorId;
	};

	function Voter (id, name) {
		const ___ = this;

		this.name = name;
		
		const voterId = id;
		___.getPrivateVoterId = function () {
			return voterId;
		};

		let votes = [];

		___.calculateVotes = function () {
			let totals = {};
			totals[participantA.name] = 0;
			totals[participantB.name] = 0;
			totals[undecided.name] = 0;

			votes.forEach((vote, i, arr) => {
				const endTime = typeof arr[i+1] !== 'undefined' ? arr[i+1].time : Date.now();
				totals[vote.opinion] += endTime - vote.time;
			});

			return totals;
		};

		___.placeVote = function (participant) {
			console.log('placeVote', participant);
			if (votes.length > 0 && participant === votes[votes.length-1].opinion) {
				console.log('voted for the same person');
				return false; // don't record spam
			}

			// This makes sure the debate is locked to ONLY when the debate is running.
			if (__.started && !__.completed) {
				switch (participant) {
					case participantA.name:
						votes.push({ 
							time: Date.now(), 
							opinion: participantA.name
						});
						break;
					case participantB.name:
						votes.push({ 
							time: Date.now(), 
							opinion: participantB.name
						});
						break;
					default:
						votes.push({ 
							time: Date.now(), 
							opinion: undecided.name
						});
						break;
				}

				return true;
			} else {
				return false;
			}

		};
	};

	__.calculateDebateResults = function () {
		let debateTotals = {
			participantA: {
				label: participantA.name,
				total: 0
			},
			participantB: {
				label: participantB.name,
				total: 0
			},
			undecided: {
				label: undecided.name,
				total: 0
			}
		};

		audience.forEach(voter => {
			const voterTotals = voter.calculateVotes();
			debateTotals.participantA.total += voterTotals[participantA.name];
			debateTotals.participantB.total += voterTotals[participantB.name];
			debateTotals.undecided.total += voterTotals[undecided.name];
		});

//		console.log(debateTotals);

		return debateTotals;
	};

	// Maybe this shouldn't be world accessable, but maybe you want to kill it early?
	__.endDebate = function (cb) {
		if (timeoutInstance) {
			clearTimeout(timeoutInstance);
		}

		// insert a final vote for nobody so we can measure 0ish time for that last point 
		// without complex case logic
		// can only do this BEFORE started has been marked "true".
		audience.forEach(voter => {
			voter.placeVote();
		});

		__.completed = true;

		console.log('the debate has ended');
		cb();
	};

	__.startDebate = function (cb) {
		__.startTime = Date.now();
		__.started = true;

		// loop through all the voters and start them out with a vote of undecided.
		// can only do this AFTER started has been marked "true".
		audience.forEach(voter => {
			voter.placeVote();
		});

		timeoutInstance = setTimeout(function() {
			__.endDebate(cb);
		}, __.allowedDuration);

		console.log('the debate has started');
	};

	__.getState = function () {
		console.log('There is ' + ((__.startTime + __.allowedDuration) - Date.now()) + ' ms left of ' + __.allowedDuration + ' ms in the debate');
		return __.state;
	};

	__.getParticipants = function (){
		return [nameA, nameB];
	};

	__.addVoter = function (joinCode, name, userId) {
		if (sessionCode === joinCode) {
			const voter = new Voter(userId, name);
			audience.push(voter);
			return voter;
		} else {
			console.log('nah, fam. bogus session code');
			return false;
		}
	};

	__.getVoterByName = function (name) {
		const voter = audience.filter(v => v.name === name);
		return voter.length > 0 ? voter[0] : null;
	};

	__.getVoterById = function (id) {
		const results = audience.filter(voter => voter.getPrivateVoterId() === id);
		return results.length > 0 ? results[0] : null;
	}	
};

module.exports = {
	createDebate: function (sessionCode, topic, nameA, nameB, duration, userId) {
		return new Debate(sessionCode, topic, nameA, nameB, duration, userId);
	}
};