"use strict";
importScripts('../utils.js');
const BITS_PER_CELL = 4;
const BYTE_PER_CELL = BITS_PER_CELL / 8;
function markAsSusspicious(x, y, field, cols) {
    const index = x + y * cols;
    const byteIndex = index >> 1;
    const bitOffset = (index << 2) & 7;
    on(field, FLAGS.SUSS, byteIndex, bitOffset);
}
let handler = (e) => {
    const { height, width } = e.data;
    const buffer = new SharedArrayBuffer(Math.ceil((width * height) * BYTE_PER_CELL));
    const field = new Uint8Array(buffer);
    const generate = initGenerator(e.data, field);
    const [rows, cols, freeIndex] = generate();
    postMessage({ type: 'create', rows: rows, cols: cols, field, freeIndex });
    const next = (e) => {
        field.fill(0);
        const [rows, cols, freeIndex] = generate();
        postMessage({ type: 'repeat', rows: rows, cols: cols, field, freeIndex });
        return next;
    };
    return next;
};
onmessage = function (e) {
    handler = handler(e);
};
const initGenerator = ({ width: cols, height: rows, mines }, field) => {
    return () => {
        const randoms = new Uint8Array(0xffff);
        let randomsLimit = randoms.length - 1;
        let randomIndex = 0;
        let minesLeft = mines;
        let cellsLeft = cols * rows;
        let freeIndex = cellsLeft - 1;
        crypto.getRandomValues(randoms);
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const index = x + y * cols;
                const isBomb = randoms[randomIndex] <= (minesLeft / cellsLeft) * 0xff;
                if (isBomb) {
                    let byteIndex = index >> 1;
                    let bitOffset = (index << 2) & 7;
                    field[byteIndex] |= (0b1001 << (4 - bitOffset));
                    //top-left
                    x > 0 && y > 0 && markAsSusspicious(x - 1, y - 1, field, cols);
                    //top
                    y > 0 && markAsSusspicious(x, y - 1, field, cols);
                    //top-right
                    x + 1 < cols && y > 0 && markAsSusspicious(x + 1, y - 1, field, cols);
                    //left
                    x > 0 && markAsSusspicious(x - 1, y, field, cols);
                    //right
                    x + 1 < cols && markAsSusspicious(x + 1, y, field, cols);
                    //bottom-left
                    x > 0 && y + 1 < rows && markAsSusspicious(x - 1, y + 1, field, cols);
                    //bottom
                    y + 1 < rows && markAsSusspicious(x, y + 1, field, cols);
                    //bottom-right
                    x + 1 < cols && y + 1 < rows && markAsSusspicious(x + 1, y + 1, field, cols);
                    minesLeft--;
                }
                else {
                    freeIndex = index;
                }
                randomIndex++;
                cellsLeft--;
                if (index === randomsLimit) {
                    randomIndex = 0;
                    randomsLimit += randoms.length - 1;
                    crypto.getRandomValues(randoms);
                }
                minesLeft === 0 && (x = y = Infinity);
            }
        }
        return [rows, cols, freeIndex];
    };
};
