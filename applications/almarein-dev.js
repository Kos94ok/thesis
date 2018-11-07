let awsHost = 'https://w9bl8wwbai.execute-api.eu-central-1.amazonaws.com/dev';

let awsTokenCookieName = 'awsToken';
let awsTokenUserCookieName = 'awsTokenUser';
let awsTokenExpiresAtCookieName = 'awsTokenExpiresAt';

let awsTokenExpirationBuffer = 60 * 1000; // 60 seconds

let adminUsers = ['Найриль', 'Аррандиль', 'Антоэль', 'Элиэль'];

if (adminUsers.indexOf(UserLogin) !== -1) {
	let secretMessageButton = '<td id="button-lazyvideo" title="Secret message"><img onclick="sendSecretMessage()" src="/i/blank.gif"></td>';
	$("#button-video").after(secretMessageButton);
}

function sendSecretMessage() {
	let receiver = prompt("Enter message receiver(s)", "");
	if (receiver) {
		let messageBody = prompt("Enter message body", "");
		if (messageBody) {

			$.ajax({
				type: 'POST',
				headers: {
					'Authorization': 'bearer ' + awsToken,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				url: awsHost + '/message/send',
				data: {
					receiver: receiver,
					message: messageBody,
				},
				success: function(data) {
					insert("[secretmsg]" + data.messageId + "[/secretmsg]");
				},
				error: function() {

				},
			});
		}
	}
}

function preprocessSecretMessage(messageContainer) {
	let secretMsgRegex = /(\[secretmsg\][ ]*([^\[]+)[ ]*\[\/secretmsg\])/g;
	let result = secretMsgRegex.exec(messageContainer.innerHTML);
	if (result) {
		messageContainer.innerHTML = messageContainer.innerHTML.replace(secretMsgRegex, '<span style="display:none">$1</span>');
	}
}

function fetchSecretMessage(messageContainer) {
	let secretMsgRegex = /<[^>]*>\[secretmsg\][ ]*([^\[]+)[ ]*\[\/secretmsg\]<\/[^>]*>/g;
	let lonelySecretMsgRegex = /<p>[\s]*<[^>]*>\[secretmsg\][ ]*([^\[]+)[ ]*\[\/secretmsg\]<\/[^>]*>[\s]*<\/p>/g;
	let result = secretMsgRegex.exec(messageContainer.innerHTML);
	if (result) {
		let id = result[1];

		$.ajax({
			type: 'GET',
			headers: {
				'Authorization': 'bearer ' + awsToken,
			},
			url: awsHost + '/message/get',
			data: {
				messageId: id
			},
			success: function(data) {
				let receivers = data.receiver.replace(/\|/g, ', ').trim();
				let messageSpan = "<span style='color: red;'>Секретное сообщение для " + receivers + ":</span> \"<span>" + data.message + "</span>\"";
				messageContainer.innerHTML = messageContainer.innerHTML.replace(secretMsgRegex, messageSpan);
			},
			error: function(response) {
				let data = JSON.parse(response.responseText);
				if (!data.accessDeniedError) {
					return;
				} else {
					console.error('[Secret message] Unexpected error: ' + data);
				}

				let results = lonelySecretMsgRegex.exec(messageContainer.innerHTML);
				if (results) {
					let messageSpan = "<span style='color: red;'>Секретное сообщение для кого-то другого";
					messageContainer.innerHTML = messageContainer.innerHTML.replace(secretMsgRegex, messageSpan);
				}
			}
		});
	}
}

function processSecretMessages() {
	let codeEscapeRegex = /\[secretmsg\](.*?)\[\/secretmsg\]/g;
	let codeContentList = document.getElementsByClassName('blockcode');
	for (let i = 0; i < codeContentList.length; i++) {
		codeContentList[i].innerHTML = codeContentList[i].innerHTML.replace(codeEscapeRegex, '[code-secretmsg]$1[/code-secretmsg]');
	}

	let postContentList = document.getElementsByClassName('post-content');
	for (let i = 0; i < postContentList.length; i++) {
		preprocessSecretMessage(postContentList[i]);
		fetchSecretMessage(postContentList[i]);
	}

	let codeUnescapeRegex = /\[code-secretmsg\](.*?)\[\/code-secretmsg\]/g;
	for (let i = 0; i < codeContentList.length; i++) {
		codeContentList[i].innerHTML = codeContentList[i].innerHTML.replace(codeUnescapeRegex, '[secretmsg]$1[/secretmsg]');
	}
}

function setCookie(name, value, expiresAt) {
	let expires = '';
	if (expiresAt) {
		let date = new Date(expiresAt);
		expires = '; expires=' + date.toUTCString();
	}
	document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

let awsToken = getcookie(awsTokenCookieName);
let awsTokenUser = getcookie(awsTokenUserCookieName);
let awsTokenExpiresAt = getcookie(awsTokenExpiresAtCookieName);
let currentTime = new Date().getTime();

if (UserLogin !== awsTokenUser || !awsToken || currentTime > (awsTokenExpiresAt - awsTokenExpirationBuffer)) {
	let loginBody = {
		username: UserLogin,
		apptoken: 'alm-dev',
		secret: UserUniqueID,
	};
	$.post(awsHost + '/login', loginBody, function(data) {
		if (!data.success) {
			return;
		}

		awsToken = data.token;
		awsTokenExpiresAt = data.expiresAt;
		setCookie(awsTokenCookieName, awsToken, awsTokenExpiresAt);
		setCookie(awsTokenUserCookieName, UserLogin, awsTokenExpiresAt);
		setCookie(awsTokenExpiresAtCookieName, awsTokenExpiresAt, awsTokenExpiresAt);

		processSecretMessages();
	});
} else {
	processSecretMessages();
}