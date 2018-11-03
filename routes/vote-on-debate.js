'use strict';

const express = require('express');
const router = express.Router();
const asm = require('../app/application-state-manager');

router.get('/', function(req, res, next) {

	if (req.session.userId) {

		if (req.query.sessionCode &&
			req.query.name
		) {

			const debate = asm.get(req.query.sessionCode);

			if (debate) {

				let voter = debate.findVoterByPrivateId(req.session.userId);

				if (!voter) {
					voter = debate.addVoter(req.query.sessionCode, req.query.name, req.session.userId);
					req.session.voterId = voter.getPrivateVoterId();
					req.session.sessionCode = req.query.sessionCode;
				} else {
					voter.name = req.query.name;
					// TODO bubble this event up to the sockets to notify all clients of a name change
				}

				if (voter) {
					res.render('vote-on-debate', {
						title: debate.topic,
						participantA: debate.getParticipants()[0],
						participantB: debate.getParticipants()[1],
						undecided: debate.undecided.name,
						voterName: voter.name
					});
				} else {
					console.log('something happened when trying to find the voter');
					res.redirect(302, '/?issue=voter-not-found')
				}
			} else {
				res.redirect(302, '/?issue=debate-not-found')
			}
		} else {
			res.redirect(302, '/?issue=missing-info')
		}
	} else {
		res.redirect(302, '/?issue=missing-session')
	}

});

module.exports = router;
