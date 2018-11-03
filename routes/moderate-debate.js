'use strict';

const express = require('express');
const router = express.Router();
const asm = require('../app/application-state-manager');

router.get('/', function(req, res, next) {

	if (req.session.userId) {
		if (req.query.code) {
	
			const debate = asm.get(req.query.code);

			if (debate) {
				if(debate.getModeratorId() === req.session.userId) {
					res.render('moderate-debate', {
						title: debate.topic,
						allowedDuration: debate.allowedDuration,
						audienceCode: debate.sessionCode,
						participantA: debate.getParticipants()[0],
						participantB: debate.getParticipants()[1],
						audience: debate.getAudience() && debate.getAudience().length ? 
							debate.getAudience() : 
							['nobody yet']
					});
				} else {
					res.redirect(302, '/?issue=not-your-debate')
				}
			} else {
				res.redirect(302, '/create-debate?issue=debate-not-found')
			}
		} else {
			res.redirect(302, '/create-debate?issue=missing-info')
		}
	} else {
		res.redirect(302, '/create-debate?issue=missing-session')
	}

});

module.exports = router;
