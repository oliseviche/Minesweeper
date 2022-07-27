"use strict";
function main() {
    const displayConfigs = readDisplayConfig();
    const fieldConfig = readFieldConfigValues();
    const assetsPromise = loadAssets('assets/images/src.png');
    const fieldConfigPromise = fieldConfig ? Promise.resolve(fieldConfig) : showFieldConfigSplash();
    Promise.all([assetsPromise, displayConfigs, fieldConfigPromise, isDebug()])
        .then(runGame)
        .catch(ex => console.error(ex));
}
function loadAssets(src) {
    return fetch(src).then(response => response.blob()).then((binaryImage) => createImageBitmap(binaryImage).then((imageBitmap) => imageBitmap)).catch((ex) => {
        throw ex;
    });
}
function showFieldConfigSplash() {
    const element = document.getElementById('splash');
    element && (element.removeAttribute('hidden'));
    return new Promise((resolve, reject) => {
        var _a;
        (_a = document.querySelector('#startButton')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
            const selectedLevel = document.querySelector('input[name="level"]:checked');
            const value = selectedLevel.value;
            const config = { height: 9, width: 9, mines: 10 };
            if (value === 'custom') {
                const inputs = document.querySelectorAll('input[type=number]');
                inputs.forEach((item) => config[item.name] = parseInt(item.value, 10));
            }
            else {
                Object.entries(JSON.parse(value)).forEach(([key, value]) => {
                    config[key] = parseInt(value, 10);
                });
            }
            const params = new URLSearchParams();
            Object.keys(config).forEach((key) => {
                params.set(key, `${config[key]}`);
            });
            window.history.pushState({}, "", `?${params.toString()}`);
            toggleUIElement('splash');
            resolve(config);
        });
    });
}
function readFieldConfigValues() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('width') && params.has('height') && params.has('mines')) {
        const width = +params.get('width');
        const height = +params.get('height');
        let mines = +params.get('mines');
        if (width <= 1 || height <= 1 || mines <= 0 || width * height <= mines) {
            return null;
        }
        const totalCells = width * height;
        if (mines >= totalCells) {
            mines = totalCells - 1;
            params.set('mines', `${mines}`);
            window.history.pushState({}, "", `?${params.toString()}`);
        }
        return { width, height, mines };
    }
    return null;
}
function readDisplayConfig() {
    const { width, height } = document.body.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio;
    return { width, height, devicePixelRatio };
}
function isDebug() {
    return new URLSearchParams(window.location.search).has('debug');
}
