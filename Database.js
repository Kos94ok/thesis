'use strict';

const AWS = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const bcrypt = require('bcryptjs');

AWS.config.update({region: 'eu-central-1'});
let ddb = new AWS.DynamoDB();

let resolvePromise = function(resolve, reject, data, err) {
  if (err) {
    reject(err);
  } else {
    resolve(data);
  }
};

module.exports = {
  isUserRegistered: function(username, apptoken, secret) {
    let userId = apptoken + '/' + username;
    let dbParams = {
      TableName: process.env.DB_TABLE_USER,
      Key: {
        'id': { S: userId },
      },
    };
    return new Promise(function(resolve, reject) {
      ddb.getItem(dbParams, function(err, data) {
        let isObjectFound = false;
        if (Object.keys(data).length > 0) {
          isObjectFound = true;
          let hashedSecret = data.Item.secret.S;
        }
        let isUserRegistered = isObjectFound && (secret === undefined || bcrypt.compareSync(secret, hashedSecret));
        resolvePromise(resolve, reject, isUserRegistered, err);
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
    return new Promise(function(resolve, reject) {
      ddb.putItem(dbParams, function(err, data) {
        resolvePromise(resolve, reject, userId, err);
      });
    });
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