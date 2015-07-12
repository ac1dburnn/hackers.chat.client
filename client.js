var ver = "0.7"

var IGNORE = [
	'foobar'
]

var frontpage = [
	"                            _           _         _       _   ",
	"                           | |_ ___ ___| |_   ___| |_ ___| |_ ",
	"                           |   |_ ||  _| '_| |  _|   |_ ||  _|",
	"                           |_|_|__/|___|_,_|.|___|_|_|__/|_|  ",
	"",
	"",
	"You are running hackers.chat.client " + ver,
	"",
	"Original code by @AndrewBelt, Custom client by @ac1dburnn",
	"",
	"Here are some pre-made channels you can join:",
	"?lobby ?meta ?random",
	"?technology ?programming",
	"?math ?physics ?asciiart",
	"And here's a random one generated just for you: ?" + Math.random().toString(36).substr(2, 8),
	"",
].join("\n")

var hccFront = [
	"",
	" _           _                     _       _  ",
	"| |_ ___ ___| |_ ___ ___ ___   ___| |_ ___| |_ ",
	"|   | .'|  _| '_| -_|  _|_ -|_|  _|   | .'|  _|",
	"|_|_|__,|___|_,_|___|_| |___|_|___|_|_|__,|_|  ",
	"A hackers client for hack.chat - by Kate Libby & :^)",
	"Menu:",
	"Join|Original Homepage|Settings|About",
	"Popular Channels:",
	"Channel History:",
	"Friends:",
	"Bookmarked Channels:",
	"",
].join("\n")

function $(query) {return document.querySelector(query)}


window.onload = function() {
	myChannel = window.location.search.replace(/^\?/, '')
	if (myChannel == '') {
		pushMessage('', frontpage)
		$('#footer').classList.add('hidden')
		$('#sidebar').classList.add('hidden')
	}
	else {
		join(myChannel)
	}
}

var ws
var myNick
var myChannel
var lastSent = ""

function getNick() {
	var saved = localStorage.getItem('nick');
	if (saved) {
		return saved
	}
	var nick = prompt('Nickname: ')
	localStorage.setItem('nick', nick)
	return nick;
}

function getHistory() {
	var full =  JSON.parse(localStorage.getItem('history-' + window.location.search) || '[]')
	return full.slice(full.length - 1000, full.length);
}

function isNickIgnored(nick) {
	return getIgnored().indexOf(nick) !== -1;
}

function isNickFriend(nick) {
	return getFriends().indexOf(nick) !== -1;
}

function getItems(elem) {
	return elem.value.split('\n').map(function (item) {
		return item.trim();
	})
}

function getItemsString(elem) {
	var items = localStorage.getItem(elem.getAttribute('listName'))
	console.log('get items', elem.getAttribute('listName'))
	return JSON.parse(items || '[]').join('\n');
}

function initListEdit() {
	var edits = [].slice.call(document.getElementsByClassName('list-edit'));
	edits.forEach(function (edit) {
		edit.value = getItemsString(edit)
		edit.onchange = (function (e) {
			return function () {
				localStorage.setItem(e.getAttribute('listName'), JSON.stringify(getItems(e)))
			}
		})(edit)
	})
}

function getFriends() {
	return JSON.parse(localStorage.getItem('friends') || '[]')
}

function getIgnored() {
	return JSON.parse(localStorage.getItem('ignored') || '[]')
}

function join(channel) {
	ws = new WebSocket('wss://hack.chat/chat-ws')
	
	initListEdit()
	
	// OK time to load history
	var history = getHistory()
	history.forEach(function (message) {
		pushMessage(message.nick, message.text, message.time, 'me')
	})

	ws.onopen = function() {
		// Get the input element
		var jsNick = $('.js-nick');
		myNick = getNick()
		
		// Set the content to be our nickname (default '')
		jsNick.value = localStorage.getItem('nick') || ''
		
		// Whenever a key is pressed
		jsNick.onkeydown = function () {
			// Store the current value
			localStorage.setItem('nick', jsNick.value)
		}
		
		if (myNick) {
			send({cmd: 'join', channel: channel, nick: myNick})
		}
	}

	ws.onmessage = function(message) {
		var args = JSON.parse(message.data)
		var cmd = args.cmd
		var command = COMMANDS[cmd]
		command.call(null, args)
	}
	

	ws.onclose = function() {
		pushMessage('[HCC]', "Server disconnected - Reconnecting", Date.now(), 'warn')
		setTimeout(function () {
			join(channel)
		}, 1000)
	}
}

function addToHistory(args) {
	// Just going to use localStorage
	var history = getHistory()
	history.push(args)
	localStorage.setItem('history', JSON.stringify(history));
}

var COMMANDS = {
	chat: function(args) {
		addToHistory(args);
		var cls
		if (args.admin) {
			cls = 'admin'		
		}
		else if (myNick == args.nick) {
			cls = 'me'
		}
		pushMessage(args.nick, args.text, args.time, cls)
	},
	info: function(args) {
		pushMessage('*', args.text, args.time, 'info')
	},
	warn: function(args) {
		pushMessage('!', args.text, args.time, 'warn')
	},
	onlineSet: function(args) {
		var nicks = args.nicks
		usersClear()
		nicks.forEach(function(nick) {
			userAdd(nick)
		})
		pushMessage('*', "Users online: " + nicks.join(", "), Date.now(), 'info')
	},
	onlineAdd: function(args) {
		var nick = args.nick
		userAdd(nick)
		if ($('#joined-left').checked) {
			pushMessage('*', nick + " joined", Date.now(), 'info')
		}
	},
	onlineRemove: function(args) {
		var nick = args.nick
		userRemove(nick)
		if ($('#joined-left').checked) {
			pushMessage('*', nick + " left", Date.now(), 'info')
		}
	},
}


function pushMessage(nick, text, time, cls) {
	if (isNickIgnored(nick)) {
		return
	}
	
	if (isNickFriend(nick)) {
		cls = 'warn';
	}
	
	var messageEl = document.createElement('div')
	messageEl.classList.add('message')
	if (cls) {
		messageEl.classList.add(cls)
	}

	var nickEl = document.createElement('span')
	nickEl.classList.add('nick')
	nickEl.textContent = nick || ''
	if (time) {
		var date = new Date(time)
		nickEl.title = date.toLocaleString()
	}
	nickEl.onclick = function() {
		insertAtCursor("@" + nick + " ")
		$('#chatinput').focus()
	}
	messageEl.appendChild(nickEl	)

	var textEl = document.createElement('pre')
	textEl.classList.add('text')

	textEl.textContent = text || ''
	textEl.innerHTML = textEl.innerHTML.replace(/(\?|https?:\/\/)\S+?(?=[,.!?:)]?\s|$)/g, parseLinks)
	try {
		renderMathInElement(textEl, {delimiters: [
		  {left: "$$", right: "$$", display: true},
		  {left: "$", right: "$", display: false},
		]})
	}
	catch (e) {
		console.warn(e)
	}
	messageEl.appendChild(textEl)

	var atBottom = isAtBottom()
	$('#messages').appendChild(messageEl)
	if (atBottom) {
		window.scrollTo(0, document.body.scrollHeight)
	}

	unread += 1
	updateTitle()
}


function insertAtCursor(text) {
	var input = $('#chatinput')
	var start = input.selectionStart || 0
	input.value = input.value.substr(0, start) + text + input.value.substr(start)
}


function send(data) {
	ws.send(JSON.stringify(data))
}


function parseLinks(g0) {
	var a = document.createElement('a')
	a.innerHTML = g0
	var url = a.textContent
	if (url[0] == '?') {
		url = "/" + url
	}
	a.href = url
	a.target = '_blank'
	return a.outerHTML
}


var windowActive = true
var unread = 0

window.onfocus = function() {
	windowActive = true
	updateTitle()
}

window.onblur = function() {
	windowActive = false
}

window.onscroll = function() {
	if (isAtBottom()) {
		updateTitle()
	}
}

function isAtBottom() {
	return (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 1)
}

function updateTitle() {
	if (windowActive && isAtBottom()) {
		unread = 0
	}

	var title
	if (myChannel) {
		title = "?" + myChannel
	}
	else {
		title = "hack.chat"
	}
	if (unread > 0) {
		title = '(' + unread + ') ' + title
	}
	document.title = title
}

/* footer */

$('#footer').onclick = function() {
	$('#chatinput').focus()
}

$('#chatinput').onkeydown = function(e) {
	if (e.keyCode == 13 /* ENTER */ && !e.shiftKey) {
		if (e.target.value != '') {
			var text = e.target.value
			e.target.value = ''
			send({cmd: 'chat', text: text})
			lastSent = text
			updateInputSize()
		}
		e.preventDefault()
	}
	else if (e.keyCode == 38 /* UP */) {
		// Restore previous sent message
		if (e.target.value == '') {
			e.target.value = lastSent
			e.target.selectionStart = e.target.value.length
			updateInputSize()
			e.preventDefault()
		}
	}
}

function updateInputSize() {
	var atBottom = isAtBottom()

	var input = $('#chatinput')
	input.style.height = 0
	input.style.height = input.scrollHeight + 'px'
	document.body.style.marginBottom = $('#footer').offsetHeight + 'px'

	if (atBottom) {
		window.scrollTo(0, document.body.scrollHeight)
	}
}

$('#chatinput').oninput = function() {
	updateInputSize()
}

updateInputSize()
$('#chatinput').focus()


/* sidebar */

$('#sidebar, #hack-sidebar').onmouseenter = function() {
	$('#sidebar-content').classList.remove('hidden')
}

$('#sidebar, #hack-sidebar').onmouseleave = function() {
	if (!$('#pin-sidebar').checked) {
		$('#sidebar-content').classList.add('hidden')
	}
}

$('#clear-history').onclick = function() {
	// Delete children elements
	var messages = $('#messages')
	while (messages.firstChild) {
		messages.removeChild(messages.firstChild)
	}
}

function userAdd(nick) {
	var user = document.createElement('li')
	user.textContent = nick
	user.onclick = userInvite
	$('#users').appendChild(user)
}

function userRemove(nick) {
	var users = $('#users')
	var children = users.children
	for (var i = 0; i < children.length; i++) {
		var user = children[i]
		if (user.textContent == nick) {
			users.removeChild(user)
		}
	}
}

function usersClear() {
	var users = $('#users')
	while (users.firstChild) {
		users.removeChild(users.firstChild)
	}
}

function userInvite(e) {
	var nick = e.target.textContent
	send({cmd: 'invite', nick: nick})
}

/* color scheme switcher */

var schemes = [
	'android',
	'atelier-dune',
	'atelier-forest',
	'atelier-heath',
	'atelier-lakeside',
	'atelier-seaside',
	'bright',
	'chalk',
	'default',
	'eighties',
	'greenscreen',
	'mocha',
	'monokai',
	'nese',
	'ocean',
	'pop',
	'railscasts',
	'solarized',
	'tomorrow',
]

var currentScheme = 'atelier-dune'

function setScheme(scheme) {
	currentScheme = scheme
	$('#scheme-link').href = "/schemes/" + scheme + ".css"
	if (localStorage) {
		localStorage['scheme'] = scheme
	}
}

// Add scheme options to dropdown selector
schemes.forEach(function(scheme) {
	var option = document.createElement('option')
	option.textContent = scheme
	option.value = scheme
	$('#scheme-selector').appendChild(option)
})

$('#scheme-selector').onchange = function(e) {
	setScheme(e.target.value)
}

// Load and select scheme from local storage if available
if (localStorage) {
	var scheme = localStorage['scheme']
	if (scheme) {
		setScheme(scheme)
	}
}

$('#scheme-selector').value = currentScheme
