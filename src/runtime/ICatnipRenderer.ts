
export const PEN_LINE_BUFFER_SIZE = 16384;
export const PEN_ATTRIBUTE_STRIDE = 10;
export const PEN_ATTRIBUTE_STRIDE_BYTES = PEN_ATTRIBUTE_STRIDE * 4;

export interface ICatnipRenderer {

    penDrawLines(data: Float32Array, length: number): void;
    penEraseAll(): void;
    
}