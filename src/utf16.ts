
export default class UTF16 {

    private constructor() { }

    public static readonly TEXT_DECODER = new TextDecoder("utf-16");

    public static encode(str: string): Uint8Array {
        var buf = new ArrayBuffer(str.length * 2);
        var bufView = new Uint16Array(buf);
        for (var i = 0; i < str.length; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return new Uint8Array(buf);
    }

    public static decode(buf: AllowSharedBufferSource): string {
        return this.TEXT_DECODER.decode(buf);
    }
}