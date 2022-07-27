"use strict";
importScripts('../../utils.js');
importScripts('../../linked-array.js');
importScripts('./Revealer.js');
const dispatcher = {
    postMessage: (arg) => postMessage(arg)
};
const revealer = new Revealer(dispatcher);
onmessage = function (e) {
    revealer.parseEvent(e);
};
