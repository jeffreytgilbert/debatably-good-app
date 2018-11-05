'use strict';

const express = require('express');
const router = express.Router();
const asm = require('../app/application-state-manager');

const generateUniqueRoomCode = () => {
	const generateRandomCode = require('../app/generate-random-code');
	const sessionCode = generateRandomCode(4).toUpperCase();
	const existingRoom = asm.get(sessionCode);
	return !existingRoom ? sessionCode : generateUniqueRoomCode();
};

router.get('/', (req, res, next) => {
	const session = req.session;
	if (!session.userId) {
		const uuid = require('uuid').v4();
		session.userId = uuid;
	}
	res.render('create-debate', {});
});

router.post('/', (req, res, next) => {
	const session = req.session;

	// Don't do anything unless we're sure this person has a session that's saving
	if (session.userId) {

		if (req.body.topic &&
			req.body.participantA && 
			req.body.participantB && 
			req.body.duration
		) {
			const sessionCode = generateUniqueRoomCode();
			
			// create a debate object and store it in the global memory space
			const debate = asm.add(sessionCode,
				req.body.topic,
				req.body.participantA,
				req.body.participantB,
				(parseInt(req.body.duration, 10) * 60 * 1000), // 1000 ms + 60 seconds in a min
				session.userId
			);

			// create a role in this session
			const debateRole = require('../app/role')(
				debate.sessionCode,
				session.userId,
				session.userId,
				true,
				false
			);

			// Save the session role to the active sessions map
			session.activeDebates[debateRole.sessionCode] = debateRole;

			res.redirect(302, '/moderate-debate?code=' + sessionCode);
		} else {
			res.redirect(302, '/create-debate?issue=missing-info')
		}
	} else {
		res.redirect(302, '/create-debate?issue=missing-session')
	}

});
  
module.exports = router;
