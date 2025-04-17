import { SpiderNumberType } from "wasm-spider";

export enum CatnipValueFormat {
    /** The value Infinity */
    F64_POS_INF = 1 << 0,
    /** Any natural number */
    F64_POS_INT = 1 << 1,
    /** Any positive fractional number, excluding integers. */
    F64_POS_FRACT = 1 << 2,
    /** Any positive number excluding 0 and Infinity.  */
    F64_POS_REAL = F64_POS_INT | F64_POS_FRACT,
    /** The value 0 */
    F64_ZERO = 1 << 3,
    /** The value -0 */
    F64_NEG_ZERO = 1 << 4,
    /** Any negitive integer excluding -0 */
    F64_NEG_INT = 1 << 5,
    /** Any negitive fractional number, excluding integers. */
    F64_NEG_FRACT = 1 << 6,
    /** Any negitive number excluding -0 and -Infinity */
    F64_NEG_REAL = F64_NEG_INT | F64_NEG_FRACT,
    /** The value -Infinity */
    F64_NEG_INF = 1 << 7,

    /** Either 0 or -0. */
    F64_ANY_ZERO = F64_ZERO | F64_NEG_ZERO,
    /** Either Infinity or -Infinity. */
    F64_INF = F64_POS_INF | F64_NEG_INF,
    /** Any positive number, excluding 0. */
    F64_POS = F64_POS_REAL | F64_POS_INF,
    /** Any negitive number, excluding -0. */
    F64_NEG = F64_NEG_REAL | F64_NEG_INF,
    /** Any whole number. */
    F64_WHOLE = F64_POS_INT | F64_ZERO,
    /** Any integer. */
    F64_INT = F64_POS_INT | F64_ANY_ZERO | F64_NEG_INT,
    /** Any fractional non-integer numbers. */
    F64_FRACT = F64_POS_FRACT | F64_NEG_FRACT,
    /** Any real number. */
    F64_REAL = F64_POS_REAL | F64_ANY_ZERO | F64_NEG_REAL,

    /** The value NaN (specifically, a WASM canonical NaN). */
    F64_NAN = 1 << 8,
    /** Any number, excluding NaN. */
    F64_NUMBER = F64_REAL | F64_INF,
    /** Any number, including NaN. */
    F64_NUMBER_OR_NAN = F64_NUMBER | F64_NAN,

    
    /** Any string. */
    I32_HSTRING = 1 << 9,
    /** A string nan-boxed into an F64. */
    F64_BOXED_I32_HSTRING = 1 << 10,
    
    
    /** Any number stored in an i32. */
    I32_NUMBER = 1 << 12,
    /** A boolean  */
    I32_BOOLEAN = 1 << 13,
    
    /** Any F64. */
    F64 = F64_NUMBER_OR_NAN | F64_BOXED_I32_HSTRING,
    /** Any I32. */
    I32 = I32_HSTRING | I32_NUMBER | I32_BOOLEAN,
    /** Any value. */
    ANY = I32 | F64,

    /** No value. */
    NONE = 0
};