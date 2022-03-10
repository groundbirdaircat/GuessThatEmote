(()=> {
    var emoteText, winnerText, 
    mainImage, coverImage, clapImage, 
    mainWrap, timerCircle,
    socket, username, 
    availableEmotes = [], currentEmote = {}, 
    lastEmote = {}, emoteAttempt = 1, 
    gameState = false, options = {}

    const el = q => document.querySelector(q)

//////////
// INIT //
//////////

    addEventListener('DOMContentLoaded', init)

    function init() {
        removeEventListener('DOMContentLoaded', init)

        clapImage = el('#clapimg')
        emoteText = el('#emoteText')
        mainImage = el('#centerimg')
        winnerText = el('#winnertext')
        mainWrap = el('#mainwrapper')
        coverImage = el('#centerimgcover')
        timerCircle = el('#timercircle')

        mainImage.onload = mainImageLoaded

        setOptions()
        if (checkOptionsForErrors()) { 
            console.error('GTE: invalid url') 
            return 
        }

        // getAllEmotes() starts round after
        // emotes are fetched, but will
        // make sure socket is connected first
        getAllEmotes() 
        connectWS()
    }

    function setOptions() {
        // parse query, then set channel username
        // which emotes to use
        // and how much time between rounds
        var parsedObj = parseQueryStringToObj()
        options.timeBetweenEmotes = parsedObj.time
        options.useTwitchChannel = parsedObj.twch
        options.useTwitchGlobal = parsedObj.twgl
        options.useBTTV = parsedObj.bttv
        options.useFFZ = parsedObj.ffz
        options.useTV7 = parsedObj.tv7
        username = parsedObj.user
    }

    function checkOptionsForErrors() {
        // verify username exists and is regular characters
        // also  make sure at least 1 emote group is enabled
        if (!username || (encodeURI(username).includes('%')) || 
            (!options.useTwitchChannel && 
            !options.useTwitchGlobal &&
            !options.useBTTV && 
            !options.useFFZ && 
            !options.useTV7)) return true
        else return false
    }

    function parseQueryStringToObj() {
        // parse options from numerical query string
        var numString = location.search.substr(1)
        var parsedNumArray = numString.split(/(..)/g).filter(x=>x)
        var parsedString = parsedNumArray.reduce((a, c) => {
            return a + String.fromCharCode(c)
        }, '')
        var parsedSplit = parsedString.split('/')

        if (parsedSplit.length != 7) return console.error('bad link')

        var parsedObj = {
            user: parsedSplit[0],
            time: parsedSplit[1],
            twch: parsedSplit[2],
            twgl: parsedSplit[3],
            bttv: parsedSplit[4],
            ffz: parsedSplit[5],
            tv7: parsedSplit[6],
        }
        return parsedObj
    }

    function getAllEmotes() {
        return fetch(
            `https://bigapi.glitch.me/gte/init/${username}/` +
            `${Number(options.useTwitchGlobal)}` +
            `${Number(options.useTwitchChannel)}` +
            `${Number(options.useBTTV)}` +
            `${Number(options.useFFZ)}` +
            `${Number(options.useTV7)}`, 
            { method: 'GET' }
        )

        .then(res => res.json()).then(array => {
            if (array.error) {
                return console.error('GTE: invalid url') 
            }

            // make sure there's emotes
            if (!array.length) {
                // retry with fall off timing
                emoteAttempt *= 2
                setTimeout(()=> {
                        console.warn('GTE: no emotes found (retrying)')
                        getAllEmotes()
                    }, 
                    emoteAttempt*1000
                )
            }

            // start game
            else { 
                availableEmotes = array 
                showNewEmote()
            }
        })
    }

///////////////
// WEBSOCKET //
///////////////

    function connectWS() {
        socket = new WebSocket('ws://irc-ws.chat.twitch.tv:80')
        socket.addEventListener('open', connectTwitch)
        socket.addEventListener('message', readSocketMessage)
        socket.addEventListener('close', reconnectWS)
        socket.addEventListener('error', reconnectWS)
    }

    var socketRetryMultiplier = 1
    function reconnectWS() {
        console.warn('GTE: socket reconnecting')
        socket.removeEventListener('open', connectTwitch)
        socket.removeEventListener('message', readSocketMessage)
        socket.removeEventListener('close', reconnectWS)
        socket.removeEventListener('error', reconnectWS)
        socket.close()

        // retry with fall off timing
        socketRetryMultiplier *= 2
        setTimeout(
            connectWS, 
            (socketRetryMultiplier*500) + Math.random()
        )
    }

    function connectTwitch() {
        // after successful socket connection,
        // connect anonymously to users twitch chat
        socketRetryMultiplier = 1
        console.log('GTE: socket connected')
        socket.send(`PASS oauth:`)
        socket.send(`NICK justinfan12345`)
        socket.send(`JOIN #${username.toLowerCase()}`)
    }

    function readSocketMessage(message) {
        // matches 'PRIVMSG' messages (chat)
        // group 1: username, group 2: chat message
        var regex = /:(.*)!\1@\1.tmi.twitch.tv PRIVMSG #\w* :(.*)\r\n$/
        var check = message.data.match(regex)
        if (gameState && check && check[1]) {
            if (check[2].includes(currentEmote.code)) {
                correctEmoteTyped(check[1]) 
            }
            return
        }

        // ping pong 
        regex = /^PING/
        check = message.data.match(regex)
        if (check) socket.send('PONG :tmi.twitch.tv')
    }

    function correctEmoteTyped(user) {
        // stop round
        gameState = false
        timer.setVisibility(false)

        // get proper username format
        fetch(
            `https://bigapi.glitch.me/gte/user/${user}`, 
            {method: 'GET',}
        ).then(res => res.json())

        // set end round (guessed) text/styles
        .then(displayName => {
            clapImage.style.opacity = winnerText.style.opacity = 1
            emoteText.innerText = currentEmote.code
            winnerText.innerHTML = `Guessed by<br>${displayName}`

            fadeOutAndSetRestartTimer()
        })
    }

//////////
// GAME //
//////////

    function showNewEmote() {
        // don't go if socket not 
        // connected, retry instead
        if (!socket.readyState) {
            return setTimeout(showNewEmote, 1000)
        }

        if (socket.readyState > 1) {
            // higher than one means 
            // closing or closed, so reconnect
            console.warn('GTE: socket error')
            reconnectWS()
            return setTimeout(showNewEmote, 1000)
        }

        // pick next emote and set src, 
        // 'onload' will trigger mainImageLoaded()
        // to start the next round
        currentEmote = pickNewEmote()
        mainImage.src = coverImage.src = currentEmote.url
    }

    function mainImageLoaded() {
        // reset styles
        clapImage.style.opacity = winnerText.style.opacity = 0
        coverImage.style.opacity = mainWrap.style.opacity = 1
        emoteText.innerText = ''

        // start round
        gameState = true
        timer.start()

        // fade out cover image
        setTimeout(()=> coverImage.style.transitionDuration = '20s', 50)
        setTimeout(()=> coverImage.style.opacity = 0.01, 100)
    }

    function pickNewEmote() {
        // randomly pick emote
        let pickedEmote = availableEmotes[Math
            .floor(Math.random() * availableEmotes.length)]

        // check for off cases, 
        // missing code or only 1 emote available
        if (!pickedEmote.code) return pickNewEmote()
        if (availableEmotes.length == 1) return pickedEmote

        // don't use the same emote 
        // twice in a row
        if (pickedEmote.code == lastEmote?.code) return pickNewEmote()
        else lastEmote = pickedEmote

        return pickedEmote
    }

    function fadeOutAndSetRestartTimer() {
        // set end round (general) text/styles
        coverImage.style.transitionDuration = '0s'
        coverImage.style.opacity = 0

        // fade out everything
        setTimeout(()=> {
            mainWrap.style.transitionDuration = '3s'
            mainWrap.style.opacity = 0

            // set duration for shorter fade in
            setTimeout(
                ()=> mainWrap.style.transitionDuration = '.5s', 
                1000
            )

            // start next round
            setTimeout(
                showNewEmote, 
                3000 + (options.timeBetweenEmotes*1000)
            )
        }, 2000)
    }

    const timer = (function timerModule() {
        var time
        function start() {
            setVisibility(true)
            time = 31
            loop()
        }
        function loop() {
            // stop loop if someone guessed
            if (!gameState) return

            // count down seconds
            time--
            timerCircle.innerText = time

            // stop loop if time ran out
            if (time < 1) return timeRanOut()

            // else loop again
            setTimeout(loop, 1000) 
        }
        function timeRanOut() {
            // stop round
            setVisibility(false)
            gameState = false

            // set end round (no time) styles
            emoteText.innerText = currentEmote.code
            winnerText.innerHTML = ``

            fadeOutAndSetRestartTimer()
        }
        function setVisibility(bool) {
            timerCircle.style.opacity = Number(bool)
        }
        return { 
            start,
            setVisibility
        }
    })()
})()