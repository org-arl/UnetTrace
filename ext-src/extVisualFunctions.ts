/* eslint-disable no-useless-escape */
/* eslint-disable prefer-const */

/**
 * A function to split the component into useful parts.
 * @param s the component string
 * @returns an array containing split component parts [agent_name, clazz, node]
 */
function splitComponents(s: string) {
    const regexName = /\w.*(?=::)/;
    const regexClazz = /[^\.]*(?=\/)/;
    const regexNode = /[^\/]*$/;

    let regName = regexName.exec(s);
    let compName = "";
    if (regName) {
        compName = regName[0];
    }
    let regClazz = regexClazz.exec(s);
    let compClazz = "";
    if (regClazz) {
        compClazz = regClazz[0];
    }
    let regNode = regexNode.exec(s);
    let compNode = "";
    if (regNode) {
        compNode = regNode[0];
    }

    return [compName, compClazz, compNode];
}


/**
 * A function to find the index of the trace a given event belongs to.
 * @param cache an dictionary that maps the eventID to index in the traces list
 * @param eventRow an event at a particular row in trace.json
 * @returns the index of the trace the event belongs to; otherwise undefined
 */
function findTrace(cache: { [id: string]: number; }, eventRow: { [x: string]: any; }) {
    if ("threadID" in eventRow) {
        let id: string = eventRow["threadID"];
        if (id in cache) {
            return cache[id];
        }
    }
    if ("stimulus" in eventRow) {
        let id: string = eventRow["stimulus"]["messageID"];
        if (id in cache) {
            return cache[id];
        }
    }
    return undefined;
}

/**
 * A function to pretty print a message.
 * @param msg either a stimulus or response message from a given event
 * @returns a string that is pretty formatted
 */
function prettyMessage(msg: { [header: string]: string; }) {
    let clazz = msg["clazz"];
    let p = clazz.lastIndexOf(".");
    if (p !== -1) {
        //get the last clazz after the last '.'
        clazz = clazz.substring(p + 1);
    }
    let sender = "";
    if ("sender" in msg) {
        sender = msg["sender"];
    }
    let recipient = "";
    if ("recipient" in msg) {
        recipient = msg["recipient"];
    }
    return `${clazz} [[${sender} -> ${recipient}]]`;
}

/**
 * A function to cache the index of the trace that a given event belongs to.
 * @param cache an dictionary that maps the eventID to index in the traces list
 * @param eventRow an event at a particular row in trace.json
 * @param traceID the index of the trace that the event belongs to
 */
function addToCache(cache: { [id: string]: number; }, eventRow: { [x: string]: any; }, traceID: number) {
    if ("threadID" in eventRow) {
        let id: string = eventRow["threadID"];
        cache[id] = traceID;
    }
    if ("stimulus" in eventRow) {
        let id: string = eventRow["stimulus"]["messageID"];
        cache[id] = traceID;
    }
    if ("response" in eventRow) {
        let id: string = eventRow["response"]["messageID"];
        cache[id] = traceID;
    }
}

/**
 * Public function to analyse a group of events from a session and groups them into different traces. Credit: https://github.com/org-arl/unet-contrib/blob/master/tools/viztrace/viztrace.jl
 * @param events group of events from a session
 * @returns list of tuples of size equal to number of traces e.g. [(time, desc, traceOfEvents), ...]
 */
export function analyse(event: Array<{ [header: string]: any }>) {
    let events = event[0]
    let traces: Array<[number, string, Array<{ [header: string]: any }>]> = [];
    let cache: { [id: string]: number; } = {};
    for (let i = 0; i < events.length; i++) {
        let eventRow = events[i];
        let traceID = findTrace(cache, eventRow);
        if (traceID === undefined) {
            let compArray = splitComponents(eventRow["component"]);
            let cname = compArray[0];
            let cnode = compArray[2];
            if (cnode !== "") {
                cnode = `[${cnode}]`;
            }
            let desc = cnode + " " + cname;
            if ("stimulus" in eventRow) {
                desc = cnode + " " + prettyMessage(eventRow["stimulus"]);
            } else if ("response" in eventRow) {
                desc = cnode + " " + prettyMessage(eventRow["response"]);
            }
            traces.push([eventRow["time"], desc, [eventRow]]);
            traceID = traces.length - 1;
        } else {
            traces[traceID][2].push(eventRow);
        }
        addToCache(cache, eventRow, traceID);
    }
    return traces;
}