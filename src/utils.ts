const CELL_WIDTH = 16;
const CELL_HEIGHT = 16;

/* 
0b0000
  ||||_ Suss bit
  |||__ Open bit
  ||___ Mark bit
  |____ Mine bit
*/
enum FLAGS {
    MINE = 0b1000,
    MARK = 0b0100,
    OPEN = 0b0010,
    SUSS = 0b0001,
}

type AdjacentMatrix = [
    number, number, number, number, number, number, number, number, 
    number, number, number, number, number, number,number, number
];

interface IFieldData {
    rows: number;
    cols: number;
    mines: number;
    field: Uint8Array;
    freeIndex: number;
}

function isOn<T extends Uint8Array>(vector: T, flags: FLAGS , byteIndex: number, bitOffset: number): boolean {
    return (vector[byteIndex] & (flags << (4 - bitOffset))) > 0;
}

function off<T extends Uint8Array>(vector: T, flags: FLAGS, byteIndex: number, bitOffset: number): void {
    vector[byteIndex] &= ~(flags << (4 - bitOffset));
}

function on<T extends Uint8Array>(vector: T, flags: FLAGS, byteIndex: number, bitOffset: number): void {
    vector[byteIndex] |= (flags << (4 - bitOffset));
}

function getAdjacentColumnsAndRowsIndexesMatrix(cellIndex: number, columnsCount: number): AdjacentMatrix {
    const row = ~~(cellIndex / columnsCount);
    const column = cellIndex - (row * columnsCount);

    return offsetsMatrix(column, row);
}

function offsetsMatrix(colum: number, row: number): AdjacentMatrix {
    const matrix: AdjacentMatrix = [
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

function isPanEvent(evt: CustomEvent<IInputSystemEventData>): evt is CustomEvent<IPanInputSystemventData> {
    return evt.detail.type === 'pan';
}

function isMarkEvent(evt: CustomEvent<IInputSystemEventData>): evt is CustomEvent<IMarkInputSystemventData> {
    return evt.detail.type === 'mark';
}

function isOpenEvent(evt: CustomEvent<IInputSystemEventData>): evt is CustomEvent<IOpenInputSystemventData> {
    return evt.detail.type === 'open';
} 

function isHighlightEvent(evt: CustomEvent<IInputSystemEventData>): evt is CustomEvent<IOnAdjascentCellsHighlightInputSystemventData> {
    return evt.detail.type === 'highlight';
} 

function isRevealAdjuscentEvent(evt: CustomEvent<IInputSystemEventData>): evt is CustomEvent<IOnRevealAdjascentCellsInputSystemventData> {
    return evt.detail.type === 'reveal';
}

function isRepeatEvent(evt: CustomEvent<IInputSystemEventData>): evt is CustomEvent<IOnRepeatGameInputSystemventData> {
    return evt.detail.type === 'repeat';
}

function getContext<T extends HTMLCanvasElement | OffscreenCanvas>(canvas: T): 
        T extends HTMLCanvasElement ? CanvasRenderingContext2D : OffscreenCanvasRenderingContext2D {
    const context = canvas.getContext('2d')!;
    context.imageSmoothingEnabled = false;
    context.imageSmoothingQuality = 'low';
    return context as any;
}

function getFeetScreenCenterOffset(fieldConfig: IFieldConfigs, displayConfigs: IDisplayConfigs, scale: number): IPoint {
    const xCenter = (displayConfigs.width * displayConfigs.devicePixelRatio / scale) * .5;
    const YCenter = (displayConfigs.height * displayConfigs.devicePixelRatio / scale) * .5;
    const halfFieldWidth = (fieldConfig.width * CELL_WIDTH) * .5;
    const halfFieldHeight = (fieldConfig.height * CELL_HEIGHT) * .5;
    return {x: xCenter - halfFieldWidth, y: YCenter - halfFieldHeight};
}

function toggleUIElement(id: string) {
    const element = document.getElementById(id);
    element && (element.getAttribute('hidden') === '' ? element.removeAttribute('hidden') 
                                                      : element.setAttribute('hidden', ''));
}

type LinkedArrayNode = [LinkedArrayNode | null, number | undefined];