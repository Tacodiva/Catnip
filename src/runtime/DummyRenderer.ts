import { ICatnipRenderer } from "./ICatnipRenderer";

export class DummyRenderer implements ICatnipRenderer {

    penDrawLines(data: Float32Array, length: number): void { }
    penEraseAll(): void { }
    frame(): void { }

}