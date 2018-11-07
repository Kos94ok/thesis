'use strict';

const AWS = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_EXPIRATION_TIME = 60 * 60 * 1000; // 1 hour

AWS.config.update({ region: 'eu-central-1' });
let ddb = new AWS.DynamoDB();

let resolvePromise = function(resolve, reject, data, err) {
  if (err) {
	reject(err);
  } else {
	resolve(data);
  }
};

let getCurrentTime = function() {
	return Math.round((new Date()).getTime());
};

module.exports = {
	isUserRegistered: function(username, apptoken) {
		let userId = apptoken + '/' + username;
		let dbParams = {
			TableName: process.env.DB_TABLE_USER,
			Key: {
				'id': { S: userId },
			},
		};
		return new Promise(function(resolve) {
			ddb.getItem(dbParams, function(err, data) {
				let isFound = Object.keys(data).length > 0;
				resolve(isFound);
			});
		});
	},

	isUserAdmin: function(username, apptoken) {
		let userId = apptoken + '/' + username;
		let dbParams = {
			TableName: process.env.DB_TABLE_ADMIN,
			Key: {
				'id': { S: userId },
			},
		};
		return new Promise(function(resolve) {
			ddb.getItem(dbParams, function(err, data) {
				let isFound = Object.keys(data).length > 0;
				resolve(isFound);
			});
		});
	},
  
	registerUser: function(username, apptoken, secret) {
		let userId = apptoken + '/' + username;
		let timestamp = new Date().getTime().toString();
		let secretHash = bcrypt.hashSync(secret, 1);
		let dbParams = {
			TableName: process.env.DB_TABLE_USER,
			Item: {
				'id': { S: userId },
				'username': { S: username },
				'apptoken': { S: apptoken },
				'secret': { S: secretHash },
				'timestamp': { N: timestamp },
			},
		};
		return new Promise(function(resolve) {
			ddb.putItem(dbParams, function(err, data) {
				if (err) {
					resolve({ error: true });
					return;
				}

				let userData = {
					username: username,
					apptoken: apptoken,
				};
				let token = jwt.sign({ userData }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRATION_TIME });
				resolve({ success: true, token: token, expiresAt: getCurrentTime() + JWT_EXPIRATION_TIME });
			});
		});
	},

	loginUser: function(username, apptoken, secret) {
		let userId = apptoken + '/' + username;
		let dbParams = {
			TableName: process.env.DB_TABLE_USER,
			Key: {
				'id': { S: userId },
			},
		};
		return new Promise(function(resolve) {
			ddb.getItem(dbParams, function(err, data) {
				if (Object.keys(data).length === 0) {
					resolve({ error: true });
					return;
				}

				let hashedSecret = data.Item.secret.S;
				if (!bcrypt.compareSync(secret, hashedSecret)) {
					resolve({ error: true, passwordError: true });
					return;
				}

				let userData = {
					username: username,
					apptoken: apptoken,
				};
				let token = jwt.sign({ userData }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRATION_TIME });
				resolve({ success: true, token: token, expiresAt: getCurrentTime() + JWT_EXPIRATION_TIME });
			});
		});
	},

	parseJwtToken: function(token) {
		if (!token) {
			return undefined;
		}

		try {
			const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
			return decodedToken.userData;
		} catch(err) {
			return { error: true, signatureError: true };
		}
	},
  
  getMessage: function(messageId) {
	let dbParams = {
	  TableName: process.env.DB_TABLE_MESSAGE,
	  Key: {
		'id': { S: messageId },
	  },
	};
	return new Promise(function(resolve, reject) {
	  ddb.getItem(dbParams, function(err, data) {
	  	if (err || !data || !data.Item) {
	  		resolve({ error: true, noMessageFoundError: true });
	  		return;
		}
		let responseBody = JSON.parse(JSON.stringify(data.Item));
	  	responseBody.success = true;
	  	resolve(responseBody);
	  });
	});
  },
  
  createMessage: function(sender, receiver, message) {
	let messageId = uuidv4();
	let timestamp = new Date().getTime().toString();
	let dbParams = {
	  TableName: process.env.DB_TABLE_MESSAGE,
	  Item: {
		'id': { S: messageId },
		'sender': { S: sender },
		'receiver': { S: receiver },
		'message': { S: message },
		'timestamp': { N: timestamp },
	  },
	};
	return new Promise(function(resolve, reject) {
	  ddb.putItem(dbParams, function(err, data) {
		resolvePromise(resolve, reject, messageId, err);
	  });
	});
  },
  
};