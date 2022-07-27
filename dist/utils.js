"use strict";
const CELL_WIDTH = 16;
const CELL_HEIGHT = 16;
/*
0b0000
  ||||_ Suss bit
  |||__ Open bit
  ||___ Mark bit
  |____ Mine bit
*/
var FLAGS;
(function (FLAGS) {
    FLAGS[FLAGS["MINE"] = 8] = "MINE";
    FLAGS[FLAGS["MARK"] = 4] = "MARK";
    FLAGS[FLAGS["OPEN"] = 2] = "OPEN";
    FLAGS[FLAGS["SUSS"] = 1] = "SUSS";
})(FLAGS || (FLAGS = {}));
function isOn(vector, flags, byteIndex, bitOffset) {
    return (vector[byteIndex] & (flags << (4 - bitOffset))) > 0;
}
function off(vector, flags, byteIndex, bitOffset) {
    vector[byteIndex] &= ~(flags << (4 - bitOffset));
}
function on(vector, flags, byteIndex, bitOffset) {
    vector[byteIndex] |= (flags << (4 - bitOffset));
}
function getAdjacentColumnsAndRowsIndexesMatrix(cellIndex, columnsCount) {
    const row = ~~(cellIndex / columnsCount);
    const column = cellIndex - (row * columnsCount);
    return offsetsMatrix(column, row);
}
function offsetsMatrix(colum, row) {
    const matrix = [
        colum - 1, row - 1,
        colum, row - 1,
        colum + 1, row - 1,
        colum - 1, row,
        colum + 1, row,
        colum - 1, row + 1,
        colum, row + 1,
        colum + 1, row + 1
    ];
    return matrix;
}
function isPanEvent(evt) {
    return evt.detail.type === 'pan';
}
function isMarkEvent(evt) {
    return evt.detail.type === 'mark';
}
function isOpenEvent(evt) {
    return evt.detail.type === 'open';
}
function isHighlightEvent(evt) {
    return evt.detail.type === 'highlight';
}
function isRevealAdjuscentEvent(evt) {
    return evt.detail.type === 'reveal';
}
function getContext(canvas) {
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.imageSmoothingQuality = 'low';
    return context;
}
function getFeetScreenCenterOffset(fieldConfig, displayConfigs, scale) {
    const xCenter = (displayConfigs.width * displayConfigs.devicePixelRatio / scale) * .5;
    const YCenter = (displayConfigs.height * displayConfigs.devicePixelRatio / scale) * .5;
    const halfFieldWidth = (fieldConfig.width * CELL_WIDTH) * .5;
    const halfFieldHeight = (fieldConfig.height * CELL_HEIGHT) * .5;
    return { x: xCenter - halfFieldWidth, y: YCenter - halfFieldHeight };
}
function toggleUIElement(id) {
    const element = document.getElementById(id);
    element && (element.getAttribute('hidden') === '' ? element.removeAttribute('hidden')
        : element.setAttribute('hidden', ''));
}
