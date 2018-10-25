let AmazonCognitoIdentity = require('amazon-cognito-identity-js-node');

module.exports = {
	getUniqueUsername: function(username, apptoken) {
		return apptoken + '/' + username;
	},

	getUserPool: function() {
		let poolData = {
			UserPoolId : process.env.AUTH_POOL_ID,
			ClientId : process.env.AUTH_CLIENT_ID,
		};
		return new AmazonCognitoIdentity.CognitoUserPool(poolData);
	},

	getUser: function(username, apptoken) {
		let uniqueUsername = this.getUniqueUsername(username, apptoken);
		let userPool = this.getUserPool();
		let userData = {
			Username : uniqueUsername,
			Pool : userPool,
		};
		return new AmazonCognitoIdentity.CognitoUser(userData);
	},

	getAuthDetails: function(username, apptoken, secret) {
		let uniqueUsername = this.getUniqueUsername(username, apptoken);
		let authenticationData = {
			Username : uniqueUsername,
			Password : secret,
		};
		return new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
	},

	registerUser: function(username, apptoken, secret) {
		let attributeList = [];

		let uniqueUsername = this.getUniqueUsername(username, apptoken);
		let userPool = this.getUserPool();

		return new Promise(function(resolve, reject) {
			userPool.signUp(uniqueUsername, secret, attributeList, null, function(err, result) {
				if (err) {
					resolve({ error: true, code: 1 });
					return;
				}

				resolve(result.user);
			});
		});
	},
  
	authenticateUser: function(username, apptoken, secret) {
		let user = this.getUser(username, apptoken);
		let authDetails = this.getAuthDetails(username, apptoken, secret);

		return new Promise(function(resolve, reject) {
			user.authenticateUser(authDetails, {
				onSuccess: function (result) {
					let accessToken = result.getAccessToken().getJwtToken();
					let idToken = result.idToken.jwtToken;
					console.log('accessToken: ' + accessToken);
					console.log('idToken: ' + idToken);
					resolve(result.user);
				},

				onFailure: function(err) {
					resolve({ error: true, code: 0 });
				},
			});
		});
  	},

	registerAndAuthenticateUser: async function(username, apptoken, secret) {
		let user = await this.registerUser(username, apptoken, secret);
		// Registration error - account exists
		if (user.error && user.code === 1) {
			user = await this.authenticateUser(username, apptoken, secret);
		}
		return user;
	},
};