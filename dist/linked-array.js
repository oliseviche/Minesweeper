"use strict";
(function (exports) {
    class LinkedArray {
        constructor() {
            this.tail = null;
            this.head = null;
            this.length = 0;
        }
        push(value) {
            if (this.tail === null) {
                this.tail = [null, value];
                this.head = this.tail;
                this.length++;
                return;
            }
            this.tail[0] = [null, value];
            this.tail = this.tail[0];
            this.length++;
        }
        shift() {
            let value = undefined;
            if (this.head) {
                value = this.head[1];
                const next = this.head[0];
                this.head[0] = null;
                this.head === this.tail && (this.tail = next);
                this.head = next;
                this.length--;
            }
            return value;
        }
    }
    ;
    exports.LinkedArray = LinkedArray;
})(typeof exports === 'undefined' ? Object.assign(globalThis, { LinkedArray: {} }) : exports);
