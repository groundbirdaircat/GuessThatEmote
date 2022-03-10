import { onDOMLoad, wait, randFloor, el } from '../utils/jsamutils.js'

onDOMLoad(init)

var mainImage, coverImage, imageDiv, 
channelInput, twitchChannelText, 
whichEmotesText,
twchCheckbox, ffzCheckbox, bttvCheckbox, tv7Checkbox, twglCheckbox, 
timeDisplay, timeSlider, 
generateButton, 
time = 5, emotesWarn = false, 
currentUrl = -1,

// emote urls
urlArray = [
    '110785/static/light/3.0',
    '58765/static/light/3.0',
    '114836/static/light/3.0',
    '58127/static/light/3.0',
    '425618/static/light/3.0'
],
urlPrefix = `https://static-cdn.jtvnw.net/emoticons/v2/`

function init(){
    mainImage = el('#mainimg')
    coverImage = el('#coverimg')
    imageDiv = el('#picdiv')
    channelInput = el('#textinput')
    twchCheckbox = el('#twchcheckbox')
    ffzCheckbox = el('#ffzcheckbox')
    bttvCheckbox = el('#bttvcheckbox')
    tv7Checkbox = el('#tv7checkbox')
    twglCheckbox = el('#twglcheckbox')
    timeDisplay = el('#timetext')
    timeSlider = el('#timeslider')
    generateButton = el('#generate')
    twitchChannelText = el('#texttwitchchannel')
    whichEmotesText = el('#textwhichemotes')

    timeSlider.addEventListener('input', sliderChange)

    // reset username error color
    // when username is changed
    channelInput.addEventListener('input', 
        ()=> setTextColor(twitchChannelText, 'white')
    )

    // reset emotes error color
    twchCheckbox.onclick = 
    twglCheckbox.onclick =  
    bttvCheckbox.onclick = 
    tv7Checkbox.onclick =
    ffzCheckbox.onclick = checkEmotesWarn

    generateButton.onclick = generateButtonPressed
    coverImage.onload = showEmote

    pickNewEmote()
}

function checkEmotesWarn(){
    if (!emotesWarn) return
    setTextColor(whichEmotesText, 'white')
    emotesWarn = false
}

function pickNewEmote(){
    // randomly pick emote index
    var picked = randFloor(urlArray.length)
    
    // don't use the same emote twice in a row
    if (picked == currentUrl) return pickNewEmote()

    // set picked emote src to elements
    // onload triggers showEmote()
    mainImage.src = 
    coverImage.src = urlPrefix + urlArray[picked]

    // track last used emote index
    currentUrl = picked
}

function showEmote(){
    imageDiv.style.opacity = 1
    wait(1000, fadeCoverImageOut)
}

function fadeCoverImageOut(){
    coverImage.style.transitionDuration = '5s'

    // fade out cover image to show actual emote
    wait(100, ()=> coverImage.style.opacity = 0)
    wait(6000, fadeImageDivOut)
}

function fadeImageDivOut(){
    // fade out wrapper div to switch emotes
    imageDiv.style.transitionDuration = '3s'
    imageDiv.style.opacity = 0

    // reset after fade
    wait(3000, ()=> {
        imageDiv.style.transitionDuration = '1s'
        coverImage.style.transitionDuration = '0s'
        coverImage.style.opacity = 1
        pickNewEmote()
    })
}

function updateWord(val, word) {
    // set time text
    timeDisplay.innerHTML = `${val}${word}`

    // multiply time value based on unit
    var multi
    if (word.startsWith(' s')) multi = 1
    else if (word.startsWith(' m')) multi = 60
    else if (word.startsWith(' h')) multi = 3600
    time = val*multi
}

function sliderChange(x){
    var val = Number(x.target.value)

    // scale time based on slider value
    if (val == 1) updateWord(1, ' second')
    else if (val <= 10) updateWord(val, ' seconds')
    else if (val < 20) updateWord(15, ' seconds')
    else if (val < 25) updateWord(20, ' seconds')
    else if (val < 30) updateWord(25, ' seconds')
    else if (val < 35) updateWord(30, ' seconds')
    else if (val < 40) updateWord(40, ' seconds')
    else if (val < 45) updateWord(50, ' seconds')
    else if (val < 50) updateWord(1, ' minute')
    else if (val < 55) updateWord(2, ' minutes')
    else if (val < 60) updateWord(3, ' minutes')
    else if (val < 65) updateWord(4, ' minutes')
    else if (val < 70) updateWord(5, ' minutes')
    else if (val < 75) updateWord(10, ' minutes')
    else if (val < 80) updateWord(15, ' minutes')
    else if (val < 85) updateWord(20, ' minutes')
    else if (val < 90) updateWord(25, ' minutes')
    else if (val < 95) updateWord(30, ' minutes')
    else if (val < 100) updateWord(45, ' minutes')
    else updateWord(1, ' hour')
}

function setTextColor(ref, color) {
    ref.style.color = color
    ref.style.textShadow = `0px 0px 15px ${color}`
}

function checkAllCheckboxes() {
    // make sure at least one box is checked
    if (!twchCheckbox.checked && 
        !ffzCheckbox.checked &&
        !bttvCheckbox.checked && 
        !twglCheckbox.checked &&
        !tv7Checkbox.checked) {
        emotesWarn = true
        return false
    }
    // reset warn color if test passed
    else { 
        setTextColor(whichEmotesText, 'white') 
        return true 
    }
}
async function fetchUsername(user) {
    // can't change username while fetching
    channelInput.readOnly = true

    if (!user) return

    return await fetch(
        `https://bigapi.glitch.me/gte/user/${user}`, 
        { method: 'GET' }
    )
    .then(res => res.json()) 
}

function generateButtonPressed(){
    var username = channelInput.value.trim()
    var checkboxPassed = checkAllCheckboxes()
    var textPassed = Boolean(username)

    // validate username before checking with server
    // can't be empty, normal characters only
    if (!textPassed || encodeURI(username).includes('%')) {
        setTextColor(twitchChannelText, 'red')
        if (!checkboxPassed) setTextColor(whichEmotesText, 'red')
        return 
    }

    // don't allow clicks when fetching
    generateButton.disabled = true

    // check that twitch username exists
    fetchUsername(username)
    .then(serverUsername => {
        // can change username after response
        channelInput.readOnly = false

        // double check checkbox validation
        if (!checkboxPassed) setTextColor(whichEmotesText, 'red')

        // check that server sent back a matching username
        if (serverUsername.toLowerCase() == username.toLowerCase()) {
            // forward user if name and checkboxes pass
            if (checkboxPassed) forwardUser()
        }
        else {
            setTextColor(twitchChannelText, 'red')
            // allow clicking 2 seconds after failed attempt
            wait(
                2000,
                ()=> generateButton.disabled = false
            )
        }
    })
}

function forwardUser(){
    // sends user to link page
    // with options passed as a query string
    location.href = 
    location.origin + 
    `/generate.html` +
    `?user=${channelInput.value.trim()}&`+
    `twgl=${Number(twglCheckbox.checked)}&`+
    `twch=${Number(twchCheckbox.checked)}&`+
    `bttv=${Number(bttvCheckbox.checked)}&`+
    `ffz=${Number(ffzCheckbox.checked)}&`+
    `tv7=${Number(tv7Checkbox.checked)}&`+
    `time=${time}`
}