"use strict";
importScripts('../../utils.js');
importScripts('./Renderer.js');
const renderer = new Renderer();
onmessage = function (e) {
    renderer.parseEvent(e);
};
