"use strict";
importScripts('../../utils.js');
const sourceMapNumbers = {
    0b0001: [0, 16 * 3, 16, 16],
    0b0010: [16, 16 * 3, 16, 16],
    0b0011: [32, 16 * 3, 16, 16],
    0b0100: [48, 16 * 3, 16, 16],
    0b0101: [64, 16 * 3, 16, 16],
    0b0110: [80, 16 * 3, 16, 16],
    0b0111: [96, 16 * 3, 16, 16],
    0b1000: [112, 16 * 3, 16, 16],
};
const bltFrom = [16, 16, 16, 16];
const bltFrom2 = [16 * 4, 16, 16, 16];
let debugMode = true;
const rendererWorker = {
    parseEvent(e) {
        this[e.data.type] && this[e.data.type](e.data);
    },
    loose() {
        this.isLoose = true;
    },
    hasMine(fieldX, fieldY) {
        const fieldIndex = fieldX + fieldY * this.COLS;
        const byteIndex = fieldIndex >> 1;
        const bitOffset = (fieldIndex << 2) & 7;
        return isOn(this.field, FLAGS.MINE, byteIndex, bitOffset);
    },
    init(data) {
        const canvas = data.canvas;
        this.context = canvas.getContext('2d');
        this.COLS = data.cols,
            this.ROWS = data.rows,
            this.field = data.field;
        this.bitmap = data.img;
        this.controlBus = data.controlBus;
        this.scale = Math.ceil(data.dpr);
        this.offset = { x: 0, y: 0 };
        this.highlighOrigin = { x: 0, y: 0 };
        this.highlightMask = { cols: {}, rows: {} };
        this.highlightOn = false;
        this.context.imageSmoothingEnabled = false;
        this.context.imageSmoothingQuality = 'low';
        this.context.setTransform(this.scale, 0, 0, this.scale, 0, 0);
        const elementDevicePixelsWidth = 16 * this.scale;
        const elementDevicePixelsHeight = 16 * this.scale;
        this.colsToRender = Math.ceil(canvas.width / elementDevicePixelsWidth) + 1;
        this.rowsToRender = Math.ceil(canvas.height / elementDevicePixelsHeight) + 1;
        this.buffer = new Uint8Array(this.colsToRender * this.rowsToRender);
        this.pitch = this.COLS;
        this.colFrom = 0;
        this.colTo = 0;
        this.rowFrom = 0;
        this.rowTo = 0;
        this.isLoose = false;
        //debug
        this.cellRendered = 0;
        this.render = this.render.bind(this);
        requestAnimationFrame(this.render);
    },
    calculateSurroundMines(colFrom, colTo, rowFrom, rowTo) {
        const field = this.field;
        const buffer = this.buffer;
        const colsToProcess = colTo - colFrom;
        const rowsToProcess = rowTo - rowFrom;
        for (let y = 0; y < rowsToProcess; y++) {
            for (let x = 0; x < colsToProcess; x++) {
                const fieldCol = x + colFrom;
                const fieldRow = y + rowFrom;
                const fieldIndex = fieldCol + fieldRow * this.COLS;
                const byteIndex = fieldIndex >> 1;
                const bitOffset = (fieldIndex << 2) & 7;
                let isMine = isOn(field, FLAGS.MINE, byteIndex, bitOffset); //(this.field[byteIndex] & (0b1000 << (4 - bitOffset))) > 0;
                let isSuss = isOn(field, FLAGS.SUSS, byteIndex, bitOffset); //(this.field[byteIndex] & (0b0001 << (4 - bitOffset))) === 0;
                let viewIndex = x + y * this.colsToRender;
                if (isMine === false && isSuss) {
                    //top-left
                    fieldCol > 0 && fieldRow > 0 && this.hasMine(fieldCol - 1, fieldRow - 1) && (buffer[viewIndex] += 1);
                    //top
                    fieldCol > 0 && this.hasMine(fieldCol, fieldRow - 1) && (buffer[viewIndex] += 1);
                    //top-right
                    fieldCol + 1 < this.COLS && fieldRow > 0 && this.hasMine(fieldCol + 1, fieldRow - 1) && (buffer[viewIndex] += 1);
                    //left
                    fieldCol > 0 && this.hasMine(fieldCol - 1, fieldRow) && (buffer[viewIndex] += 1);
                    //right
                    fieldCol + 1 < this.COLS && this.hasMine(fieldCol + 1, fieldRow) && (buffer[viewIndex] += 1);
                    //bottom-left
                    fieldCol > 0 && fieldCol < this.COLS && fieldRow + 1 < this.ROWS && this.hasMine(fieldCol - 1, fieldRow + 1) && (buffer[viewIndex] += 1);
                    //bottom
                    fieldRow + 1 < this.ROWS && this.hasMine(fieldCol, fieldRow + 1) && (buffer[viewIndex] += 1);
                    //bottom-right
                    fieldCol + 1 < this.COLS && fieldRow + 1 < this.ROWS && this.hasMine(fieldCol + 1, fieldRow + 1) && (buffer[viewIndex] += 1);
                }
            }
        }
    },
    panning(data) {
        this.offset.x = data.offset.x;
        this.offset.y = data.offset.y;
    },
    highlight(data) {
        var _a;
        this.highlighOrigin = data.point;
        this.highlightOn = (_a = data.on) !== null && _a !== void 0 ? _a : this.highlightOn;
        this.highlightMask.cols = { [data.point.x - 1]: 1, [data.point.x]: 1, [data.point.x + 1]: 1 };
        this.highlightMask.rows = { [data.point.y - 1]: 1, [data.point.y]: 1, [data.point.y + 1]: 1 };
    },
    render() {
        const startCol = (-this.offset.x / 16) | 0;
        const startRow = (-this.offset.y / 16) | 0;
        const pivotColumn = (this.offset.x / 16) | 0;
        const pivotRow = (this.offset.y / 16) | 0;
        const fieldColumFrom = Math.abs(Math.min(0, pivotColumn));
        const fieldRowFrom = Math.abs(Math.min(0, pivotRow));
        const fieldColumTo = Math.min(this.colsToRender - pivotColumn, this.COLS);
        const fieldRowTo = Math.min(this.rowsToRender - pivotRow, this.ROWS);
        const screenXStart = -startCol * 16 + (this.offset.x | 0) % 16;
        const screenYStart = -startRow * 16 + (this.offset.y | 0) % 16;
        this.context.setTransform(this.scale, 0, 0, this.scale, 0, 0);
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, 16 * this.colsToRender, 16 * this.rowsToRender);
        this.context.setTransform(this.scale, 0, 0, this.scale, screenXStart * this.scale, screenYStart * this.scale);
        const col = fieldColumFrom;
        const colTo = fieldColumTo;
        const row = fieldRowFrom;
        const rowTo = fieldRowTo;
        if (this.colFrom !== col || this.colTo !== colTo || this.rowFrom !== row || this.rowTo !== rowTo || this.controlBus[0] === 1) {
            this.colFrom = col;
            this.colTo = colTo;
            this.rowFrom = row;
            this.rowTo = rowTo;
            this.buffer.fill(0, 0);
            this.calculateSurroundMines(col, colTo, row, rowTo);
            this.controlBus[0] = 0;
        }
        for (let y = row; y < rowTo; y++) {
            for (let x = col; x < colTo; x++) {
                let fieldCellIndex = x + y * this.COLS;
                let byteIndex = fieldCellIndex >> 1;
                let bitOffset = (fieldCellIndex << 2) & 7;
                let isMine = (this.field[byteIndex] & (0b1000 << (4 - bitOffset))) > 0;
                let isVoid = (this.field[byteIndex] & (0b0001 << (4 - bitOffset))) === 0;
                let isOpen = (this.field[byteIndex] & (0b0010 << (4 - bitOffset))) > 0;
                let isMark = (this.field[byteIndex] & (0b0100 << (4 - bitOffset))) > 0;
                debugMode && isMine && (isOpen = true);
                !isOpen && !isMark && this.renderBaseTile(x, y);
                isMark && this.renderFlagTile(x, y);
                isMine && isOpen && this.renderMineTile(x, y);
                !isMark && !isMine && isVoid && isOpen && this.renderVoidTile(x, y, isOpen);
                ((!isMark && !isMine && !isVoid && isOpen) || debugMode) && this.renderNumber(x - col, y - row, x, y);
                this.highlightOn && !isOpen && !isMark && this.highlightMask.cols[x] && this.highlightMask.rows[y]
                    && this.renderHighlight(x, y);
            }
        }
        this.cellRendered = 0;
        requestAnimationFrame(this.render);
    },
    renderHighlight(x, y) {
        this.context.drawImage(this.bitmap, 96, 0, 16, 16, x * 16, y * 16, 16, 16);
    },
    renderBaseTile(x, y) {
        this.context.drawImage(this.bitmap, 16, 16, 16, 16, x * 16, y * 16, 16, 16);
        this.cellRendered++;
    },
    renderMineTile(x, y) {
        this.context.drawImage(this.bitmap, 112, 16, 16, 16, x * 16, y * 16, 16, 16);
        this.cellRendered++;
    },
    renderFlagTile(x, y) {
        this.context.drawImage(this.bitmap, 96, 16, 16, 16, x * 16, y * 16, 16, 16);
        this.cellRendered++;
    },
    renderVoidTile(x, y, isOpen) {
        const blt = isOpen && bltFrom2 || bltFrom;
        this.context.drawImage(this.bitmap, blt[0], blt[1], blt[2], blt[3], x * 16, y * 16, 16, 16);
        this.cellRendered++;
    },
    renderNumber(x, y, px, py) {
        let cellIndex = x + y * this.colsToRender;
        //if (this.buffer[cellIndex] >= 1) {
        const num = this.buffer[cellIndex] & 0b00001111;
        const srcRect = sourceMapNumbers[num];
        if (undefined !== srcRect) {
            this.context.drawImage(this.bitmap, srcRect[0], srcRect[1], srcRect[2], srcRect[3], px * 16, py * 16, 16, 16);
            this.cellRendered++;
        }
        //}
    },
};
onmessage = function (e) {
    rendererWorker.parseEvent(e);
};
