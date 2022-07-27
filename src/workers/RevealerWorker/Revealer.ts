(function(exports){
class Revealer {
    cols: number = 0;
    rows: number = 0;
    mines: number = 0;
    field!: Uint8Array;
    freeIndex: number = 0;
    controlBus!: Uint32Array;
    revealedCount: number = 0;
    halt: boolean = true;
    rafId!: number;
    revealCallback!: (index: number, node: LinkedArray) => void;

    constructor(private dispatcher: {postMessage:(message: any) => void}) {
    }

    parseEvent(e: MessageEvent<RevealerInitializeMessageData>) {
        this[e.data.type] && this[e.data.type](e.data);
    }

    init(data: RevealerInitializeMessageData) {
        this.cols = data.cols;
        this.rows = data.rows;
        this.mines = data.mines;
        this.field = data.field;
        this.freeIndex = data.freeIndex;
        this.controlBus = data.controlBus;
        this.rafId = 0;

        this.setDefaults();
        this.start();
    }

    commitChange(value?: 0) {
        if (value === 0) {
            this.controlBus[0] = value;
            return;
        }
        this.controlBus[0] += 1;
    }

    reset() {
        cancelAnimationFrame(this.rafId);
        this.setDefaults();
    }

    start() {
        this.halt = false;
    }

    setDefaults() {
        this.revealedCount = 0;
        this.halt = true;
        this.revealCallback = this.revealSafe;
    }

    openCell(data: ClickPostMessageData) {
        const col = data.point.x;
        const row = data.point.y;
        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            const cellIndex = data.point.x + data.point.y * this.cols;
            const indexList = new LinkedArray();
            this.revealCallback(cellIndex, indexList);
        }
    }

    revealSafe(cellIndex: number, indexQueue: LinkedArray) {
        const byteIndex = cellIndex >> 1;
        const bitOffset = (cellIndex << 2) & 7;

        if (isOn(this.field, FLAGS.MINE, byteIndex, bitOffset)) {
            this.removeMine(cellIndex);
            this.plantMine(this.freeIndex);
            this.commitChange();
        }

        this.revealCallback = this.iterativeReveal;
        this.revealCallback(cellIndex, indexQueue);
    }

    removeMine(cellIndex: number) {
        const field = this.field;
        const byteIndex = cellIndex >> 1;
        const bitOffset = (cellIndex << 2) & 7;

        off(field, FLAGS.MINE | FLAGS.SUSS, byteIndex, bitOffset);

        const surroundIdexes = getAdjacentColumnsAndRowsIndexesMatrix(cellIndex, this.cols);
        const minesAround = this.getSurroundMinesCount(surroundIdexes);

        minesAround > 0 && on(field, FLAGS.SUSS, byteIndex, bitOffset);

        for (let i = 0; i < surroundIdexes.length; i += 2) {
            const col = surroundIdexes[i];
            const row = surroundIdexes[i+1];
            if (col>=0 && col < this.cols && row >= 0 && row < this.rows) {
                this.recalculateVoidStatus(col, row);
            }
        }
    }

    getSurroundMinesCount(indexes: AdjacentMatrix): number {
        const field = this.field;
        let mines = 0;

        for (let i = 0; i < indexes.length; i += 2) {
            const col = indexes[i];
            const row = indexes[i+1];

            if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
                continue;
            }

            const adjuscentCellIndex = col + row * this.cols;
            const byteIndex = adjuscentCellIndex >> 1;
            const bitOffset = (adjuscentCellIndex << 2) & 7;

            isOn(field, FLAGS.MINE, byteIndex, bitOffset) && mines++;
        }

        return mines;
    }

    recalculateVoidStatus(col: number, row: number) {
        const field = this.field;
        const indexesMatrix = offsetsMatrix(col, row);
        const minesAround = this.getSurroundMinesCount(indexesMatrix);

        const index = col + row * this.cols;
        const byteIndex = index >> 1;
        const bitOffset = (index << 2) & 7;

        (minesAround > 0 && on || off)(field, FLAGS.SUSS, byteIndex, bitOffset);
    }

    plantMine(cellIndex: number) {
        const field = this.field;
        const byteIndex = cellIndex >> 1;
        const bitOffset = (cellIndex << 2) & 7;

        on(field, FLAGS.MINE | FLAGS.SUSS, byteIndex, bitOffset);

        const indexes = getAdjacentColumnsAndRowsIndexesMatrix(cellIndex, this.cols);

        for (let i = 0; i < indexes.length; i += 2) {
            const col = indexes[i];
            const row = indexes[i+1];

            if (col < 0 || col >= this.cols || row < 0 || row >= this.cols) {
                continue;
            }

            const adjuscentCellIndex = col + row * this.cols;
            const byteIndex = adjuscentCellIndex >> 1;
            const bitOffset = (adjuscentCellIndex << 2) & 7;

            on(field, FLAGS.SUSS, byteIndex, bitOffset);
        }
    }

    markCell(data: RightClickPostMessageData) {
        const column = data.point.x;
        const row = data.point.y;
        this.mark(column, row);
    }

    mark(column: number, row: number) {
        const field = this.field;
        const cellIndex = column + row * this.cols;
        const byteIndex = cellIndex >> 1;
        const bitOffset = (cellIndex << 2) & 7;

        if (isOn(field, FLAGS.OPEN, byteIndex,bitOffset)) {
            return;
        }

        const marked = isOn(field, FLAGS.MARK, byteIndex, bitOffset);
        (marked && off || on)(field, FLAGS.MARK, byteIndex, bitOffset);

        this.dispatcher.postMessage({type: 'markChanged', marked: !marked});
        this.commitChange();
    }

    iterativeReveal(cellIndex: number, indexesQueue: LinkedArray) {
        const field = this.field;
        this.reveal(field, cellIndex, indexesQueue);
        let revealed = 0;

        while (indexesQueue.length && this.halt === false) {
            const nextIndex = indexesQueue.shift();
            if (nextIndex != undefined) {
                if (++revealed > 1000000) {
                    this.rafId = requestAnimationFrame(() => (this.iterativeReveal(nextIndex, indexesQueue)));
                    return;
                }
                this.reveal(field, nextIndex, indexesQueue)
            }
        };

        if (this.revealedCount === (this.rows * this.cols) - this.mines) {
            this.commitChange(0);
            this.dispatcher.postMessage({type: 'win'});
        }
        if (this.halt === true) {
            this.commitChange(0);
            this.dispatcher.postMessage({type: 'loose'});
        }
    }

    reveal(field: Uint8Array, cellIndex: number, indexesQueue: LinkedArray/* indexesQueue: number[]*/) {
        this.commitChange();

        const byteIndex = cellIndex >> 1;
        const bitOffset = (cellIndex << 2) & 7;

        if (isOn(field, FLAGS.MARK, byteIndex, bitOffset)) {
            return;
        }

        if (!isOn(field, FLAGS.OPEN, byteIndex, bitOffset)) {
            on(field, FLAGS.OPEN, byteIndex, bitOffset)
            this.revealedCount++;
            if (isOn(field, FLAGS.MINE, byteIndex, bitOffset)) {
                this.halt = true
                return
            }
        }
        
        const isSuss = isOn(field, FLAGS.SUSS, byteIndex, bitOffset);
        if (isSuss) {
            return;
        }

        const indexes = getAdjacentColumnsAndRowsIndexesMatrix(cellIndex, this.cols);

        const cols = this.cols;
        const rows = this.rows;

        for (let i = 0; i < indexes.length && this.halt === false; i += 2) {
            const col = indexes[i];
            const row = indexes[i+1];

            if (col >= 0 && col < cols && row >= 0 && row < rows) {
                const index = col + row * cols;
                const byteIndex = index >> 1;
                const bitOffset = (index << 2) & 7;

                if (isOn(field, FLAGS.OPEN, byteIndex, bitOffset) || isOn(field, FLAGS.MARK, byteIndex, bitOffset)) {
                    continue;
                }

                on(field, FLAGS.OPEN, byteIndex, bitOffset);
                this.revealedCount++;

                const isSuss = isOn(field, FLAGS.SUSS, byteIndex, bitOffset);
                !isSuss && indexesQueue.push(index);
            }
        }
    }

    revealAdjacent(data: RevealSafePostMessageData) {
        const col = data.point.x;
        const row = data.point.y;

        const cellIndex = col + row * this.cols;
        const byteIndex = cellIndex >> 1;
        const bitOffset = (cellIndex << 2) & 7;

        if (isOn(this.field, FLAGS.OPEN, byteIndex, bitOffset)) {
            const indexesMatrix = offsetsMatrix(col, row);
            const storage: LinkedArray = new LinkedArray(); 
            let flagsAround = 0;
            let minesAround = 0;

            for (let i = 0; i < indexesMatrix.length; i += 2) {
                const col = indexesMatrix[i];
                const row = indexesMatrix[i+1];
    
                if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
                    const adjuscentCellIndex = col + row * this.cols;
                    const byteIndex = adjuscentCellIndex >> 1;
                    const bitOffset = (adjuscentCellIndex << 2) & 7;

                    isOn(this.field, FLAGS.MINE, byteIndex, bitOffset) && minesAround++;
                    isOn(this.field, FLAGS.MARK, byteIndex, bitOffset) && flagsAround++;
        
                    storage.push(col + row * this.cols);
                }
            }

            if (minesAround === flagsAround) {
                const index = storage.shift();
                index !== undefined && this.revealCallback(index, storage);
                
            }
        }
    }
};    
exports.Revealer = Revealer;
})(typeof exports === 'undefined' ? Object.assign(globalThis, {Revealer: {}}) : exports);