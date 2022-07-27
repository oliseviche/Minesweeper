importScripts('../../utils.js');
importScripts('./Renderer.js');

const renderer = new Renderer();
onmessage = function(e: MessageEvent<RendererProcessMessage>) {
    renderer.parseEvent(e);
}