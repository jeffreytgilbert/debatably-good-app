'use strict';

const express = require('express');
const router = express.Router();
const asm = require('../app/application-state-manager');

router.get('/', function(req, res, next) {
	if (!req.session.userId) {
		const uuid = require('uuid').v4();
		console.log('Updating session for user', uuid);
		req.session.userId = uuid;
	}
	res.render('session', {
		title: 'Debatably Good'
	});
});

router.post('/', function(req, res, next) {

	if (req.session.userId) {
		if (req.body.topic &&
			req.body.participantA && 
			req.body.participantB && 
			req.body.duration
		) {
			const generateRandomCode = require('../app/generate-random-code.js');
			const sessionCode = generateRandomCode(4).toUpperCase();

			req.session.moderatorId = req.session.userId;
			req.session.sessionCode = sessionCode;

			asm.add(sessionCode,
				req.body.topic,
				req.body.participantA,
				req.body.participantB,
				(+req.body.duration * 60 * 1000),
				req.session.userId
			);
	
			res.redirect(302, '/live-session?code='+sessionCode);
		} else {
			res.redirect(302, '/session?issue=missing-info')
		}
	} else {
		res.redirect(302, '/session?issue=missing-session')
	}

});
  
module.exports = router;
