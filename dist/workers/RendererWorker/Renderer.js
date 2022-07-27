"use strict";
const sourceMapNumbers = {
    1: [0, 16 * 3, 16, 16],
    2: [16, 16 * 3, 16, 16],
    3: [32, 16 * 3, 16, 16],
    4: [48, 16 * 3, 16, 16],
    5: [64, 16 * 3, 16, 16],
    6: [80, 16 * 3, 16, 16],
    7: [96, 16 * 3, 16, 16],
    8: [112, 16 * 3, 16, 16],
};
const HIDDEN_DM = [16, 16, 16, 16];
const REVEALED_DM = [16 * 4, 16, 16, 16];
const COMPLEMENTARY_CELLS = 2;
class Renderer {
    constructor() {
        this.isLoose = false;
        this.isWin = false;
        this.cols = 0;
        this.rows = 0;
        this.canvasScale = 0;
        this.initialOrigin = { x: 0, y: 0 };
        this.origin = { x: 0, y: 0 };
        this.highlighOrigin = { x: 0, y: 0 };
        this.highlightMask = { cols: {}, rows: {} };
        this.highlightOn = false;
        this.columnsToRender = 0;
        this.rowsToRender = 0;
        this.colFrom = 0;
        this.colTo = 0;
        this.rowFrom = 0;
        this.rowTo = 0;
        this.width = 0;
        this.height = 0;
        this.isDebug = false;
        this.canvasDirty = { needUpdate: false, lastX: 0, lastY: 0 };
        this.fps = { value: 0, ticks: 0, prev: 0, diff: 0 };
    }
    parseEvent(e) {
        this[e.data.type] && this[e.data.type](e.data);
    }
    init(data) {
        this.primaryCanvas = data.canvas;
        this.primaryContext = getContext(this.primaryCanvas);
        const { width, height } = this.primaryCanvas;
        this.width = width;
        this.height = height;
        this.secondaryCanvas = new OffscreenCanvas(this.width, this.height);
        this.secondaryContext = getContext(this.secondaryCanvas);
        this.highlightCanvas = new OffscreenCanvas(this.width, this.height);
        this.highlightContext = getContext(this.highlightCanvas);
        this.isDebug = data.isDebug;
        this.cols = data.cols,
            this.rows = data.rows,
            this.fieldArray = data.field;
        this.texture = data.img;
        this.controlBus = data.controlBus;
        this.canvasScale = data.scale;
        this.initialOrigin = data.offset;
        const elementPixelsWidth = CELL_WIDTH * this.canvasScale;
        const elementPixelsHeight = CELL_HEIGHT * this.canvasScale;
        this.columnsToRender = Math.floor(this.width / elementPixelsWidth) + COMPLEMENTARY_CELLS;
        this.rowsToRender = Math.floor(this.height / elementPixelsHeight) + COMPLEMENTARY_CELLS;
        this.numbersArray = new Uint8Array(this.columnsToRender * this.rowsToRender);
        this.fieldViewCacheArray = new Uint8Array(this.columnsToRender * this.rowsToRender);
        this.setDefaults();
        this.renderCallback = (time) => this.render(time);
        this.start();
    }
    reset() {
        cancelAnimationFrame(this.rafId);
        this.setDefaults();
    }
    start() {
        this.secondaryContext.clearRect(0, 0, this.secondaryCanvas.width, this.secondaryCanvas.height);
        this.rafId = requestAnimationFrame(this.renderCallback);
    }
    setDefaults() {
        this.origin = Object.assign({}, this.initialOrigin);
        this.highlighOrigin = { x: 0, y: 0 };
        this.highlightMask = { cols: {}, rows: {} };
        this.highlightOn = false;
        this.colFrom = 0;
        this.colTo = 0;
        this.rowFrom = 0;
        this.rowTo = 0;
        this.isLoose = false;
        this.isWin = false;
        this.numbersArray.fill(0);
        this.fieldViewCacheArray.fill(0);
        this.canvasDirty = {
            needUpdate: true,
            lastX: 0,
            lastY: 0,
        };
    }
    loose() {
        this.isLoose = true;
        this.canvasDirty.needUpdate = true;
    }
    win() {
        this.isWin = true;
        this.canvasDirty.needUpdate = true;
    }
    hasMine(fieldX, fieldY) {
        const fieldIndex = fieldX + fieldY * this.cols;
        const byteIndex = fieldIndex >> 1;
        const bitOffset = (fieldIndex << 2) & 7;
        return isOn(this.fieldArray, FLAGS.MINE, byteIndex, bitOffset);
    }
    calculateSurroundMines(colFrom, colTo, rowFrom, rowTo) {
        const field = this.fieldArray;
        const buffer = this.numbersArray;
        const colsToProcess = colTo - colFrom;
        const rowsToProcess = rowTo - rowFrom;
        for (let y = 0; y < rowsToProcess; y++) {
            for (let x = 0; x < colsToProcess; x++) {
                const fieldCol = x + colFrom;
                const fieldRow = y + rowFrom;
                const fieldIndex = fieldCol + fieldRow * this.cols;
                const byteIndex = fieldIndex >> 1;
                const bitOffset = (fieldIndex << 2) & 7;
                const isMine = isOn(field, FLAGS.MINE, byteIndex, bitOffset);
                const isSuss = isOn(field, FLAGS.SUSS, byteIndex, bitOffset);
                const viewIndex = x + y * this.columnsToRender;
                if (isMine === false && isSuss === true) {
                    //top-left
                    fieldCol > 0 && fieldRow > 0 && this.hasMine(fieldCol - 1, fieldRow - 1) && (buffer[viewIndex] += 1);
                    //top
                    fieldRow > 0 && this.hasMine(fieldCol, fieldRow - 1) && (buffer[viewIndex] += 1);
                    //top-right
                    fieldCol + 1 < this.cols && fieldRow > 0 && this.hasMine(fieldCol + 1, fieldRow - 1) && (buffer[viewIndex] += 1);
                    //left
                    fieldCol > 0 && this.hasMine(fieldCol - 1, fieldRow) && (buffer[viewIndex] += 1);
                    //right
                    fieldCol + 1 < this.cols && this.hasMine(fieldCol + 1, fieldRow) && (buffer[viewIndex] += 1);
                    //bottom-left
                    fieldCol > 0 && fieldCol < this.cols && fieldRow + 1 < this.rows && this.hasMine(fieldCol - 1, fieldRow + 1) && (buffer[viewIndex] += 1);
                    //bottom
                    fieldRow + 1 < this.rows && this.hasMine(fieldCol, fieldRow + 1) && (buffer[viewIndex] += 1);
                    //bottom-right
                    fieldCol + 1 < this.cols && fieldRow + 1 < this.rows && this.hasMine(fieldCol + 1, fieldRow + 1) && (buffer[viewIndex] += 1);
                }
            }
        }
    }
    checkChanges(colFrom, colTo, rowFrom, rowTo) {
        const field = this.fieldArray;
        const diffBuffer = this.fieldViewCacheArray;
        const colsToProcess = colTo - colFrom;
        const rowsToProcess = rowTo - rowFrom;
        let changed = false;
        for (let y = 0; y < rowsToProcess; y++) {
            for (let x = 0; x < colsToProcess; x++) {
                const fieldCol = x + colFrom;
                const fieldRow = y + rowFrom;
                const fieldIndex = fieldCol + fieldRow * this.cols;
                const fieldByteIndex = fieldIndex >> 1;
                const viewIndex = x + y * this.columnsToRender;
                if (diffBuffer[viewIndex] !== field[fieldByteIndex]) {
                    changed = true;
                    diffBuffer[viewIndex] = field[fieldByteIndex];
                    this.controlBus[1] += 1;
                }
            }
        }
        return changed;
    }
    panning(data) {
        this.origin.x = data.offset.x;
        this.origin.y = data.offset.y;
    }
    highlight(data) {
        var _a;
        this.highlighOrigin = data.point;
        this.highlightOn = (_a = data.on) !== null && _a !== void 0 ? _a : this.highlightOn;
        this.highlightMask.cols = { [data.point.x - 1]: 1, [data.point.x]: 1, [data.point.x + 1]: 1 };
        this.highlightMask.rows = { [data.point.y - 1]: 1, [data.point.y]: 1, [data.point.y + 1]: 1 };
    }
    render(time) {
        var _a, _b, _c, _d, _e, _f;
        const startCol = (this.origin.x / 16);
        const startRow = (this.origin.y / 16);
        const screenXStart = (startCol << 4) + (~~this.origin.x % 16);
        const screenYStart = (startRow << 4) + (~~this.origin.y % 16);
        const translateX = screenXStart * this.canvasScale;
        const translateY = screenYStart * this.canvasScale;
        this.secondaryContext.setTransform(this.canvasScale, 0, 0, this.canvasScale, translateX, translateY);
        this.highlightContext.setTransform(this.canvasScale, 0, 0, this.canvasScale, translateX, translateY);
        const lastColTo = (_a = this.colTo) !== null && _a !== void 0 ? _a : 0;
        const lastColFrom = (_b = this.colFrom) !== null && _b !== void 0 ? _b : 0;
        const lastRowTo = (_c = this.rowTo) !== null && _c !== void 0 ? _c : 0;
        const lastRowFrom = (_d = this.rowFrom) !== null && _d !== void 0 ? _d : 0;
        let col = Math.abs(Math.min(0, ~~startCol));
        let colTo = Math.min(col + (Math.floor(((this.secondaryCanvas.width / this.canvasScale) - Math.max(0, this.origin.x)) / CELL_WIDTH) + COMPLEMENTARY_CELLS), this.cols);
        let row = Math.abs(Math.min(0, ~~startRow));
        let rowTo = Math.min(row + (Math.floor(((this.secondaryCanvas.height / this.canvasScale) - Math.max(0, this.origin.y)) / CELL_HEIGHT) + COMPLEMENTARY_CELLS), this.rows);
        if (this.colFrom !== col || this.colTo !== colTo || this.rowFrom !== row || this.rowTo !== rowTo ||
            this.hasUncommtedCommitedChanges() || this.canvasDirty.needUpdate) {
            this.colFrom = col;
            this.colTo = colTo;
            this.rowFrom = row;
            this.rowTo = rowTo;
            this.numbersArray.fill(0, 0);
            this.calculateSurroundMines(col, colTo, row, rowTo);
        }
        if (this.hasUncommtedCommitedChanges()) {
            const wasChnaged = this.checkChanges(col, colTo, row, rowTo);
            if (wasChnaged) {
                this.canvasDirty.needUpdate = true;
            }
            else {
                if (this.controlBus[0] === 0) {
                    this.canvasDirty.needUpdate = true;
                }
                this.syncCommitedChanges();
            }
        }
        /**
         * Render full field
         */
        if (this.canvasDirty.needUpdate) {
            this.canvasDirty.needUpdate = false;
            this.renderField(col, colTo, row, rowTo);
            this.canvasDirty.lastX = screenXStart;
            this.canvasDirty.lastY = screenYStart;
        }
        /**
         * Render mouse cells highlight
         */
        this.renderHighlights(-screenXStart, -screenYStart, col, colTo, row, rowTo);
        const offsetX = (_e = screenXStart - this.canvasDirty.lastX) !== null && _e !== void 0 ? _e : screenXStart;
        const offsetY = (_f = screenYStart - this.canvasDirty.lastY) !== null && _f !== void 0 ? _f : screenYStart;
        /**
         * Translate secondary buffer on paning, omiting full redraw on each frame
         */
        this.secondaryContext.save();
        this.secondaryContext.globalCompositeOperation = 'copy';
        this.secondaryContext.setTransform(1, 0, 0, 1, 0, 0);
        this.secondaryContext.drawImage(this.secondaryCanvas, offsetX * this.canvasScale, offsetY * this.canvasScale);
        this.secondaryContext.restore();
        /**
         * Render updated columns only
         */
        if (offsetX !== 0) {
            const fromX = offsetX < 0 ? Math.max(0, lastColTo - 2) : col;
            const toX = offsetX > 0 ? Math.min(lastColFrom + 2, this.cols) : colTo;
            this.renderField(fromX, toX, row, rowTo, col, row);
        }
        /**
         * Render updated rows only
         */
        if (offsetY !== 0) {
            const fromY = offsetY < 0 ? Math.max(0, lastRowTo - 2) : row;
            const toY = offsetY > 0 ? Math.min(lastRowFrom + 2, this.rows) : rowTo;
            this.renderField(col, colTo, fromY, toY, col, row);
        }
        /**
         * Push everyting back to primary surface
         */
        this.primaryContext.clearRect(0, 0, this.width, this.height);
        this.primaryContext.drawImage(this.secondaryCanvas, 0, 0);
        this.primaryContext.drawImage(this.highlightCanvas, 0, 0);
        /**
         * How good we perform?
         */
        this.renderFPS(time, 0, 0);
        this.canvasDirty.lastX = screenXStart;
        this.canvasDirty.lastY = screenYStart;
        this.rafId = requestAnimationFrame(this.renderCallback);
    }
    hasUncommtedCommitedChanges() {
        return this.controlBus[0] !== this.controlBus[1];
    }
    syncCommitedChanges() {
        this.controlBus[0] = this.controlBus[1];
    }
    renderField(column, columnTo, row, rowTo, numberColumn = column, numberRow = row) {
        for (let y = row; y < rowTo; y++) {
            const pitch = y * this.cols;
            for (let x = column; x < columnTo; x++) {
                const fieldCellIndex = x + pitch;
                const byteIndex = fieldCellIndex >> 1;
                const bitOffset = (fieldCellIndex << 2) & 7;
                let isMine = isOn(this.fieldArray, FLAGS.MINE, byteIndex, bitOffset);
                let isSuss = isOn(this.fieldArray, FLAGS.SUSS, byteIndex, bitOffset);
                let isOpen = isOn(this.fieldArray, FLAGS.OPEN, byteIndex, bitOffset);
                let isMark = isOn(this.fieldArray, FLAGS.MARK, byteIndex, bitOffset);
                let showAllMines = this.isDebug || this.isLoose;
                let showAllFlags = this.isWin;
                !isOpen && !isMark && this.renderBaseTile(x, y, this.secondaryContext) ||
                    (isMark || (showAllFlags && isMine)) && this.renderFlagTile(x, y, this.secondaryContext) ||
                    isMine && !isOpen && showAllMines && this.renderMineTile(x, y, this.secondaryContext) ||
                    isMine && isOpen && showAllMines && this.renderDoomMineTile(x, y, this.secondaryContext) ||
                    !isMine && isMark && showAllMines && this.renderFalsyMineTile(x, y, this.secondaryContext) ||
                    !isMark && !isMine && !isSuss && isOpen && this.renderVoidTile(x, y, isOpen, this.secondaryContext) ||
                    ((!isMark && !isMine && isSuss && isOpen) || this.isDebug) && this.renderNumber(x - numberColumn, y - numberRow, x, y, this.secondaryContext);
            }
        }
    }
    renderHighlights(screenXStart, screenYStart, column, columnTo, row, rowTo) {
        this.highlightContext.clearRect(screenXStart, screenYStart, CELL_WIDTH * this.columnsToRender, CELL_HEIGHT * this.rowsToRender);
        for (let y = row; y < rowTo; y++) {
            const pitch = y * this.cols;
            for (let x = column; x < columnTo; x++) {
                const fieldCellIndex = x + pitch;
                const byteIndex = fieldCellIndex >> 1;
                const bitOffset = (fieldCellIndex << 2) & 7;
                let isOpen = isOn(this.fieldArray, FLAGS.OPEN, byteIndex, bitOffset);
                let isMark = isOn(this.fieldArray, FLAGS.MARK, byteIndex, bitOffset);
                this.highlightOn && !isOpen && !isMark && this.highlightMask.cols[x] && this.highlightMask.rows[y]
                    && this.renderHighlight(x, y, this.highlightContext);
            }
        }
    }
    renderHighlight(x, y, context) {
        context.drawImage(this.texture, 96, 0, 16, 16, x * 16, y * 16, 16, 16);
    }
    renderBaseTile(x, y, context) {
        context.drawImage(this.texture, 16, 16, 16, 16, x * 16, y * 16, 16, 16);
    }
    renderMineTile(x, y, context) {
        context.drawImage(this.texture, 112, 16, 16, 16, x * 16, y * 16, 16, 16);
    }
    renderDoomMineTile(x, y, context) {
        context.drawImage(this.texture, 112, 32, 16, 16, x * 16, y * 16, 16, 16);
    }
    renderFalsyMineTile(x, y, context) {
        context.drawImage(this.texture, 96, 32, 16, 16, x * 16, y * 16, 16, 16);
    }
    renderFlagTile(x, y, context) {
        context.drawImage(this.texture, 96, 16, 16, 16, x * 16, y * 16, 16, 16);
    }
    renderVoidTile(x, y, isOpen, context) {
        const dm = isOpen && REVEALED_DM || HIDDEN_DM;
        context.drawImage(this.texture, dm[0], dm[1], dm[2], dm[3], x * 16, y * 16, 16, 16);
    }
    renderNumber(x, y, px, py, context) {
        const cellIndex = x + y * this.columnsToRender;
        if (this.numbersArray[cellIndex] > 0) {
            const num = this.numbersArray[cellIndex] & 0b00001111;
            const srcRect = sourceMapNumbers[num];
            if (undefined !== srcRect) {
                context.drawImage(this.texture, srcRect[0], srcRect[1], srcRect[2], srcRect[3], px * 16, py * 16, 16, 16);
            }
        }
    }
    renderFPS(time, x, y) {
        this.fps.ticks++;
        this.fps.diff += time - this.fps.prev;
        this.fps.prev = time;
        if (this.fps.diff >= 1000) {
            this.fps.value = this.fps.ticks;
            this.fps.ticks = 0;
            this.fps.diff = 0;
        }
        this.primaryContext.font = `bold 25px 'VT323', monospace`;
        this.primaryContext.fillStyle = '#000000';
        this.primaryContext.fillText('' + this.fps.value, x + 16, y + 27);
    }
}
