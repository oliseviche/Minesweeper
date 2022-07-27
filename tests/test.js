const { LinkedArray } = require('../dist/linked-array');
const { Revealer } = require('../dist/workers/RevealerWorker/Revealer');

function test(name, body) {
    console.log(`Running '${name}'`);
    body();
}

function success(body) {
    const result = body();
    result === true ? console.log('succes') : console.warn('fail');
}

/**
 * Linked Array
 */
test('linked-array', () => {
    test('should have length of 1 when adding 1 element', () => {
        const linkedArray = new LinkedArray();
        linkedArray.push(1);
        success(() => linkedArray.length === 1);
    });
    test('should have length 0 when shift element', () => {
        const linkedArray = new LinkedArray();
        linkedArray.push(1);
        linkedArray.shift();
        success(() => linkedArray.length === 0);
    });
    test('should have length 0 when shifting an empty array', () => {
        const linkedArray = new LinkedArray();
        linkedArray.shift();
        success(() => linkedArray.length === 0);
    });
    test('should return first value when added several', () => {
        const linkedArray = new LinkedArray();
        linkedArray.push(1);
        linkedArray.push(2);
        linkedArray.push(3);
        success(() => linkedArray.shift() === 1);
    });
    test('should return undefined on empty list', () => {
        const linkedArray = new LinkedArray();
        success(() => linkedArray.shift() === undefined);
    });
    test('should return correct value after empting array and adding new', () => {
        const linkedArray = new LinkedArray();
        linkedArray.push(1);
        linkedArray.shift();
        linkedArray.push(2);
        success(() => linkedArray.shift() === 2);
    });
});

/**
 * Revealer
 */
 test('Revealer', () => {
    test('Should not  halt when reveal first mine', () => {
        /**
         * OMG, what am i doing :(
         */
        globalThis['LinkedArray'] = LinkedArray;
        globalThis['isOn'] = function(vector, flags, byteIndex, bitOffset) {
            return (vector[byteIndex] & (flags << (4 - bitOffset))) > 0;
        };
        globalThis['FLAGS'] = {
            MINE: 0b1000,
            MARK: 0b0100,
            OPEN: 0b0010,
            SUSS: 0b0001,
        };
        globalThis['off'] = function(vector, flags, byteIndex, bitOffset) {
            vector[byteIndex] &= ~(flags << (4 - bitOffset));
        };
        globalThis['getAdjacentColumnsAndRowsIndexesMatrix'] = function(cellIndex, columnsCount) {
            const row = ~~(cellIndex / columnsCount);
            const column = cellIndex - (row * columnsCount);
            return offsetsMatrix(column, row);
        };
        globalThis['offsetsMatrix'] = function(colum, row) {
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
        };
        globalThis['on'] = function(vector, flags, byteIndex, bitOffset) {
            vector[byteIndex] |= (flags << (4 - bitOffset));
        };
        const revealer = new Revealer({ postMessage: () => {} });
        revealer.init({
            type: 'init',
            rows: 2,
            cols: 2,
            mines: 1,
            field: new Uint8Array([129, 17]),
            freeIndex: 3,
            controlBus: new Uint32Array(2),
        });
        revealer.setDefaults();
        revealer.start();
        revealer.openCell({
            type: 'openCell',
            point: {x: 0, y: 0}
        });
        success(() => revealer.halt !== true);

        test('Should halt when reveal mine after safe hit', () => {
            revealer.openCell({
                type: 'openCell',
                point: {x: 1,y: 1}
            });
            success(() => revealer.halt === true);
        })
    });
});