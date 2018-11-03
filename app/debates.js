'use strict';

const codeGenerator = require('./generate-random-code');

const makeParticipant = function (name) {
	return {
		name: name,
		speaking: false
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

	console.log('sessionCode, topic, nameA, nameB, duration, moderatorId', sessionCode, topic, nameA, nameB, duration, moderatorId);

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

	__.findVoterByPrivateId = function (privateId) {
		const results = audience.filter(voter => voter.getPrivateVoterId() === privateId);
		return results.length > 0 ? results[0] : null;
	}
	
	// participants should be created on construction, but immutable for the duration of the debate
	let participantA = makeParticipant(nameA);
	let participantB = makeParticipant(nameB);
	let undecided = 'Undecided';
	__.undecided = undecided;
	
	let allowedDuration = duration || 10*60*1000;
	let startTime = 0;
	__.started = false;
	__.completed = false;
	let timeoutInstance;

	__.getTimeRemaining = function () {
		return (startTime === 0) ? 
			allowedDuration :
			(startTime + allowedDuration) - Date.now();
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
			totals[undecided] = 0;

			votes.forEach((v, i, arr) => {
				const endTime = typeof arr[i+1] !== 'undefined' ? arr[i+1].time : Date.now();
				totals[v.name] = endTime - v.time;
			});

			return totals;
		};

		___.placeVote = function (participant) {

			if (votes.length > 0 && participant === votes[votes.length-1].vote.name) {
				return false; // don't record spam
			}

			if (__.started && !__.completed) {
				switch (participant) {
					case participantA.name:
						votes.push({ 
							time: Date.now(), 
							vote: participantA
						});
						break;
					case participantB.name:
						votes.push({ 
							time: Date.now(), 
							vote: participantB
						});
						break;
					default:
						votes.push({ 
							time: Date.now(), 
							vote: undecided
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
				label: undecided,
				total: 0
			}
		};

		audience.forEach(voter => {
			const voterTotals = voter.calculateVotes();
			debateTotals.participantA.total += voterTotals[participantA.name];
			debateTotals.participantB.total += voterTotals[participantB.name];
			debateTotals.undecided.total += voterTotals[undecided];
		});

		return debateTotals;
	};

	// Maybe this shouldn't be world accessable, but maybe you want to kill it early?
	__.endDebate = function (cb) {
		if (timeoutInstance) {
			clearTimeout(timeoutInstance);
		}
		__.completed = true;

		// insert a final vote for nobody so we can measure 0ish time for that last point 
		// without complex case logic
		audience.forEach(voter => {
			voter.placeVote();
		});

		console.log('the debate has ended');
		cb();
	};

	__.startDebate = function (cb) {
		startTime = Date.now();
		__.started = true;

		// loop through all the voters and start them out with a vote of undecided
		audience.forEach(voter => {
			voter.placeVote();
		});

		timeoutInstance = setTimeout(function() {
			clearInterval(interval);
			__.endDebate(cb);
		}, allowedDuration);

		// debuggy stuff
		let interval = setInterval(function () {
			console.log('Time left in debate ',sessionCode , (startTime+allowedDuration) - Date.now());
		}, 1000);
		console.log('the debate has started');
	};

	__.getState = function () {
		console.log('There is ' + ((startTime + allowedDuration) - Date.now()) + ' ms left of ' + allowedDuration + ' ms in the debate');
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
		const voter = audience.filter(v => v.getPrivateVoterId() === id);
		return voter.length > 0 ? voter[0] : null;
	};
};

module.exports = {
	createDebate: function (sessionCode, topic, nameA, nameB, duration, userId) {
		return new Debate(sessionCode, topic, nameA, nameB, duration, userId);
	}
};