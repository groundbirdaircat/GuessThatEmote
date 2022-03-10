import { onDOMLoad, wait, el } from '../utils/jsamutils.js'

onDOMLoad(init)

var theLink

function init(){
    theLink = el('#input')
    theLink.onclick = handleLinkClicked
    
    parseQueryStringToObj()

    // fade out image cover
    wait(100, ()=> el('#seemsgoodcover').style.opacity = 0)
}

function handleLinkClicked(){
    // copy the link to clipboard
    theLink.select()
    document.execCommand('copy')

    // flash green when copied
    theLink.style.transition = '0s'
    theLink.style.boxShadow = '0px 0px 20px limegreen'

    // reset styles after click
    wait(500, ()=> {
        theLink.style.transition = '5s'
        theLink.style.boxShadow = '0px 0px 20px #777777'
    })
    wait(1000, ()=> theLink.style.transition = '0s')
}

function parseQueryStringToObj(){
    // get passed settings from setup page
    var string = location.search.substr(1)
    if (!string) return setLinkError()

    // parse query string into
    // array of objects
    var split = string.split('&')
    var mapped = split.map(value => {
        let subSplit = value.split('=')
        return {
            key: subSplit[0],
            value: subSplit[1]
        }
    })

    // defaults shouldn't matter
    // unless query string is edited
    var parsed = {
        user: '',
        time: 5,
        twgl: 0,
        twch: 0,
        ffz: 0,
        bttv: 0,
        tv7: 0
    }
    mapped.forEach(obj => {
        parsed[obj.key] = obj.value
    })
    
    setLinkValue(parsed)
}

function setLinkValue(obj){
    // check for errors
    for (let value of Object.values(obj)){
        if (value == undefined) {
            return setLinkError()
        }
    } 

    // create number link string
    var string = 
        `${obj.user}/${obj.time}/` +
        `${obj.twch}/${obj.twgl}/` +
        `${obj.bttv}/${obj.ffz}/` +
        `${obj.tv7}`
    string = string.toUpperCase()
    var numString = ''
    for (let char of string){
        numString += char.charCodeAt(0)
    }

    // set link value
    theLink.value = 
        location.origin +
        '/overlay.html?' +
        numString
}

function setLinkError(){
    theLink.value = 'Error generating link :('
}