var AmazonCognitoIdentity = require('amazon-cognito-identity-js-node');

var poolData = {
  UserPoolId : 'eu-central-1_brt6AYJJX',
  ClientId : '7h68msivf7lkc7trrr0mmovl23'
};
var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

module.exports = {
  registerUser: function(username, apptoken, secret) {
    var attributeList = [];
    var uniqueUsername = apptoken + '/' + username;
    return new Promise(function(resolve, reject) {
      userPool.signUp(uniqueUsername, secret, attributeList, null, function(err, result) {
        if (err) {
          reject(err);
          return;
        }
        console.log('user:' + result.user);
        resolve(result.user);
      });
    });
  },
  
  authenticateUser: function(username, apptoken, secret) {
    var uniqueUsername = apptoken + '/' + username;
    var userData = {
        Username : uniqueUsername,
        Pool : userPool,
    };
    var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    
    var authenticationData = {
      Username : uniqueUsername,
      Password : secret,
    };
    var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
    
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            var accessToken = result.getAccessToken().getJwtToken();            
            var idToken = result.idToken.jwtToken;
            console.log('accessToken: ' + accessToken);
            console.log('idToken: ' + idToken);
        },

        onFailure: function(err) {
            alert(err);
        },

    });
  },
  
  refreshSessionIfRequired: function(req, res, next) {
    // Placeholder code, change it to suit the use-case
    const AccessToken = new CognitoAccessToken({AccessToken: req.user.tokens.accessToken});
    const IdToken = new CognitoIdToken({IdToken: req.user.tokens.idToken});
    const RefreshToken = new CognitoRefreshToken({RefreshToken: req.user.tokens.refreshToken});
    const sessionData = {
      IdToken: IdToken,
      AccessToken: AccessToken,
      RefreshToken: RefreshToken
    };
    const cachedSession = new CognitoUserSession(sessionData);

    if (cachedSession.isValid()) {
      next();
    } else {
      cognitoUser = getCognitoUser(req);
      cognitoUser.refreshSession(RefreshToken, (err, session) => {
        if (err) throw err;
        const tokens = getTokens(session);
        AWS.config.credentials = getCognitoIdentityCredentials(tokens);
        AWS.config.credentials.get(function() {
          const credentials = AWS.config.credentials.data.Credentials;
          req.session.AWSCredentials = getAWSCredentials(credentials);
          next();
        });
      });
    }
  },
};