'use strict'

module.exports = {
  instance: function(args) {
    return {
      statusCode: args.statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(args.body),
    }
  },
  
  getMissingParams: function(params, requiredParams) {
    var missingParams = [];
    for (var i = 0; i < requiredParams.length; i++) {
      if (params[requiredParams[i]] === undefined) {
        missingParams.push(requiredParams[i]);
      }
    }
    return missingParams;
  },
  
  missingParamsInstance: function(missingParams) {
    var responseBody = {
      error: "Missing required parameters",
      missingParameters: missingParams,
    };
    return this.instance({ statusCode: 400, body: responseBody });
  },
};