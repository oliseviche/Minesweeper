function runGame([assets, displayConfigs, fieldConfigs, isDebug]: [ImageBitmap, IDisplayConfigs, IFieldConfigs, boolean]) {
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

    const faceStateMachine = (): [() => void, () => void, (win:boolean) => void] => {
        const looks = ['look-straight', 'look-left', 'look-right', 'look-shocked', 'look-dead', 'look-hero'];
        const random = (min: number, max: number) => (~~(Math.random() * (max - min) + min));
        const faceElement = document.querySelector('.face');
        let timerId: number | undefined = undefined;
        let stopped = false;
        const animate = (look?: typeof looks.length, wait?: number) => {
            const waitUntilChange = (wait || random(1, 5)) * 1000;
            const currentLook = look || random(0, 3);
            faceElement?.classList.remove(...looks);
            faceElement?.classList.add(looks[currentLook]); 
            timerId = setTimeout(animate, waitUntilChange);
        };
        return [
            () => {
                animate();
            },
            () => {
                !stopped && (clearTimeout(timerId), animate(3, 1));
            },
            (win: boolean) => {
                stopped = true;
                clearTimeout(timerId);
                faceElement?.classList.remove(...looks);
                faceElement?.classList.add( win ? looks[5] : looks[4]); 
            },
        ];
    };
    const timerStateMachine = (): [() => void, () => void, () => void] => {
        let intervalId: number | undefined = undefined;
        let passed = 0;
        let isStarted = false;
        const ui = document.querySelector('#time');
        const renderTime = (time: number) => {
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
    }
    const flagsStateMachine = (): [(flags: number) => void, () => void, () => void, () => void] => {
        let flags = 0;
        const ui = document.querySelector('#counter');
        const renderCounter = () => {
            const passedInString = `${flags}`;
            ui && (ui.innerHTML = passedInString);
        };
        const init = (startFlags: number) => {
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
            (flags: number) => { init(flags); renderCounter(); },
            () => { reset(); renderCounter(); },
            () => { increase(); renderCounter(); },
            () => { decrease(); renderCounter(); },
        ];
    }

    const [reviveAvatar, makeAvatarAfraid, setAvatarWin] = faceStateMachine();
    const [startTimer, stopTimer, resetTimer] = timerStateMachine();
    const [initFlags, resetFlags, increaseFlags, decreaseFlags] =  flagsStateMachine();

    const reset = () => {
        revealerWorker.postMessage({type: 'reset'});
        rendererWorker.postMessage({type: 'reset'});
        setAvatarWin(true);
        stopTimer();
        resetTimer();
        resetFlags();
        start();
    }

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
    }

    document.addEventListener("fieldReady", (evt: Event) => {
        const e = evt as CustomEvent<IFieldData>;
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

    document.addEventListener("fieldReseted", (evt: Event) => {
        revealerWorker.postMessage({type: 'start'});
        rendererWorker.postMessage({type: 'start'});
        reviveAvatar();
        toggleUIElement("loader");
    });

    document.addEventListener('inputEmit', (evt: Event) => {
        const event = (evt as CustomEvent<IInputSystemEventData>);

        if (isPanEvent(event)) {
            offset.x -= event.detail.offsetX * displayConfigs.devicePixelRatio / canvasScale;
            offset.y -= event.detail.offsetY * displayConfigs.devicePixelRatio / canvasScale;

            rendererWorker.postMessage({
                type: 'panning',
                offset: {x: offset.x, y: offset.y}
            });
        }

        if (!gameFinished) {
            if (isMarkEvent(event)) {
                const x = ((event.detail.x * displayConfigs.devicePixelRatio / canvasScale) - offset.x) >> 4;
                const y = ((event.detail.y * displayConfigs.devicePixelRatio / canvasScale) - offset.y) >> 4;

                revealerWorker.postMessage({ 
                    type: 'markCell', 
                    point: {x, y} 
                });
            }

            if (isOpenEvent(event)) {
                const x = ((event.detail.x * displayConfigs.devicePixelRatio / canvasScale) - offset.x) >> 4;
                const y = ((event.detail.y * displayConfigs.devicePixelRatio / canvasScale) - offset.y) >> 4;
                
                revealerWorker.postMessage({ 
                    type: 'openCell', 
                    point: {x, y}
                });

                makeAvatarAfraid();
                startTimer();
            }

            if (isHighlightEvent(event)) {
                const x = ((event.detail.x * displayConfigs.devicePixelRatio / canvasScale) - offset.x) >> 4;
                const y = ((event.detail.y * displayConfigs.devicePixelRatio / canvasScale) - offset.y) >> 4;
                const postMessageEventData: { type: string, point: IPoint, on?: boolean } = {
                    type: 'highlight',
                    point: {x, y}
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
                    point: {x, y}
                });

                makeAvatarAfraid();
            }
        }
    });

    revealerWorker.addEventListener('message', (evt) => {
        switch(evt.data.type) {
            case 'markChanged': {
                evt.data.marked ? decreaseFlags() : increaseFlags();
            }
            break;
            case 'loose': {
                rendererWorker.postMessage({...evt.data});
                setAvatarWin(false);
                stopTimer();
                gameFinished = true;
            }
            break;
            case 'win': {
                rendererWorker.postMessage({...evt.data});
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
    }, {capture: true});

    document.addEventListener('click', (event: MouseEvent) => {
        const { id } = event.target as HTMLElement;
        if (id === 'avatar') {
            reset();
        }
    });

    start();
}

function initCanvas(id: string, displayConfigs: IDisplayConfigs): HTMLCanvasElement {
    const { width, height, devicePixelRatio } = displayConfigs;
    const htmlCanvas: HTMLCanvasElement | null = document.getElementById(id) as HTMLCanvasElement;

    if (!htmlCanvas) {
        throw new Error('Canvas element not existed');
    }

    htmlCanvas.width = Math.ceil(width * devicePixelRatio);
    htmlCanvas.height = Math.ceil(height * devicePixelRatio);

    return htmlCanvas;
}

function generateField(worker: Worker, config: IFieldConfigs) {
    const mines = config?.mines;

    const handler = (e: MessageEvent<{type: 'create'|'repeat', rows: number, cols: number, field:Uint8Array, freeIndex:number }>) => {
        const msgMap = { 'create': 'fieldReady', 'repeat': 'fieldReseted' };

        const evt = new CustomEvent<IFieldData>(msgMap[e.data.type], {
            "bubbles":false, 
            "cancelable":false, 
            detail: { ...e.data, mines }
        });
        document.dispatchEvent(evt);
        worker.removeEventListener('message', handler);
    };

    worker.addEventListener('message', handler);
    worker.postMessage(config);
}