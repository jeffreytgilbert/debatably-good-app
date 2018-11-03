'use strict';

var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
	if (!req.session.userId) {
		const uuid = require('uuid').v4();
		console.log('Updating session for user', uuid);
		req.session.userId = uuid;
	}
	res.render('index', { title: 'What\'s the room code?' });
});

module.exports = router;
