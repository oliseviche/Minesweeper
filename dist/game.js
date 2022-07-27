"use strict";
function runGame([assets, displayConfigs, fieldConfigs, isDebug]) {
    const rendererWorker = new Worker('dist/workers/RendererWorker/RendererWorker.js');
    const revealerWorker = new Worker('dist/workers/RevealerWorker/RevealerWorker.js');
    const generatorWorker = new Worker('dist/workers/GeneratorWorker.js');
    const fieldCanvas = initCanvas('field', displayConfigs);
    const offscreen = fieldCanvas.transferControlToOffscreen();
    const controlBuffer = new SharedArrayBuffer(8);
    const controlBus = new Uint32Array(controlBuffer);
    const canvasScale = Math.ceil(displayConfigs.devicePixelRatio);
    const offset = getFeetScreenCenterOffset(fieldConfigs, displayConfigs, canvasScale);
    const inputSystem = new InputSystem(fieldCanvas);
    let gameFinished = true;
    inputSystem.init();
    const faceStateMachine = () => {
        const looks = ['look-straight', 'look-left', 'look-right', 'look-shocked', 'look-dead', 'look-hero'];
        const random = (min, max) => (~~(Math.random() * (max - min) + min));
        const faceElement = document.querySelector('.face');
        let timerId = undefined;
        let stopped = false;
        const animate = (look, wait) => {
            const waitUntilChange = (wait || random(1, 5)) * 1000;
            const currentLook = look || random(0, 3);
            faceElement === null || faceElement === void 0 ? void 0 : faceElement.classList.remove(...looks);
            faceElement === null || faceElement === void 0 ? void 0 : faceElement.classList.add(looks[currentLook]);
            timerId = setTimeout(animate, waitUntilChange);
        };
        return [
            () => {
                animate();
            },
            () => {
                !stopped && (clearTimeout(timerId), animate(3, 1));
            },
            (win) => {
                stopped = true;
                clearTimeout(timerId);
                faceElement === null || faceElement === void 0 ? void 0 : faceElement.classList.remove(...looks);
                faceElement === null || faceElement === void 0 ? void 0 : faceElement.classList.add(win ? looks[5] : looks[4]);
            },
        ];
    };
    const timerStateMachine = () => {
        let intervalId = undefined;
        let passed = 0;
        let isStarted = false;
        const ui = document.querySelector('#time');
        const renderTime = (time) => {
            const passedInString = `${time}`.padStart(3, '0');
            ui && (ui.innerHTML = passedInString);
        };
        const start = () => {
            isStarted = true;
            intervalId = setInterval(() => {
                passed++;
                renderTime(passed);
            }, 1000);
        };
        const stop = () => {
            isStarted = false;
            clearInterval(intervalId);
        };
        const reset = () => {
            passed = 0;
            renderTime(passed);
        };
        return [
            () => !isStarted && start(),
            () => { isStarted = false; stop(); },
            () => { isStarted = false; reset(); },
        ];
    };
    const flagsStateMachine = () => {
        let flags = 0;
        const ui = document.querySelector('#counter');
        const renderCounter = () => {
            const passedInString = `${flags}`;
            ui && (ui.innerHTML = passedInString);
        };
        const init = (startFlags) => {
            flags = startFlags;
        };
        const reset = () => {
            flags = 0;
        };
        const increase = () => {
            flags++;
        };
        const decrease = () => {
            flags--;
        };
        return [
            (flags) => { init(flags); renderCounter(); },
            () => { reset(); renderCounter(); },
            () => { increase(); renderCounter(); },
            () => { decrease(); renderCounter(); },
        ];
    };
    const [reviveAvatar, makeAvatarAfraid, setAvatarWin] = faceStateMachine();
    const [startTimer, stopTimer, resetTimer] = timerStateMachine();
    const [initFlags, resetFlags, increaseFlags, decreaseFlags] = flagsStateMachine();
    const reset = () => {
        revealerWorker.postMessage({ type: 'reset' });
        rendererWorker.postMessage({ type: 'reset' });
        setAvatarWin(true);
        stopTimer();
        resetTimer();
        resetFlags();
        start();
    };
    const start = () => {
        toggleUIElement("loader");
        controlBus[0] = 0;
        controlBus[1] = 0;
        const origin = getFeetScreenCenterOffset(fieldConfigs, displayConfigs, canvasScale);
        offset.x = origin.x;
        offset.y = origin.y;
        generateField(generatorWorker, fieldConfigs);
        initFlags(fieldConfigs.mines);
        gameFinished = false;
    };
    document.addEventListener("fieldReady", (evt) => {
        const e = evt;
        revealerWorker.postMessage({
            type: 'init',
            field: e.detail.field,
            cols: e.detail.cols,
            rows: e.detail.rows,
            mines: e.detail.mines,
            freeIndex: e.detail.freeIndex,
            controlBus,
        });
        rendererWorker.postMessage({
            type: 'init',
            canvas: offscreen,
            scale: canvasScale,
            field: e.detail.field,
            cols: e.detail.cols,
            rows: e.detail.rows,
            img: assets,
            offset,
            controlBus,
            isDebug: isDebug,
        }, [offscreen]);
        toggleUIElement("loader");
        toggleUIElement('panel');
        reviveAvatar();
    });
    document.addEventListener("fieldReseted", (evt) => {
        const event = evt;
        if (isRepeatEvent(event)) {
            revealerWorker.postMessage({ type: 'start', freeIndex: event.detail.freeIndex });
            rendererWorker.postMessage({ type: 'start' });
            reviveAvatar();
            toggleUIElement("loader");
        }
    });
    document.addEventListener('inputEmit', (evt) => {
        const event = evt;
        if (isPanEvent(event)) {
            offset.x -= event.detail.offsetX * displayConfigs.devicePixelRatio / canvasScale;
            offset.y -= event.detail.offsetY * displayConfigs.devicePixelRatio / canvasScale;
            rendererWorker.postMessage({
                type: 'panning',
                offset: { x: offset.x, y: offset.y }
            });
        }
        if (!gameFinished) {
            if (isMarkEvent(event)) {
                const x = ((event.detail.x * displayConfigs.devicePixelRatio / canvasScale) - offset.x) >> 4;
                const y = ((event.detail.y * displayConfigs.devicePixelRatio / canvasScale) - offset.y) >> 4;
                revealerWorker.postMessage({
                    type: 'markCell',
                    point: { x, y }
                });
            }
            if (isOpenEvent(event)) {
                const x = ((event.detail.x * displayConfigs.devicePixelRatio / canvasScale) - offset.x) >> 4;
                const y = ((event.detail.y * displayConfigs.devicePixelRatio / canvasScale) - offset.y) >> 4;
                revealerWorker.postMessage({
                    type: 'openCell',
                    point: { x, y }
                });
                makeAvatarAfraid();
                startTimer();
            }
            if (isHighlightEvent(event)) {
                const x = ((event.detail.x * displayConfigs.devicePixelRatio / canvasScale) - offset.x) >> 4;
                const y = ((event.detail.y * displayConfigs.devicePixelRatio / canvasScale) - offset.y) >> 4;
                const postMessageEventData = {
                    type: 'highlight',
                    point: { x, y }
                };
                if (undefined !== event.detail.on) {
                    postMessageEventData.on = event.detail.on;
                }
                rendererWorker.postMessage(postMessageEventData);
            }
            if (isRevealAdjuscentEvent(event)) {
                const x = ((event.detail.x * displayConfigs.devicePixelRatio / canvasScale) - offset.x) >> 4;
                const y = ((event.detail.y * displayConfigs.devicePixelRatio / canvasScale) - offset.y) >> 4;
                revealerWorker.postMessage({
                    type: 'revealAdjacent',
                    point: { x, y }
                });
                makeAvatarAfraid();
            }
        }
    });
    revealerWorker.addEventListener('message', (evt) => {
        switch (evt.data.type) {
            case 'markChanged':
                {
                    evt.data.marked ? decreaseFlags() : increaseFlags();
                }
                break;
            case 'loose':
                {
                    rendererWorker.postMessage(Object.assign({}, evt.data));
                    setAvatarWin(false);
                    stopTimer();
                    gameFinished = true;
                }
                break;
            case 'win':
                {
                    rendererWorker.postMessage(Object.assign({}, evt.data));
                    setAvatarWin(true);
                    resetFlags();
                    stopTimer();
                    gameFinished = true;
                }
                break;
        }
    });
    window.addEventListener('pagehide', event => {
        if (!event.persisted) {
            rendererWorker.terminate();
            revealerWorker.terminate();
            generatorWorker.terminate();
        }
    }, { capture: true });
    document.addEventListener('click', (event) => {
        const { id } = event.target;
        if (id === 'avatar') {
            reset();
        }
    });
    start();
}
function initCanvas(id, displayConfigs) {
    const { width, height, devicePixelRatio } = displayConfigs;
    const htmlCanvas = document.getElementById(id);
    if (!htmlCanvas) {
        throw new Error('Canvas element not existed');
    }
    htmlCanvas.width = Math.ceil(width * devicePixelRatio);
    htmlCanvas.height = Math.ceil(height * devicePixelRatio);
    return htmlCanvas;
}
function generateField(worker, config) {
    const mines = config === null || config === void 0 ? void 0 : config.mines;
    const handler = (e) => {
        const msgMap = { 'create': 'fieldReady', 'repeat': 'fieldReseted' };
        const evt = new CustomEvent(msgMap[e.data.type], {
            "bubbles": false,
            "cancelable": false,
            detail: Object.assign(Object.assign({}, e.data), { mines })
        });
        document.dispatchEvent(evt);
        worker.removeEventListener('message', handler);
    };
    worker.addEventListener('message', handler);
    worker.postMessage(config);
}
