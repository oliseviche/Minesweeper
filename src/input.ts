
const EMPTY_RELEASE = () => {};
const EVENT_NAME = 'inputEmit';

class InputSystem {
    activeMouseButtons: Map<number, boolean> = new Map();

    cursorPoint: IPoint = {x: 0, y: 0};
    clickPoint: IPoint | undefined = undefined;

    private releaseContextMenuListener = EMPTY_RELEASE;
    private releaseMouseDownListener = EMPTY_RELEASE;
    private releaseMouseUpListener = EMPTY_RELEASE;
    private releaseMouseClickHandler = EMPTY_RELEASE;
    private releaseMouseMoveHandler = EMPTY_RELEASE;
    private stateHandle:(evt: MouseEvent) => void = this.voidStateHandler;

    constructor(private inputSource: HTMLElement) {
    }

    init(): void {
        this.releaseContextMenuListener = this.addListener('contextmenu', this.contextMenuHandler);
        this.releaseMouseDownListener = this.addListener('mousedown', this.mouseDownHandler);
        this.releaseMouseUpListener = this.addListener('mouseup', this.mouseUpHandler);
        this.releaseMouseClickHandler = this.addListener('click', this.mouseClickHandler);
        this.releaseMouseMoveHandler = this.addListener('mousemove', this.mouseMoveHandler);
    }

    destroy(): void {
        this.releaseContextMenuListener();
        this.releaseMouseDownListener();
        this.releaseMouseUpListener();
        this.releaseMouseClickHandler();
        this.releaseMouseMoveHandler();
    }

    private dispatch(event: CustomEvent) {
        document.dispatchEvent(event);
    }

    private voidStateHandler(): void {}

    private panOrOpenState() {
        if (this.clickPoint) {
            const point: IPoint = {
                x: Math.abs(this.clickPoint.x - this.cursorPoint.x),
                y: Math.abs(this.clickPoint.y - this.cursorPoint.y),
            };
            if (point.x > 3 || point.y > 3) {
                this.stateHandle = ((state) => () => this.panningStateHandle(state))({});
            };
        } else {
            this.stateHandle = this.leftClickStateHandle;
        }
    }

    private panningStateHandle(localState: Record<string, number>) {
        if (!this.clickPoint) {
            this.stateHandle = this.voidStateHandler;
            return;
        }
        const diffX = (localState.x ?? this.clickPoint.x) - this.cursorPoint.x;
        const diffY = (localState.y ?? this.clickPoint.y) - this.cursorPoint.y;

        const event = new CustomEvent(EVENT_NAME, {
            bubbles: false,
            cancelable: false,
            detail: {
                type: 'pan',
                offsetX: diffX,
                offsetY: diffY,
            }
        });

        this.dispatch(event);

        localState.x = this.cursorPoint.x;
        localState.y = this.cursorPoint.y;
    }

    private rightClickStateHandle(evt: MouseEvent) {
        const event = new CustomEvent<IMarkInputSystemventData>(EVENT_NAME, {
            cancelable: false,
            bubbles: false,
            detail: {
                type: 'mark',
                x: evt.clientX,
                y: evt.clientY,
            },
        });
        this.dispatch(event);
        this.clickPoint = undefined;
        this.stateHandle = this.voidStateHandler;
    }

    private leftClickStateHandle(evt: MouseEvent) {
        this.stateHandle = this.voidStateHandler;
        const event = new CustomEvent<IOpenInputSystemventData>(EVENT_NAME, {
            cancelable: false,
            bubbles: false,
            detail: {
                type: 'open',
                x: evt.clientX,
                y: evt.clientY,
            },
        });
        this.dispatch(event);
    }

    private onAdjascentCellsHighlightStateHandle(evt: MouseEvent) {
        const event = new CustomEvent<IOnAdjascentCellsHighlightInputSystemventData>(EVENT_NAME, {
            cancelable: false,
            bubbles: false,
            detail: {
                type: 'highlight',
                on: true,
                x: evt.clientX,
                y: evt.clientY,
            },
        });
        this.dispatch(event);
        this.stateHandle = this.higlightAdjascentStateHandler;
    }

    private higlightAdjascentStateHandler(evt: MouseEvent) {
        const eventData: IOnAdjascentCellsHighlightInputSystemventData = {
            type: 'highlight',
            x: evt.clientX,
            y: evt.clientY,
        }

        if (this.activeMouseButtons.size < 2 || Array.from(this.activeMouseButtons.values()).some(value => value === false)) {
            eventData.on = false;
            this.stateHandle = this.voidStateHandler;

            const event = new CustomEvent<IOnRevealAdjascentCellsInputSystemventData>(EVENT_NAME, {
                cancelable: false,
                bubbles: false,
                detail: {
                    type: "reveal",
                    x: evt.clientX,
                    y: evt.clientY,
                },
            });

            this.dispatch(event);
        }

        const event = new CustomEvent<IOnAdjascentCellsHighlightInputSystemventData>(EVENT_NAME, {
            cancelable: false,
            bubbles: false,
            detail: eventData,
        });
        
        this.dispatch(event);
    }

    private addListener<T extends keyof HTMLElementEventMap>(type: T, handler: (evt: HTMLElementEventMap[T]) => void): () => void {
        const wrapper = handler.bind(this);
        this.inputSource.addEventListener(type, wrapper);
        return () => this.inputSource.removeEventListener(type, wrapper);
    }

    private contextMenuHandler(e: Event) {
        e.preventDefault();
    }

    private mouseDownHandler(evt: MouseEvent) {
        if (!this.activeMouseButtons.has(evt.button)) {
            this.activeMouseButtons.set(evt.button, true);
        }

        if (!this.clickPoint) {
            this.clickPoint = { x: evt.clientX, y: evt.clientY };
        }

        if (evt.button === 2) {
            this.stateHandle = this.rightClickStateHandle;
        }

        if (evt.button === 0) {
            this.stateHandle = this.panOrOpenState;
        }

        if (this.activeMouseButtons.size > 1) {
            this.stateHandle = this.onAdjascentCellsHighlightStateHandle;
            if (Array.from(this.activeMouseButtons.values()).some(value => value === false)) {
                this.stateHandle = this.voidStateHandler;
            }
        }

        this.stateHandle(evt);
    }

    private mouseUpHandler(evt: MouseEvent) {
        this.activeMouseButtons.set(evt.button, false);

        let unpressedButtonsCount = 0
        this.activeMouseButtons.forEach(value => value === false && unpressedButtonsCount++);

        if (unpressedButtonsCount === this.activeMouseButtons.size) {
            this.activeMouseButtons.clear();
        }

        this.clickPoint = undefined;

        this.stateHandle(evt);
    }

    private mouseClickHandler(evt: MouseEvent) {
        this.stateHandle(evt);
    }

    private mouseMoveHandler(evt: MouseEvent) {
        this.cursorPoint.x = evt.clientX;
        this.cursorPoint.y = evt.clientY;

        this.stateHandle(evt);
    }
}