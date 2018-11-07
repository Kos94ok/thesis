'use strict';

module.exports = {
	parseParams: function(params) {
		let parsedParams = {};
		let paramsArray = params.split('&');
		for (let i = 0; i < paramsArray.length; i++) {
			let key = paramsArray[i].split('=')[0];
			let value = paramsArray[i].split('=')[1];
			parsedParams[key] = decodeURIComponent(value.replace(/\+/g, '%20'));
		}
		return parsedParams;
	},

	parseMessageReceivers: function(receiver) {
		let receiversSeparatorRegex = /[,|]/;
		let receivers = receiver.split(receiversSeparatorRegex);
		let trimmedReceivers = [];
		for (let i = 0; i < receivers.length; i++) {
			trimmedReceivers.push(receivers[i].trim());
		}
		return trimmedReceivers.join('|');
	},
};