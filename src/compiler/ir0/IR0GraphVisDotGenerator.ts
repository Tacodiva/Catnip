import { IR0BasicBlock } from "./IR0BasicBlock";
import { IR0Script } from "./IR0Script";

interface BasicBlockInfo {
    clusterName: string;
    firstNode: string;
    finalNode: string;
}

interface ScriptInfo {
    clusterName: string;
    triggerNode: string;
}

export class IR0GraphVisDotGenerator {

    public indentation: number;
    public dot: string;
    public nextName: number;
    public edges: string[];

    public blocks: Map<IR0BasicBlock, BasicBlockInfo>;
    public scripts: Map<IR0Script, ScriptInfo>;

    public constructor() {
        this.dot = "digraph {\n  compound=true;";
        this.indentation = 1;
        this.nextName = 0;
        this.blocks = new Map();
        this.scripts = new Map();
        this.edges = [];
    }

    public getScriptInfo(script: IR0Script): ScriptInfo {
        let info = this.scripts.get(script);
        if (info !== undefined) return info;
        this.scripts.set(script, info = {
            clusterName: this.getName(),
            triggerNode: this.getName()
        });
        return info;
    }

    public getName(): string {
        return "" + (this.nextName++);
    }

    public writeLine(line: string) {
        this.dot += "\n";

        for (let i = 0; i < this.indentation; i++) {
            this.dot += "  ";
        }

        this.dot += line;
    }

    public writeEdge(from: string, to: string, props: string) {
        this.edges.push(`${from} -> ${to} [${props}]`);
    }

    public writeExecutionEdge(from: string, to: string, label?: string) {
        if (label) {
            this.writeEdge(from, to, `label="${label}" color=green`);
        } else {
            this.writeEdge(from, to, `color=green`);
        }
    }

    public writeValueEdge(from: string, to: string, label: string) {
        this.writeEdge(from, to, `label="${label}" color=blue arrowhead=vee`);
    }

    public incrementIndentation() {
        ++this.indentation;
    }

    public decrementIndentation() {
        --this.indentation;
    }

    public toDotFile(): string {
        this.dot += "\n";
        for (const edge of this.edges) {
            this.dot += "  " + edge + "\n";
        }
        return this.dot += "}";
    }

}
