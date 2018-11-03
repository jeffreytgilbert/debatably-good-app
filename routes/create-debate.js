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
	res.render('create-debate', {
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
			console.log(req.body.topic, req.body.participantA, req.body.participantB, req.body.duration);

			const generateRandomCode = require('../app/generate-random-code.js');
			const sessionCode = generateRandomCode(4).toUpperCase();

			req.session.moderatorId = req.session.userId;
			req.session.sessionCode = sessionCode;

			asm.add(sessionCode,
				req.body.topic,
				req.body.participantA,
				req.body.participantB,
				(parseInt(req.body.duration, 10) * 60 * 1000), // 1000 ms + 60 seconds in a min
				req.session.userId
			);
	
			res.redirect(302, '/moderate-debate?code=' + sessionCode);
		} else {
			res.redirect(302, '/create-debate?issue=missing-info')
		}
	} else {
		res.redirect(302, '/create-debate?issue=missing-session')
	}

});
  
module.exports = router;
