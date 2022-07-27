type RevealerInitializeMessageData = {
    type: 'init';
    rows: number;
    cols: number;
    mines: number;
    field: Uint8Array;
    freeIndex: number;
    controlBus: Uint32Array;
}

type ClickPostMessageData = {
    type: 'openCell';
    point: IPoint;
}