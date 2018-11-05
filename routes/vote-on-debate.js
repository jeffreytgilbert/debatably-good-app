'use strict';

const express = require('express');
const router = express.Router();
const asm = require('../app/application-state-manager');

router.get('/', function(req, res, next) {
	const session = req.session;

	// Don't do anything unless we're sure this person has a session that's saving
	if (session.userId) {
		if (req.query.sessionCode) {
			const sessionCode = req.query.sessionCode;
			const debate = asm.get(req.query.sessionCode);
			if (debate) {
				const debateRole = session.activeDebates[sessionCode];
				if (debateRole && debateRole.isVoter) {
					let voter = debate.getVoterById(debateRole.voterId);
					if (voter) {
						res.render('vote-on-debate', {
							title: debate.topic,
							sessionCode: sessionCode,
							participantA: debate.getParticipants()[0],
							participantB: debate.getParticipants()[1],
							undecided: debate.undecided.name,
							voterName: voter.name
						});
					} else {
						res.redirect(302, '/?issue=missing-voter-registration');
					}
				} else {
					res.redirect(302, '/?issue=session-role-missing');
				}
			} else {
				res.redirect(302, '/?issue=debate-not-found');
			}
		} else {
			res.redirect(302, '/?issue=missing-info');
		}
	} else {
		res.redirect(302, '/?issue=missing-session');
	}
});

module.exports = router;
