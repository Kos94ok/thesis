'use strict';

const Parser = require('./Parser');
const Database = require('./Database.js');
const Callback = require('./Callback.js');
const AuthService = require('./Cognito.js');

module.exports = {
	preSignUp: async (event, context, callback) => {
		console.log('WAT');
		event.response.autoConfirmUser = true;
		callback(null, event);
	},

	register: async (event, context) => {
		let params = Parser.parseParams(event.body);
		let missingParams = Callback.getMissingParams(params, [ 'username', 'apptoken', 'secret' ]);
		if (missingParams.length > 0) {
			return Callback.missingParamsInstance(missingParams);
		}

		let isUserRegistered = await Database.isUserRegistered(params.username, params.apptoken);
		if (!isUserRegistered) {
			await Database.registerUser(params.username, params.apptoken, params.secret);
		}
		return Callback.instance({ statusCode: 200 });
	},

	registerCognito: async (event, context) => {
		console.log(process.env);
		let params = Parser.parseParams(event.body);
		let missingParams = Callback.getMissingParams(params, [ 'username', 'apptoken', 'secret' ]);
		if (missingParams.length > 0) {
			return Callback.missingParamsInstance(missingParams);
		}

		let userData = await AuthService.registerUser(params.username, params.apptoken, params.secret);
		return Callback.instance({ statusCode: 200, body: { success: true } });
	},

	loginCognito: async (event, context) => {
		let params = Parser.parseParams(event.body);
		let missingParams = Callback.getMissingParams(params, [ 'username', 'apptoken', 'secret' ]);
		if (missingParams.length > 0) {
			return Callback.missingParamsInstance(missingParams);
		}

		let userData = await AuthService.registerAndAuthenticateUser(params.username, params.apptoken, params.secret);
		return Callback.instance({ statusCode: 200, body: { success: true, user: userData } });
	},

	getMessage: async (event, context) => {
		let params = event.queryStringParameters;
		let missingParams = Callback.getMissingParams(params, [ 'username', 'apptoken', 'secret', 'messageId' ]);
		if (missingParams.length > 0) {
			return Callback.missingParamsInstance(missingParams);
		}

		let isUserRegisteredPromise = Database.isUserRegistered(params.username, params.apptoken, params.secret);
		let messagePromise = Database.getMessage(params.messageId);

		const [ isUserRegistered, messageObject ] = await Promise.all([ isUserRegisteredPromise, messagePromise ]);
		if (!isUserRegistered) {
			return Callback.instance({ statusCode: 401 });
		} else if (messageObject === undefined) {
			return Callback.instance({ statusCode: 404 });
		}

		if (params.username !== messageObject.sender.S && params.username !== messageObject.receiver.S) {
			return Callback.instance({ statusCode: 401 });
		}

		let responseBody = {
			message: messageObject.message.S,
		};
		return Callback.instance({ statusCode: 200, body: responseBody });
	},

	sendMessage: async (event, context) => {
		let params = Parser.parseParams(event.body);
		let missingParams = Callback.getMissingParams(params, [ 'username', 'apptoken', 'secret', 'receiver', 'message' ]);
		if (missingParams.length > 0) {
			return Callback.missingParamsInstance(missingParams);
		}

		let isUserRegisteredPromise = Database.isUserRegistered(params.username, params.apptoken, params.secret);
		let isReceiverRegisteredPromise = Database.isUserRegistered(params.receiver, params.apptoken);

		const [ isUserRegistered, isReceiverRegistered ] = await Promise.all([ isUserRegisteredPromise, isReceiverRegisteredPromise ]);
		if (!isUserRegistered) {
			return Callback.instance({ statusCode: 401 });
		} else if (!isReceiverRegistered) {
			let responseBody = { error: 'Receiver not registered' };
			return Callback.instance({ statusCode: 404, body: responseBody });
		}

		let messageId = await Database.createMessage(params.username, params.receiver, params.message);

		let responseBody = { messageId: messageId };
		return Callback.instance({ statusCode: 200, body: responseBody });
	},

};