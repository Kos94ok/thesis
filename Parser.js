'use strict';

module.exports = {
  parseParams: function(params) {
    let parsedParams = {};
    let paramsArray = params.split('&');
    for (let i = 0; i < paramsArray.length; i++) {
      let key = paramsArray[i].split('=')[0];
      let value = paramsArray[i].split('=')[1];
      let decodedValue = decodeURIComponent(value.replace(/\+/g, '%20'));
      parsedParams[key] = decodedValue;
    }
    return parsedParams;
  },
};