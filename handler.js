'use strict';

const Parser = require('./Parser');
const Database = require('./Database.js');
const Callback = require('./Callback.js');
const AuthService = require('./Cognito.js');
  
module.exports.register = async (event, context) => {
  var params = Parser.parseParams(event.body);
  var missingParams = Callback.getMissingParams(params, [ 'username', 'apptoken', 'secret' ]);
  if (missingParams.length > 0) {
    return Callback.missingParamsInstance(missingParams);
  }
  
  var isUserRegistered = await Database.isUserRegistered(params.username, params.apptoken);
  if (!isUserRegistered) {
    await Database.registerUser(params.username, params.apptoken, params.secret);
  }
  return Callback.instance({ statusCode: 200 });
};

module.exports.registerCognito = async (event, context) => {
  var params = Parser.parseParams(event.body);
  var missingParams = Callback.getMissingParams(params, [ 'username', 'apptoken', 'secret' ]);
  if (missingParams.length > 0) {
    return Callback.missingParamsInstance(missingParams);
  }
  
  await AuthService.registerUser(params.username, params.apptoken, params.secret);
  return Callback.instance({ statusCode: 200 });
};

module.exports.getMessage = async (event, context) => {
  var params = event.queryStringParameters;
  var missingParams = Callback.getMissingParams(params, [ 'username', 'apptoken', 'secret', 'messageId' ]);
  if (missingParams.length > 0) {
    return Callback.missingParamsInstance(missingParams);
  }
  
  var isUserRegisteredPromise = Database.isUserRegistered(params.username, params.apptoken, params.secret);
  var messagePromise = Database.getMessage(params.messageId);
  
  const [ isUserRegistered, messageObject ] = await Promise.all([ isUserRegisteredPromise, messagePromise ]);
  if (!isUserRegistered) {
    return Callback.instance({ statusCode: 401 });
  } else if (messageObject === undefined) {
    return Callback.instance({ statusCode: 404 });
  }
  
  if (params.username !== messageObject.sender.S && params.username !== messageObject.receiver.S) {
    return Callback.instance({ statusCode: 401 });
  }
  
  var responseBody = {
    message: messageObject.message.S,
  };
  return Callback.instance({ statusCode: 200, body: responseBody });
};

module.exports.sendMessage = async (event, context) => {
  var params = Parser.parseParams(event.body);
  var missingParams = Callback.getMissingParams(params, [ 'username', 'apptoken', 'secret', 'receiver', 'message' ]);
  if (missingParams.length > 0) {
    return Callback.missingParamsInstance(missingParams);
  }
  
  var isUserRegisteredPromise = Database.isUserRegistered(params.username, params.apptoken, params.secret);
  var isReceiverRegisteredPromise = Database.isUserRegistered(params.receiver, params.apptoken);
  
  const [ isUserRegistered, isReceiverRegistered ] = await Promise.all([ isUserRegisteredPromise, isReceiverRegisteredPromise ]);
  if (!isUserRegistered) {
    return Callback.instance({ statusCode: 401 });
  } else if (!isReceiverRegistered) {
    var responseBody = { error: 'Receiver not registered' };
    return Callback.instance({ statusCode: 404, body: responseBody });
  }
  
  var messageId = await Database.createMessage(params.username, params.receiver, params.message);
  
  var responseBody = { messageId: messageId };
  return Callback.instance({ statusCode: 200, body: responseBody });
};
