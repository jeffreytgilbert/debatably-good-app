'use strict';

module.exports = function (length) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXTZ";
	const stringLength = length;
	let randomString = '';
	for (let i=0; i<stringLength; i++) {
		let rando = Math.floor(Math.random() * chars.length);
		randomString += chars.substring(rando, rando+1);
	}
	return randomString;
}
