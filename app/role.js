'use strict';

module.exports = (sessionCode, moderatorId, voterId, isModerator, isVoter) => {
	const role = {
		sessionCode: sessionCode,
		moderatorId: moderatorId,
		voterId: voterId,
		isModerator: !!isModerator,
		isVoter: !!isVoter
	};

	return role;
};