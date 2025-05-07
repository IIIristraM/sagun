'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.wait = wait;
function wait(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms + Math.random() * 20);
    });
}
