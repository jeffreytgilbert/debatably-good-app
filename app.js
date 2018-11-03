const createError = require('http-errors');
const http = require('http');
//const https = require('https'); // if we had a way to do secure content serving
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

// session handling for 1 vote per user sessions
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const securityToken = require('uuid').v4();

const sessionParser = session({
	saveUninitialized: false,
	resave: false,
	store: new SQLiteStore,
	secret: '$eCuRiTy',
	cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
});

// pull in the debate app logic
const asm = require('./app/application-state-manager');

// create an instance of express to attach restful routes to
const app = express();

// Get a server instance, not the app instance, or express instance, 
// but the http server instance, which listens to the open port.
// We're passing the "app" express created to it for info purposes???
// I guess the app object has hooks the http service will pass info to.
const server = http.createServer(app);
// Get the lib for WebSocket so it can be used for const's later
const WebSocket = require('ws');
// Get the lib for creating a socket server instance
const SocketServer = WebSocket.Server;
// Give the socket server lib for the http server to use as its connection proxy
const wss = new SocketServer({
	verifyClient: (info, done) => {
		console.log('Parsing session from request...');
		sessionParser(info.req, {}, () => {
			console.log('Session is parsed!');
			// We can reject the connection by returning false to done(). For example,
			// reject here if user is unknown.

			// Comment above (from sample code) probably means I should do real session validation
			// if this is expected to ever be used as a real auth process. This is just handling/parsing
			// sessions for the socket connections so we can get req.session.userId in them

			done(info.req.session.userId);
		});
	},
	server
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// manage 1 session per user middleware
app.use(sessionParser);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// import route definitions
const addRouter = (app, name) => {
	const router = require('./routes/' + name);
	app.use('/' + name, router);
};

const indexRouter = require('./routes/index');
app.use('/', indexRouter);

addRouter(app, 'create-debate');
addRouter(app, 'moderate-debate');
addRouter(app, 'vote-on-debate');

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

let socketConnections = [];

/**
 * @param {WebSocket} ws 
 * @param {ConnectedUser} user 
 */
let SessionToSocketMap = function (ws, user) {
	this.ws = ws;
	this.user = user;
};

const ConnectedUser = function (isVoter, isModerator, userId, debate) {
	this.isVoter = isVoter;
	this.isModerator = isModerator;
	this.userId = userId;
	this.debate = debate;
};

/**
 * @param {WebSocket} offendingWs 
 */
const removeBadConnections = (offendingWs) => {
	socketConnections.forEach((sessionToSocketMap, index) => {
		if(sessionToSocketMap.ws === offendingWs) {
			delete socketConnections[index];
		}
	});
};


/**
 *  MANAGE ALL OUTBOUND COMMUNICATION
 * */
const updateSessions = () => {
	const runningSessions = asm.getRunningSessions();
	
	runningSessions.forEach(debate => {
		socketConnections.forEach(connectedUser => {
			if (connectedUser.user.isModerator && debate.getModeratorId() === connectedUser.user.userId) {
				if (connectedUser.ws.readyState === WebSocket.OPEN) {
					console.log('updating ', debate.sessionCode, 'for', debate.getModeratorId());
					const message = JSON.stringify({
						type: 'moderator-update', 
						data: { 
							chartData: debate.calculateDebateResults(),
							debateDetails: {
								started: debate.started,
								completed: debate.completed,
								timeRemaining: debate.getTimeRemaining()
							},
							audience: debate.getAudience().length > 0 ? debate.getAudience() : ['nobody yet']
						}
					});
					connectedUser.ws.send(message);
				}
			}
		})
	});
};

const broadcastToVoters = (event, debate) => {
	const message = JSON.stringify(event);

	socketConnections.forEach(connectedUser => {
		if (connectedUser.user.isVoter && connectedUser.user.debate === debate) {
			if (connectedUser.ws.readyState === WebSocket.OPEN) {
				connectedUser.ws.send(message);
			}
		}
	});
};

const startDebate = (debate) => {
	broadcastToVoters({type: 'start'}, debate);
};

const endDebate = (debate) => {
	broadcastToVoters({type: 'end'}, debate);
};

setInterval(() => {
	//	console.log('update sessions', Date.now());
		updateSessions();
	}, 2000
);

/**
 *  MANAGE ALL INBOUND COMMUNICATION
 * */ 

// on connection is different than on open in that you get request info 
// you can use to parse things like session cookies and such, which we do and store.
wss.on('connection', (ws, req) => {
	console.log('got a connection');

	const debate = asm.get(req.session.sessionCode);

	const user = new ConnectedUser(
		!!(req.session.voterId),
		!!(req.session.moderatorId),
		req.session.userId,
		debate
	);

	console.log('adding a session to the SessionToSocketMap');
	socketConnections.push(new SessionToSocketMap(ws, user));

	console.log(
		'SessionToSocketMap',
		socketConnections[socketConnections.length-1].user.isVoter,
		socketConnections[socketConnections.length-1].user.isModerator,
		socketConnections[socketConnections.length-1].user.userId,
		debate.sessionCode
	);

	ws.on('message', (data) => {
		console.log('got a message');

		const event = JSON.parse(data.toString());

		console.log('event received as', event);

		if (user.isModerator) {
			switch (event.type) {
				case 'start-session': 
					console.log('Starting the session', debate.sessionCode);
					debate.startDebate(function endDebateCallback() {
						endDebate(debate);
					});
					startDebate(debate);
					break;
				default:
					console.log('Unkown event type received:', event.type);
					break;
			}
		}

		if (user.isVoter) {
			switch (event.type) {
				case 'vote': 
					const voter = debate.getVoterById(user.userId);
					voter.placeVote(event.data.participant);
					break;
				case 'voter-check-in': 
					let state;
					if (debate.completed) { state = 'end'; }
					else if (debate.started) { state = 'start'; }
					else { state = 'pending'; }

					ws.send(JSON.stringify({
						type: state
					}));
					break;
				default:
					console.log('Unkown event type received:', event.type);
					break;
			}
		}
	});

	ws.on('close', (code, reason) => {
		console.log('Session closed', code, reason);
		removeBadConnections(ws);
	});

	ws.on('error', (error) => {
		console.log('error', error);
		removeBadConnections(ws);
	});

});

module.exports = { 
	app: app, 
	server: server
};
