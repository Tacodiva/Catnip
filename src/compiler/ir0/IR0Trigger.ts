import { IR0GraphVisDotGenerator } from "./IR0";

export abstract class IR0Trigger {

    public abstract readonly isWarp: boolean;
    public abstract readonly name: string;

    public createGraphVisNode(generator: IR0GraphVisDotGenerator): string {
        const nodeName = generator.getName();
        generator.writeLine(`${nodeName} [shape=rect, label="${this.name}"]`);
        return nodeName;
    }

}