declare type RendererProcessMessage = {
    type: 'init'
    canvas: HTMLCanvasElement;
    scale: number;
    field: Uint8Array;
    rows: number;
    cols: number;
    img: ImageBitmap;
    offset: IPoint;
    controlBus: Uint32Array;
    isDebug: boolean;
};