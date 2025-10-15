import { IR1Trigger } from "../ir1/IR1Trigger";
import { IR0GraphVisDotGenerator } from "./IR0";

export abstract class IR0Trigger {

    public abstract readonly isWarp: boolean;
    public abstract readonly name: string;

    public createGraphVisNode(generator: IR0GraphVisDotGenerator, nodeName: string): void {
        generator.writeLine(`${nodeName} [shape=rect, label="${this.name}"]`);
    }

    public abstract toIR1(): IR1Trigger;

}