export {
    color, 
    wait, 
    div, create, el,
    rand, randFloor, randBool,
    pxToVmax, pxToVmin, msToTime,
    angle, distance, 
    noResizeTransition,
    onDOMLoad
}

///////////////
// COLOR LOG //
///////////////

const color = (function colorLogModule(){

    const api = { 
        log: colorLog,
        err: colorError,
    }

    function colorLog(...args){
        var stack = (new Error).stack
        var [fileOrigin, stackLine] = 
            getLineAndFileFromStack(stack)
        var styles = getStyles([args[args.length - 1]])
        if (styles != getStyles()) args.pop()

        if(checkArrayAllNumString(args)){
            // if all args are nums and/or strings
            // concat to one line
            let groupTitle = concatArrayOfNumsAndStrings(args)
            console.groupCollapsed(
                `%c🔰   ${groupTitle}  ` + 
                `[${fileOrigin}]  [${stackLine}]`,
                styles
            )
                console.trace('')
            console.groupEnd()
        }
        else {
            // if any are not num or string
            // use regular log inside of group
            let groupTitle = `Logging ${args.length}` +
                ` item${args.length > 1 ? 's' : ''}`
            console.group(
                `%c🔰   ${groupTitle}  ` + 
                `[${fileOrigin}]  [${stackLine}]`,
                styles
            )
                console.log(...args)
                console.groupCollapsed(
                    '%ctrace', 
                    getStyles([
                        'blue', 
                        'lesspadding', 
                        'nobg', 
                        'small'
                    ]))
                    console.trace('')
                console.groupEnd()
            console.groupEnd()
        }
    }

    function colorError(what, err){
        [what, err] = formatWhatAndError(what, err)
        var stack = err.stack
        var msg = what + 
            ` ${err.stack.split(':')[0]}` + 
            ` : ${err.message}`
        var [fileOrigin, stackLine] = 
            getLineAndFileFromStack(stack)

        console.groupCollapsed(
            `%c🚩  ${msg}  [${fileOrigin}]` +
            `  [${stackLine}]`,
            getStyles(['big', 'red'])
        )
            console.trace('')
        console.groupEnd()
    }

////////// private //////////

    function formatWhatAndError(what, err){
        if (!err){
            err = what instanceof Error ? 
                  what : new Error(what)
            what = ''
        }
        else {
            err = err instanceof Error ? 
                  err : new Error(err)
        }
        return [what, err]
    }

    function checkArrayAllNumString(array){
        var passed = true
        for (let x of array) {
            if (typeof x != 'number' &&
                typeof x != 'string'){
                    passed = false
                    break
                }
        }
        return passed
    }

    function concatArrayOfNumsAndStrings(array){
        return array.reduce(
            function arrayToConcatedString(acc, cur){
                return acc + ' ' + cur
            }, ''
        )
    }

    function getLineAndFileFromStack(stack){
        var split = stack.split(':')
        var [file, line] = searchForWaitFnInStack(split)
        line = line || split[split.length - 2]
        file = file || split[split.length-3].split('/')[1]
        return [file, line]
    }

    function searchForWaitFnInStack(split){
        var returnData = [null, null]
        for (let i = 0, l = split.length; i < l - 1; i++){
            if (split[i].includes('waitFnExecuted')){
                returnData = [
                    split[i-2].split('/')[1], // file
                    split[i-1] // line
                ]
                break
            }
        }
        return returnData
    }

    function getStyles(types = []){
        // reduce multi arg string to array
        // 'red big' --> ['red', 'big']
        types = types.reduce(
            typesStringReducer, 
            []
        )
        // reduce array to valid style string
        var styles =  (
            types.length ?
            (
                types.reduce(
                    styleTypeReducer, 
                    logStyles.default
                )
            ) : 
            logStyles.default
        ).join(';')
        return styles
    }

    function typesStringReducer(acc, cur){
        if (!cur.split) return acc
        return acc.concat(cur.split(' '))
    }

    function styleTypeReducer(acc, cur){
        cur = cur.toLowerCase()
        return (
            logStyles[cur] ?
            acc.concat(logStyles[cur]) :
            acc
        )
    }

    const logStyles = {
        default: [
            'color: #aaa', 
            'padding: 2px', 
            'padding-left: 16px', 
            'padding-right: 16px',
            'border-radius: 16px',
            'font-family: verdana',
            'background-color: black',
        ],
        red: [ 'color: crimson', ],
        orange: [ 'color: darkorange', ],
        yellow: [ 'color: gold', ],
        green: [ 'color: yellowgreen', ],
        blue: [ 'color: deepskyblue', ],
        purple: [ 'color: darkorchid', ],
        small: [ 'font-size: 8px', ],
        lesspadding: [ 
            'padding: 0px',
            'padding-left: 6px', 
            'padding-right: 6px', 
        ],
        nobg: [
            'background-color: transparent',
        ],
        big: [
            'font-size: 16px',
            'font-weight: bold',
        ],
        huge: [
            'font-size: 24px',
            'font-weight: bold',
        ],
    }
    return api
})()

//////////////////
// WAIT TIMEOUT //
//////////////////

const wait = (function waitWrapper(){

    function wait(ms, fn){
        var [timeout, state, fn] = 
            verifyWait(ms, fn, waitFnExecuted)

        function clear(silent){
            if (silent) state = silentClear(state, timeout)
            else state = verifyClear(state, timeout)
        }
        function waitFnExecuted(){
            state = 3
            fn()
        }
        return { clear }
    }

////////// private //////////

    const states = [
        'waiting', 
        'failed init', 
        'cleared', 
        'executed'
    ]

    function verifyWait(ms, fn, waitFnEx){
        var timeout, state = 0
        if (!fn && typeof ms == 'function') {
            fn = ms
            ms = 0
        }
        else if (typeof fn != 'function') {
            state = 1
            color.err(
                `'wait'`,
                `requires 'function' but got ` +
                `'${typeof fn}'`,
            )
        }
        if (!state) timeout = setTimeout(waitFnEx, ms)
        return [timeout, state, fn]
    }

    function verifyClear(state, timeout){
        if (state) {
            color.err(
                `'wait'`, 
                `nothing to clear ` +
                `(${(state > 1 ? 
                    'already ' : '') + states[state]})`
            )
        }
        else {
            clearTimeout(timeout)
            state = 2
        }
        return state
    }

    function silentClear(state, timeout){
        if (!state) state = 2
        clearTimeout(timeout)
        return state
    }

    return wait

})()

////////////////////
// ELEMENT THINGS //
////////////////////

function div(classList, appendTo){
    try {
        if (typeof appendTo != 'undefined' &&
            !appendTo.append) {
            throw new Error(
                `Can't append to ${typeof(appendTo)}`
            )
        }
        let newDude = makeElem('div', classList)
        if (appendTo) appendTo.append(newDude)
        return newDude
    }
    catch (err){
        color.err(`'div'`, err)
    }
}

function create(what, classList, appendTo){
    try {
        if (typeof appendTo != 'undefined' &&
            !appendTo.append) {
            throw new Error(
                `Can't append to ${typeof(appendTo)}`
            )
        }
        let newDude = makeElem(what, classList)
        if (appendTo) appendTo.append(newDude)
        return newDude
    }
    catch (err){
        color.err(`'create'`, err)
    }
}

function el(identifier){
    if (!identifier) {
        return color.err(
            `'el'`, 
            `identifier required`
        )
    }
    if (typeof identifier != 'string') {
        return color.err(
            `'el'`, 
            `identifier must be a string`
        )
    }

    var found = document.querySelector(identifier)
    if (!found) {
        return color.err(
            `'el'`, 
            `didn't find element (${identifier})`
        )
    }
    return found
}

////////// private //////////

function makeElem(what, classList){
    var newDude = document.createElement(what)
    newDude.setAttribute('draggable', false)
    newDude.classList = classList
    return newDude
}

/////////////
// RANDOMS //
/////////////

function rand(min, max){
    [min, max] = setRandMinMax(min, max)
    return Math.random()*(max-min)+min
}

function randFloor(min, max){
    [min, max] = setRandMinMax(min, max)
    return Math.floor(Math.random()*(max-min)+min)
}

function randBool(){
    return Boolean(randFloor(2))
}
////////// private //////////

function setRandMinMax(min, max){
    if (min == undefined && 
        max == undefined) [min, max] = [0, 1]
    else if (max == undefined) {
        max = 0
    }
    if (max < min) [min, max] = [max, min]
    return [min, max]
}

////////////////
// CONVERTERS //
////////////////

function pxToVmax(pixels){
    if (pxToNumCheck(pixels)) return
    return pxToV(pixels, 'max')
}

function pxToVmin(pixels){
    if (pxToNumCheck(pixels)) return
    return pxToV(pixels, 'min')
}

function msToTime(ms){
    var sec = ms / 1000,
    min = Math.floor(sec / 60),
    hour = Math.floor(min / 60),
    day = Math.floor(hour / 24),
    onlySec = Math.floor(sec % 60),
    onlyMin = Math.floor(min % 60),
    onlyHour = Math.floor(hour % 24),
    secText = onlySec === 0 ? '' :
        onlySec > 1 ? onlySec + ' seconds' :
        '1 second',
    minText = onlyMin === 0 ? '' :
        onlyMin > 1 ? onlyMin + ' minutes' :
        '1 minute',
    hourText = onlyHour === 0 ? '' :
        onlyHour > 1 ? onlyHour + ' hours' :
        '1 hour',
    dayText = day === 0 ? '' :
        day > 1 ? day + ' days' :
        '1 day',
    minAndText = minText &&
        secText ? ' and ' : '',
    hourAndText = hourText && minText && secText ?
        ', ' : hourText && (minText || secText) ?
        ' and ' : '',
    valueCount = dayText && countValues(
        hourText,
        minText,
        secText
    ),
    dayAndText = dayText && valueCount > 1 ? ', ' : 
        dayText && valueCount ? ' and ' : ''

    return (
        `${dayText}${dayAndText}` + 
        `${hourText}${hourAndText}` + 
        `${minText}${minAndText}${secText}`
    )
}

////////// private //////////

function countValues(...values){
    var count = values.reduce(
        (a, c)=> c ? a + 1 : a
    , 0)
    return count
}

function pxToV(pixels, minOrMax){
    return (
        100 * pixels / (minOrMax == 'min' ? 
        Math.min : Math.max)(
            window.innerHeight,
            window.innerWidth
        )
    )
}

function pxToNumCheck(pixels){
    if (typeof pixels != 'number') {
        color.err(
            `'pxToV'`,
            `requires 'number' ` +
            `but got '${typeof pixels}'`
        )
        return true
    }
    return false
}

//////////////////
// CALCULATIONS //
//////////////////

function angle(x1, y1, x2, y2){
    var theta = Math.atan2(
        y2 - y1, 
        x2 - x1
    ) * -180 / Math.PI + 90
    if (theta < 0) theta += 360
    return theta
}

function distance(x1, y1, x2, y2){
    return Math.sqrt((x1 - x2)**2 + (y1 - y2)**2)
}

//////////////////////////
// NO RESIZE TRANSITION //
//////////////////////////

const noResizeTransition = (function noResizeModule(){

    const api = { 
        add,
        remove,
        inspect
    }
    
    var allElements = []

    function add(...elements){
        if (!elements.length) return color.err(
            `'noResizeTransition'`, 
            `'add' requires at least 1 element`
        )

        elements.forEach(element => {
            if (!element?.classList?.add) {
                return color.err(
                    `'noResizeTransition'`, 
                    `can't add class ` +
                    `to ${typeof element}`
                )
            }
            allElements.push(element)
        })
    }
    function remove(...elements){
        if (!elements.length) return color.err(
            `'noResizeTransition'`, 
            `'remove' requires at least 1 element`
        )
        allElements = allElements
            .filter(x=>!elements.includes(x))
    }
    function inspect(){
        color.log(allElements)
    }

////////// private //////////

    { // scope block
        addEventListener('resize', handleResize)
        let timeout

        function handleResize(){
            if (timeout) clearTimeout(timeout)
            else addClass()
            timeout = setTimeout(removeClass, 250)
        }
        function removeClass(){
            timeout = null
            allElements.forEach(element =>
                element.classList.remove('notransition')
            )
        }
        function addClass(){
            if (!allElements.length) return
            allElements.forEach(element =>
                element.classList.add('notransition')
            )
        }
    }

    return api
    
})()

/////////////////
// ON DOM LOAD //
/////////////////

function onDOMLoad(...fns){
    if (!fns.length) return color.err(
        'onDOMLoad',
        'requires at least one function'
    )
    fns.forEach(function verifyLoadFns(fn){
        if (typeof fn != 'function') color.err(
            'onDOMLoad',
            'requires a function but received a ' +
            typeof fn
        )
    })
    if (document.readyState == 'complete') {
        wait(executeInitFns)
    }
    else {
        addEventListener(
            'DOMContentLoaded', 
            executeInitFns
        )
    }
    function executeInitFns(){
        fns.forEach(function execInitFn(fn){
            if (typeof fn == 'function') fn()
        })
        removeEventListener(
            'DOMContentLoaded', 
            executeInitFns
        )
    }
}