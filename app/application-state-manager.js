'use strict';

let debateAppIndex = {};
const createDebate = require('./debates').createDebate;

const asm = {
	add: function (sessionCode, topic, nameA, nameB, duration, userId) {
		debateAppIndex[sessionCode] = createDebate(sessionCode, topic, nameA, nameB, duration, userId);
		return debateAppIndex[sessionCode];
	},

	get: function (sessionCode) {
		return debateAppIndex[sessionCode];
	},

	deleteAllDebatesForThisModerator: function (userId) {
		let sessionsRemoved = [];
		for (let sessionCode in debateAppIndex) {
			let debate = debateAppIndex[sessionCode];
			if (debate.getModeratorId() === userId) {
				sessionsRemoved.push(sessionCode);
				asm.delete(sessionCode);
			}
		}
		return sessionsRemoved;
	},

	// get debates that are running but not completed.
	getRunningSessions: function () {
		let runningDebates = [];
		for (let sessionCode in debateAppIndex) {
			let debate = debateAppIndex[sessionCode];
//			console.log('checking for debates', debate.started, debate.completed, JSON.stringify(debate));
// this disables me from seeing updates to the audience and stuff before the debate starts.
//			if (debate.started && !debate.completed) { 
//				console.log('found a running debate');
				runningDebates.push(debate);
//			}
		}
		return runningDebates;
	},

	delete: function (sessionCode) {
		if (debateAppIndex[sessionCode]) {
			delete debateAppIndex[sessionCode];
			return true;
		} else {
			return false;
		}
	},

	clear: function () {
		debateAppIndex = {};
		return true;
	}
};

module.exports = asm;