declare const exports: Record<string, any>;

declare type RightClickPostMessageData = {
    type: 'rightClick';
    point: {x: number, y: number };
}

declare type RevealSafePostMessageData = {
    type: 'revealSafe',
    point: { x: number, y: number };
}

declare type PanPostMessage = {
    type: 'panning';
    offset: {x: number, y: number};
}

declare type HighlightPostMessage = {
    type: 'highlight';
    point: {x: number, y: number };
    on?: boolean;
}

declare interface WorkerInstance<T> {
    parseEvent(e: MessageEvent<T>): void;
    init(data: T): void;
}

declare interface IPoint {
    x: number;
    y: number;
}

declare interface IInputSystemEventData {
    type: 'pan' | 'mark' | 'open' | 'highlight' | 'reveal';
}
declare interface IPanInputSystemventData extends IInputSystemEventData {
    offsetX: number;
    offsetY: number;
}
declare interface IMarkInputSystemventData extends IInputSystemEventData {
    x: number;
    y: number;
}
declare interface IOpenInputSystemventData extends IInputSystemEventData {
    x: number;
    y: number;
}
declare interface IOnAdjascentCellsHighlightInputSystemventData extends IInputSystemEventData {
    x: number;
    y: number;
    on?: boolean;
}
declare interface IOnRevealAdjascentCellsInputSystemventData extends IInputSystemEventData {
    x: number;
    y: number;
}

declare class LinkedArray {
    push(value:number): void;
    shift(): number | undefined;
    length: number;
}

declare class Revealer {
    constructor(dispatcher: { postMessage: (msg: any) => void });
    cols: number;
    rows: number;
    mines: number;
    field: Uint8Array;
    freeIndex: number;
    controlBus: Uint32Array;
    revealedCount: number;
    halt: boolean ;
    rafId: number;
    revealCallback(index: number, node: LinkedArray): void;
    parseEvent(e: MessageEvent<RevealerInitializeMessageData>): void;
    init(data: RevealerInitializeMessageData): void;
    commitChange(value?: 0): void
    reset(): void;
    start(): void;
    setDefaults(): void;
    openCell(data: ClickPostMessageData): void;
    revealSafe(cellIndex: number, indexQueue: LinkedArray): void;
    removeMine(cellIndex: number): void
    getSurroundMinesCount(indexes: AdjacentMatrix): number;
    recalculateVoidStatus(col: number, row: number): void;
    plantMine(cellIndex: number):void;
    markCell(data: RightClickPostMessageData): void;
    mark(column: number, row: number): void;
    iterativeReveal(cellIndex: number, indexesQueue: LinkedArray): void;
    reveal(field: Uint8Array, cellIndex: number, indexesQueue: LinkedArray): void;
    revealAdjacent(data: RevealSafePostMessageData): void;
}