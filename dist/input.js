"use strict";
const EMPTY_RELEASE = () => { };
const EVENT_NAME = 'inputEmit';
class InputSystem {
    constructor(inputSource) {
        this.inputSource = inputSource;
        this.activeMouseButtons = new Map();
        this.cursorPoint = { x: 0, y: 0 };
        this.clickPoint = undefined;
        this.releaseContextMenuListener = EMPTY_RELEASE;
        this.releaseMouseDownListener = EMPTY_RELEASE;
        this.releaseMouseUpListener = EMPTY_RELEASE;
        this.releaseMouseClickHandler = EMPTY_RELEASE;
        this.releaseMouseMoveHandler = EMPTY_RELEASE;
        this.stateHandle = this.voidStateHandler;
    }
    init() {
        this.releaseContextMenuListener = this.addListener('contextmenu', this.contextMenuHandler);
        this.releaseMouseDownListener = this.addListener('mousedown', this.mouseDownHandler);
        this.releaseMouseUpListener = this.addListener('mouseup', this.mouseUpHandler);
        this.releaseMouseClickHandler = this.addListener('click', this.mouseClickHandler);
        this.releaseMouseMoveHandler = this.addListener('mousemove', this.mouseMoveHandler);
    }
    destroy() {
        this.releaseContextMenuListener();
        this.releaseMouseDownListener();
        this.releaseMouseUpListener();
        this.releaseMouseClickHandler();
        this.releaseMouseMoveHandler();
    }
    dispatch(event) {
        document.dispatchEvent(event);
    }
    voidStateHandler() { }
    panOrOpenState() {
        if (this.clickPoint) {
            const point = {
                x: Math.abs(this.clickPoint.x - this.cursorPoint.x),
                y: Math.abs(this.clickPoint.y - this.cursorPoint.y),
            };
            if (point.x > 3 || point.y > 3) {
                this.stateHandle = ((state) => () => this.panningStateHandle(state))({});
            }
            ;
        }
        else {
            this.stateHandle = this.leftClickStateHandle;
        }
    }
    panningStateHandle(localState) {
        var _a, _b;
        if (!this.clickPoint) {
            this.stateHandle = this.voidStateHandler;
            return;
        }
        const diffX = ((_a = localState.x) !== null && _a !== void 0 ? _a : this.clickPoint.x) - this.cursorPoint.x;
        const diffY = ((_b = localState.y) !== null && _b !== void 0 ? _b : this.clickPoint.y) - this.cursorPoint.y;
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
    rightClickStateHandle(evt) {
        const event = new CustomEvent(EVENT_NAME, {
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
    leftClickStateHandle(evt) {
        this.stateHandle = this.voidStateHandler;
        const event = new CustomEvent(EVENT_NAME, {
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
    onAdjascentCellsHighlightStateHandle(evt) {
        const event = new CustomEvent(EVENT_NAME, {
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
    higlightAdjascentStateHandler(evt) {
        const eventData = {
            type: 'highlight',
            x: evt.clientX,
            y: evt.clientY,
        };
        if (this.activeMouseButtons.size < 2 || Array.from(this.activeMouseButtons.values()).some(value => value === false)) {
            eventData.on = false;
            this.stateHandle = this.voidStateHandler;
            const event = new CustomEvent(EVENT_NAME, {
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
        const event = new CustomEvent(EVENT_NAME, {
            cancelable: false,
            bubbles: false,
            detail: eventData,
        });
        this.dispatch(event);
    }
    addListener(type, handler) {
        const wrapper = handler.bind(this);
        this.inputSource.addEventListener(type, wrapper);
        return () => this.inputSource.removeEventListener(type, wrapper);
    }
    contextMenuHandler(e) {
        e.preventDefault();
    }
    mouseDownHandler(evt) {
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
    mouseUpHandler(evt) {
        this.activeMouseButtons.set(evt.button, false);
        let unpressedButtonsCount = 0;
        this.activeMouseButtons.forEach(value => value === false && unpressedButtonsCount++);
        if (unpressedButtonsCount === this.activeMouseButtons.size) {
            this.activeMouseButtons.clear();
        }
        this.clickPoint = undefined;
        this.stateHandle(evt);
    }
    mouseClickHandler(evt) {
        this.stateHandle(evt);
    }
    mouseMoveHandler(evt) {
        this.cursorPoint.x = evt.clientX;
        this.cursorPoint.y = evt.clientY;
        this.stateHandle(evt);
    }
}
