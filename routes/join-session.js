'use strict';

const express = require('express');
const router = express.Router();
const asm = require('../app/application-state-manager');

router.get('/', function(req, res, next) {

	if (req.session.userId) {

		if (req.query.sessionCode &&
			req.query.name
		) {
			console.log('pre debate lookup');

			const debate = asm.get(req.query.sessionCode);

			console.log('post debate lookup');

			if (debate) {

				console.log('found debate');
				let voter = debate.findVoterByPrivateId(req.session.userId);

				if (!voter) {
					voter = debate.addVoter(req.query.sessionCode, req.query.name, req.session.userId);
				} else {
					voter.name = req.query.name;
					// TODO bubble this event up to the sockets to notify all clients of a name change
				}

				console.log('post add voter');

				if (voter) {
					console.log('voter found');

					req.session.voterId = voter.getPrivateVoterId();
					req.session.sessionCode = req.query.sessionCode;

					res.render('join-session', {
						title: debate.topic,
						participantA: debate.getParticipants()[0],
						participantB: debate.getParticipants()[1],
						undecided: debate.undecided,
						voterName: voter.name,
						audience: debate.getAudience() && debate.getAudience().length ? 
							debate.getAudience() : 
							['*crickets chirping*']
					});
				} else {
					console.log('something happened when trying to find the voter');
				}
			} else {
				res.redirect(302, '/?issue=not-found')
			}
		} else {
			res.redirect(302, '/?issue=missing-info')
		}
	} else {
		res.redirect(302, '/?issue=missing-session')
	}

});

module.exports = router;
