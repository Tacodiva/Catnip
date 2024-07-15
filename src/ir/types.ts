
export enum CatnipInputFlags {
    /** The value Infinity */
    NUMBER_POS_INF = 0x001,
    /** Any natural number */
    NUMBER_POS_INT = 0x002,
    /** Any positive fractional number, excluding integers. */
    NUMBER_POS_FRACT = 0x004,
    /** Any positive number excluding 0 and Infinity.  */
    NUMBER_POS_REAL = NUMBER_POS_INT | NUMBER_POS_FRACT,
    /** The value 0 */
    NUMBER_ZERO = 0x008,
    /** The value -0 */
    NUMBER_NEG_ZERO = 0x010,
    /** Any negitive integer excluding -0 */
    NUMBER_NEG_INT = 0x020,
    /** Any negitive fractional number, excluding integers. */
    NUMBER_NEG_FRACT = 0x040,
    /** Any negitive number excluding -0 and -Infinity */
    NUMBER_NEG_REAL = NUMBER_NEG_INT | NUMBER_NEG_FRACT,
    /** The value -Infinity */
    NUMBER_NEG_INF = 0x080,

    /** The value NaN */
    NUMBER_NAN = 0x100,

    /** Either 0 or -0. */
    NUMBER_ANY_ZERO = NUMBER_ZERO | NUMBER_NEG_ZERO,
    /** Either Infinity or -Infinity. */
    NUMBER_INF = NUMBER_POS_INF | NUMBER_NEG_INF,
    /** Any positive number, excluding 0. */
    NUMBER_POS = NUMBER_POS_REAL | NUMBER_POS_INF,
    /** Any negitive number, excluding -0. */
    NUMBER_NEG = NUMBER_NEG_REAL | NUMBER_NEG_INF,
    /** Any whole number. */
    NUMBER_WHOLE = NUMBER_POS_INT | NUMBER_ZERO,
    /** Any integer. */
    NUMBER_INT = NUMBER_POS_INT | NUMBER_ANY_ZERO | NUMBER_NEG_INT,
    /** Any number that works as an array index. */
    NUMBER_INDEX = NUMBER_INT | NUMBER_INF | NUMBER_NAN,
    /** Any fractional non-integer numbers. */
    NUMBER_FRACT = NUMBER_POS_FRACT | NUMBER_NEG_FRACT,
    /** Any real number. */
    NUMBER_REAL = NUMBER_POS_REAL | NUMBER_ANY_ZERO | NUMBER_NEG_REAL,

    /** Any number, excluding NaN. */
    NUMBER = NUMBER_REAL | NUMBER_INF,
    /** Any number, including NaN. */
    NUMBER_OR_NAN = NUMBER | NUMBER_NAN,

    /** Any string which as a non-NaN neumeric interpretation, excluding ''.  */
    STRING_NUM = 0x200,
    /** Any string which has no non-NaN neumeric interpretation, including ''. */
    STRING_NAN = 0x400,
    /** Either of the strings 'true' or 'false'. */
    STRING_BOOLEAN = 0x800,

    /** Any string. */
    STRING = STRING_NUM | STRING_NAN | STRING_BOOLEAN,

    /** Any boolean. */
    BOOLEAN = 0x1000,
    /** Any input that can be interperated as a boolean. */
    BOOLEAN_INTERPRETABLE = BOOLEAN | STRING_BOOLEAN,

    /** Anything that can be interperated as a number. */
    NUMBER_INTERPRETABLE = NUMBER | STRING_NUM | BOOLEAN,

    /** Any type. */
    ANY = NUMBER_OR_NAN | STRING | BOOLEAN
};

export enum CatnipInputFormat {
    i32,
    HSTRING_PTR, // (i32)
    f64,
}