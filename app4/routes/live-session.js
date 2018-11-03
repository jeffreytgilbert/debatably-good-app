'use strict';

const express = require('express');
const router = express.Router();
const asm = require('../app/application-state-manager');

router.get('/', function(req, res, next) {

	if (req.session.userId) {
		if (req.query.code) {
	
			const debate = asm.get(req.query.code);
	
			if (debate) {
				res.render('live-session', {
					title: debate.topic,
					audienceCode: debate.sessionCode,
					participantA: debate.getParticipants()[0],
					participantB: debate.getParticipants()[1],
					audience: debate.getAudience() && debate.getAudience().length ? 
						debate.getAudience() : 
						['*crickets chirping* (hint: give your audience the invite code)']
				});
			} else {
				res.redirect(302, '/session?issue=debate-not-found')
			}
		} else {
			res.redirect(302, '/session?issue=missing-info')
		}
	} else {
		res.redirect(302, '/session?issue=missing-session')
	}

});

module.exports = router;
