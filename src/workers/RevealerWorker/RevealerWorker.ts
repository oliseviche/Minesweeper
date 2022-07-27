importScripts('../../utils.js');
importScripts('../../linked-array.js');
importScripts('./Revealer.js');

const dispatcher = {
    postMessage: (arg: any) => postMessage(arg)
}
const revealer = new Revealer(dispatcher);
onmessage = function(e: MessageEvent<RevealerInitializeMessageData>) {
    revealer.parseEvent(e);
}