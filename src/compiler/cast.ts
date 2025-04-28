
export type catnip_compiler_constant = string | number | boolean | undefined;

/** 
 * Stolen from https://github.com/TurboWarp/scratch-vm/blob/fed099c4ccb1ae59a8a7fe2ae14fa4ef4b85bd01/src/util/cast.js
 * With some custom edition for the color stuff
 */

/**
 * @fileoverview
 * Utilities for casting and comparing Scratch data-types.
 * Scratch behaves slightly differently from JavaScript in many respects,
 * and these differences should be encapsulated below.
 * For example, in Scratch, add(1, join("hello", world")) -> 1.
 * This is because "hello world" is cast to 0.
 * In JavaScript, 1 + Number("hello" + "world") would give you NaN.
 * Use when coercing a value before computation.
 */


/**
 * Used internally by compare()
 * @param val A value that evaluates to 0 in JS string-to-number conversation such as empty string, 0, or tab.
 * @returns {boolean} True if the value should not be treated as the number zero.
 */
const isNotActuallyZero = (val: catnip_compiler_constant): boolean => {
    if (typeof val !== 'string') return false;
    for (let i = 0; i < val.length; i++) {
        const code = val.charCodeAt(i);
        // '0'.charCodeAt(0) === 48
        // '\t'.charCodeAt(0) === 9
        // We include tab for compatibility with scratch-www's broken trim() polyfill.
        // https://github.com/TurboWarp/scratch-vm/issues/115
        // https://scratch.mit.edu/projects/788261699/
        if (code === 48 || code === 9) {
            return false;
        }
    }
    return true;
};

export class Cast {
    /**
     * Scratch cast to number.
     * Treats NaN as 0.
     * In Scratch 2.0, this is captured by `interp.numArg.`
     * @param {*} value Value to cast to number.
     * @return {number} The Scratch-casted number value.
     */
    static toNumber(value: catnip_compiler_constant): number {
        // If value is already a number we don't need to coerce it with
        // Number().
        if (typeof value === 'number') {
            // Scratch treats NaN as 0, when needed as a number.
            // E.g., 0 + NaN -> 0.
            if (Number.isNaN(value)) {
                return 0;
            }
            return value;
        }
        const n = Number(value);
        if (Number.isNaN(n)) {
            // Scratch treats NaN as 0, when needed as a number.
            // E.g., 0 + NaN -> 0.
            return 0;
        }
        return n;
    }

    /**
     * Scratch cast to boolean.
     * In Scratch 2.0, this is captured by `interp.boolArg.`
     * Treats some string values differently from JavaScript.
     * @param {*} value Value to cast to boolean.
     * @return {boolean} The Scratch-casted boolean value.
     */
    static toBoolean(value: catnip_compiler_constant) {
        // Already a boolean?
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            // These specific strings are treated as false in Scratch.
            if ((value === '') ||
                (value === '0') ||
                (value.toLowerCase() === 'false')) {
                return false;
            }
            // All other strings treated as true.
            return true;
        }
        // Coerce other values and numbers.
        return Boolean(value);
    }

    /**
     * Scratch cast to string.
     * @param {*} value Value to cast to string.
     * @return {string} The Scratch-casted string value.
     */
    static toString(value: catnip_compiler_constant) {
        return String(value);
    }

    /**
     * Determine if a Scratch argument is a white space string (or null / empty).
     * @param {*} val value to check.
     * @return {boolean} True if the argument is all white spaces or null / empty.
     */
    static isWhiteSpace(val: catnip_compiler_constant) {
        return val === null || (typeof val === 'string' && val.trim().length === 0);
    }

    /**
     * Compare two values, using Scratch cast, case-insensitive string compare, etc.
     * In Scratch 2.0, this is captured by `interp.compare.`
     * @param {*} v1 First value to compare.
     * @param {*} v2 Second value to compare.
     * @returns {number} Negative number if v1 < v2; 0 if equal; positive otherwise.
     */
    static compare(v1: catnip_compiler_constant, v2: catnip_compiler_constant) {
        let n1 = Number(v1);
        let n2 = Number(v2);
        if (n1 === 0 && isNotActuallyZero(v1)) {
            n1 = NaN;
        } else if (n2 === 0 && isNotActuallyZero(v2)) {
            n2 = NaN;
        }
        if (isNaN(n1) || isNaN(n2)) {
            // At least one argument can't be converted to a number.
            // Scratch compares strings as case insensitive.
            const s1 = String(v1).toLowerCase();
            const s2 = String(v2).toLowerCase();
            if (s1 < s2) {
                return -1;
            } else if (s1 > s2) {
                return 1;
            }
            return 0;
        }
        // Handle the special case of Infinity
        if (
            (n1 === Infinity && n2 === Infinity) ||
            (n1 === -Infinity && n2 === -Infinity)
        ) {
            return 0;
        }
        // Compare as numbers.
        return n1 - n2;
    }

    //
    // Stuff below here was written by me :3
    //

    static toRGB(value: catnip_compiler_constant): number {
        if (typeof (value) === "string" && value.charAt(0) === "#") {

            const hex = value.substring(1);
            const parsed = parseInt(hex, 16);

            if (isNaN(parsed)) return 0xFF << 24; // Alpha 255

            if (hex.length === 6) {
                return parsed;
            }

            if (hex.length == 3) {
                const r = ((parsed >> 8) & 0xf);
                const g = ((parsed >> 4) & 0xf);
                const b = parsed & 0xf;

                return (((((r << 4) | r) << 8) | (g << 4) | g) << 8) | (b << 4) | b;
            }

            return 0xFF << 24;
        } else {
            return Cast.toNumber(value) & 0xFFFFFFFF;
        }
    }

    static toKeyCode(key: catnip_compiler_constant): number {

        if (typeof (key) === "number") {
            if (key >= 48 && key <= 90)
                return key;

            if (key === " ".charCodeAt(0)) return key;

            throw new Error(`Unknown key code ${key}`);
        }

        key = "" + key;

        if (key.length === 1) {
            const code = key.toUpperCase().charCodeAt(0);
            if (code >= 48 && code <= 90)
                return code;
        }

        if (key === "space") return " ".charCodeAt(0);

        throw new Error(`Unknown key code '${key}'`);
    }

}
