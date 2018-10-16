'use strict';

module.exports = {
  parseParams: function(params) {
    var parsedParams = {};
    var paramsArray = params.split('&');
    for (var i = 0; i < paramsArray.length; i++) {
      var key = paramsArray[i].split('=')[0];
      var value = paramsArray[i].split('=')[1];
      var decodedValue = decodeURIComponent(value.replace(/\+/g, '%20'));
      parsedParams[key] = decodedValue;
    }
    return parsedParams;
  },
};