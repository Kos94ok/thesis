'use strict';

const AWS = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// TODO: Move to config
const JWT_SECRET = 'LwazeNN8BeqdbdzCtzYsN26dbZG1T76b';
const JWT_EXPIRATION_TIME = 60 * 60; // 1 hour

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
	return Math.round((new Date()).getTime() / 1000);
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
				if (data && !err) {
					resolve(true);
				}
				resolve(false)
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
				if (data && !err) {
					resolve(true);
				}
				resolve(false)
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
				}

				let userData = {
					username: username,
					apptoken: apptoken,
				};
				let token = jwt.sign({ userData }, JWT_SECRET, { expiresIn: JWT_EXPIRATION_TIME });
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
				if (Object.keys(data).length > 0) {
					let hashedSecret = data.Item.secret.S;

					if (!bcrypt.compareSync(secret, hashedSecret)) {
						resolve({ error: true, passwordError: true });
					}

					let userData = {
						username: username,
						apptoken: apptoken,
					};
					let token = jwt.sign({ userData }, JWT_SECRET, { expiresIn: JWT_EXPIRATION_TIME });
					resolve({ success: true, token: token, expiresAt: getCurrentTime() + JWT_EXPIRATION_TIME });
				}
				resolve({ error: true });
			});
		});
	},

	parseJwtToken: function(token) {
		if (!token) {
			return undefined;
		}

		try {
			const decodedToken = jwt.verify(token, JWT_SECRET);
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
		resolvePromise(resolve, reject, data.Item, err);
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