'use strict';

const Parser = require('./Parser');
const Database = require('./Database.js');
const Callback = require('./Callback.js');

let getAuthToken = function(event) {
	let header = event.headers['Authorization'];
	if (header) {
		return header.substring(header.indexOf(' ') + 1);
	}
	return undefined;
};

module.exports = {
	login: async (event, context) => {
		let params = Parser.parseParams(event.body);
		let missingParams = Callback.getMissingParams(params, [ 'username', 'apptoken', 'secret' ]);
		if (missingParams.length > 0) {
			return Callback.missingParamsInstance(missingParams);
		}

		let payload;
		let isUserRegistered = await Database.isUserRegistered(params.username, params.apptoken);
		if (!isUserRegistered) {
			payload = await Database.registerUser(params.username, params.apptoken, params.secret);
		} else {
			payload = await Database.loginUser(params.username, params.apptoken, params.secret);
		}
		return Callback.instance({ statusCode: 200, body: payload });
	},

	getMessage: async (event, context) => {
		let params = event.queryStringParameters;
		let missingParams = Callback.getMissingParams(params, [ 'messageId' ]);
		if (missingParams.length > 0) {
			return Callback.missingParamsInstance(missingParams);
		}

		let userData = Database.parseJwtToken(getAuthToken(event));
		if (!userData) {
			return Callback.instance({ statusCode: 401, body: { error: true, NoAuthHeaderFoundError: true }});
		}

		let isUserRegisteredPromise = Database.isUserRegistered(userData.username, userData.apptoken);
		let isUserAdminPromise = Database.isUserAdmin(userData.username, userData.apptoken);
		let messagePromise = Database.getMessage(params.messageId);

		const [ isUserRegistered, isUserAdmin, messageObject ] = await Promise.all([ isUserRegisteredPromise, isUserAdminPromise, messagePromise ]);
		if (!isUserRegistered) {
			return Callback.instance({ statusCode: 401, body: { error: true, notRegisteredError: true }});
		} else if (messageObject === undefined) {
			return Callback.instance({ statusCode: 404, body: { error: true, messageNotFoundError: true }});
		}

		console.log(isUserAdmin);

		let receivers = messageObject.receiver.S.split('|');
		for (let i = 0; i < receivers.length; i++) {
			receivers[i] = receivers[i].trim();
		}

		if (userData.username !== messageObject.sender.S && !isUserAdmin && receivers.indexOf(userData.username) === -1) {
			return Callback.instance({ statusCode: 401, body: { error: true, accessDeniedError: true }});
		}

		let responseBody = {
			sender: messageObject.sender.S,
			message: messageObject.message.S,
			receiver: messageObject.receiver.S,
		};
		return Callback.instance({ statusCode: 200, body: responseBody });
	},

	sendMessage: async (event, context) => {
		let params = Parser.parseParams(event.body);
		let missingParams = Callback.getMissingParams(params, [ 'receiver', 'message' ]);
		if (missingParams.length > 0) {
			return Callback.missingParamsInstance(missingParams);
		}

		let userData = Database.parseJwtToken(getAuthToken(event));
		if (!userData) {
			return Callback.instance({ statusCode: 401, body: { error: true, noAccessTokenError: true }});
		}

		let isUserRegisteredPromise = Database.isUserRegistered(userData.username, userData.apptoken);

		const [ isUserRegistered ] = await Promise.all([ isUserRegisteredPromise ]);
		if (!isUserRegistered) {
			return Callback.instance({ statusCode: 401, body: { error: true, NoAuthHeaderFoundError: true }});
		}

		let messageId = await Database.createMessage(userData.username, params.receiver, params.message);

		let responseBody = { messageId: messageId };
		return Callback.instance({ statusCode: 200, body: responseBody });
	},
};