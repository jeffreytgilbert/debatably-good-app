'use strict';

const express = require('express');
const router = express.Router();
const asm = require('../app/application-state-manager');
const h2t = require('html-to-text');

router.get('/', function(req, res, next) {
	const session = req.session;
	if (!session.userId) {
		const uuid = require('uuid').v4();
		session.userId = uuid;
	}
	res.render('index', {title:'Welcome stranger'});
});

router.post('/', function(req, res, next) {
	const session = req.session;

	// Don't do anything unless we're sure this person has a session that's saving
	if (session.userId) {
		if (req.body.sessionCode &&
			req.body.name
		) {
			const sessionCode = h2t.fromString(req.body.sessionCode, { longWordSplit: { forceWrapOnLimit: 11 } }).toUpperCase();
			const debate = asm.get(sessionCode);
			if (debate) {
				if (debate.getModeratorId() !== session.userId) {
					let debateRole = session.activeDebates[sessionCode];
					// session is new. create required key/data 
					if (!debateRole) {
						
						debateRole = require('../app/role')(
							debate.sessionCode,
							debate.getModeratorId(),
							session.userId,
							false,
							true
						);

						// Save the session role to the active sessions map
						session.activeDebates[debateRole.sessionCode] = debateRole;
					}

					// check to see if the voter already exists
					let voter = debate.getVoterById(debateRole.voterId);
					
					if (!voter) { // if they don't, add them to the session
						voter = debate.addVoter(sessionCode, req.body.name, debateRole.voterId);
					} else { // if they do, just rename them
						voter.name = req.body.name;
					}

					if (voter) {
						res.redirect(302, '/vote-on-debate?sessionCode=' + debate.sessionCode);
					} else {
						res.redirect(302, '/?issue=voter-not-found');
					}
				} else {
					res.redirect(302, '/?issue=moderators-cant-vote');
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
