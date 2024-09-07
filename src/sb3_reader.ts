import { createLogger, Logger } from "./log";
import { CatnipCommandList, CatnipCommandOp, CatnipInputOp, CatnipOps } from "./ops";
import { CatnipProjectDesc } from "./runtime/CatnipProject";
import { CatnipScriptID, CatnipScriptTriggerDesc } from "./runtime/CatnipScript";
import { CatnipSpriteDesc, CatnipSpriteID } from "./runtime/CatnipSprite";
import { CatnipTargetVariableDesc } from "./runtime/CatnipTarget";
import { CatnipVariableDesc, CatnipVariableID } from "./runtime/CatnipVariable";
import { ProjectSB3, ProjectSB3Block, ProjectSB3BlockOpcode, ProjectSB3Field, ProjectSB3Input, ProjectSB3InputType, ProjectSB3InputValueColor, ProjectSB3InputValueInline, ProjectSB3InputValueNameID, ProjectSB3InputValueNumber, ProjectSB3InputValueString, ProjectSB3InputValueType, ProjectSB3Target, ProjectSB3TargetBlocks, SB3BlockTypes } from "./sb3";
import { sb3_ops, SB3CommandBlockDeserializer, SB3HatBlockDeserializer, SB3InputBlockDeserializer } from "./sb3_ops";


export interface SB3VariableInfo {
    readonly spriteID: CatnipSpriteID;
    readonly variableID: CatnipVariableID;
}

export class SB3ReadMetadata {
    public static Logger: Logger = createLogger("SB3Read");

    private _spriteCount: number;
    private _scriptCount: number;

    private _variableMap: Map<string, SB3VariableInfo>;
    private _variableCount: number;

    public constructor() {
        this._variableMap = new Map();
        this._variableCount = 0;
        this._spriteCount = 0;
        this._scriptCount = 0;
    }

    private _assignVariableID(): CatnipVariableID {
        return (this._variableCount++) + "";
    }

    public addVariable(scratchVariableID: string, spriteID: CatnipSpriteID): CatnipVariableID {
        const variableID = this._assignVariableID();
        this._variableMap.set(scratchVariableID, { spriteID, variableID });
        return variableID;
    }

    public getVariable(scratchVariableID: string): SB3VariableInfo {
        const variableInfo = this._variableMap.get(scratchVariableID);
        if (variableInfo === undefined) throw new Error(`Unknown variable ID '${scratchVariableID}'`);
        return variableInfo;
    }

    public assignSpriteID(): CatnipSpriteID {
        return (this._spriteCount++) + "";
    }

    public assignScriptID(): CatnipScriptID {
        return (this._scriptCount++) + "";
    }
}

enum BlockType {
    HAT,
    COMMAND,
    INPUT
}

export class SB3ScriptReader {

    public readonly meta: SB3ReadMetadata;
    public readonly spriteDesc: CatnipSpriteDesc;
    public readonly blocks: Map<string, ProjectSB3Block>;

    public constructor(meta: SB3ReadMetadata, spriteDesc: CatnipSpriteDesc, blocks: ProjectSB3TargetBlocks) {
        this.meta = meta;
        this.spriteDesc = spriteDesc;

        this.blocks = new Map();
        for (const blockID in blocks) {
            const block = blocks[blockID];
            if (Array.isArray(block)) continue;
            this.blocks.set(blockID, block);
        }
    }

    public getVariable(variable: string | ProjectSB3Field<string>): SB3VariableInfo {
        let variableID: string;

        if (Array.isArray(variable)) {
            variableID = variable[1];
        } else {
            variableID = variable;
        }

        return this.meta.getVariable(variableID);
    }

    private _getBlockInfo<TOpcode extends ProjectSB3BlockOpcode>(opcode: TOpcode): { type: BlockType.HAT, deserializer: SB3HatBlockDeserializer<TOpcode> } |
    { type: BlockType.COMMAND, deserializer: SB3CommandBlockDeserializer<TOpcode> } |
    { type: BlockType.INPUT, deserializer: SB3InputBlockDeserializer<TOpcode> } {
        const hatBlockDeserializer = sb3_ops.hatBlocks.get(opcode);

        if (hatBlockDeserializer !== undefined) {
            return {
                type: BlockType.HAT,
                deserializer: hatBlockDeserializer
            }
        }

        const commandBlockDeserializer = sb3_ops.commandBlocks.get(opcode);

        if (commandBlockDeserializer !== undefined) {
            return {
                type: BlockType.COMMAND,
                deserializer: commandBlockDeserializer
            }
        }

        const inputBlockDeserializer = sb3_ops.inputBlocks.get(opcode);

        if (inputBlockDeserializer !== undefined) {
            return {
                type: BlockType.INPUT,
                deserializer: inputBlockDeserializer
            }
        }

        throw new Error(`Unknown SB3 block opcode '${opcode}'.`);
    }

    public readScripts() {
        for (const hatBlock of this.blocks.values()) {
            if (!hatBlock.topLevel) continue;

            const hatBlockInfo = this._getBlockInfo(hatBlock.opcode);

            if (hatBlockInfo.type !== BlockType.HAT) continue;

            const scriptTrigger = hatBlockInfo.deserializer(this, hatBlock);
            const scriptCommands = this.readStack(hatBlock.next);

            this.spriteDesc.scripts.push({
                id: this.meta.assignScriptID(),
                trigger: scriptTrigger,
                commands: scriptCommands
            });
        }
    }

    private _readInputFromArray(array: ProjectSB3InputValueInline): CatnipInputOp {
        switch (array[0]) {
            case ProjectSB3InputValueType.NUMBER:
            case ProjectSB3InputValueType.POSITIVE_NUMBER:
            case ProjectSB3InputValueType.POSITIVE_INTEGER:
            case ProjectSB3InputValueType.INTEGER:
            case ProjectSB3InputValueType.ANGLE:
            case ProjectSB3InputValueType.STRING:
                return CatnipOps.core_const.create({ value: array[1] });
            case ProjectSB3InputValueType.COLOR:
                throw new Error("Not supported.");
            case ProjectSB3InputValueType.BROADCAST:
                throw new Error("Not supported.");
            case ProjectSB3InputValueType.VARIABLE: {
                const variableInfo = this.meta.getVariable(array[2]);
                return CatnipOps.data_get_var.create({
                    sprite: variableInfo.spriteID,
                    variable: variableInfo.variableID
                });
            }
            case ProjectSB3InputValueType.LIST:
                throw new Error("Not supported.");
        }
    }

    public readStack(stack: ProjectSB3Input | string | null): CatnipCommandList {
        const stackCommands: CatnipCommandList = [];

        let stackID: string | null;

        if (Array.isArray(stack)) {
            if (stack[0] === ProjectSB3InputType.SHADOW_ONLY)
                return stackCommands;

            const inputValue = stack[1];

            if (typeof inputValue !== "string")
                throw new Error(`Unexpected input array.`);

            stackID = inputValue;
        } else {
            stackID = stack;
        }

        while (stackID !== null) {
            const block = this.blocks.get(stackID);
            SB3ReadMetadata.Logger.assert(block !== undefined);

            const blockInfo = this._getBlockInfo(block.opcode);

            if (blockInfo.type !== BlockType.COMMAND)
                throw new Error(`Unexpected input ${(blockInfo.type === BlockType.HAT ? "hat" : "input")} type '${block.opcode}' in block stack (block '${stackID}').`);

            stackCommands.push(blockInfo.deserializer(this, block));

            stackID = block.next;
        }

        return stackCommands;
    }

    public readInput(input: ProjectSB3Input | string | null): CatnipInputOp {
        SB3ReadMetadata.Logger.assert(input !== null);

        let inputID: string;

        if (Array.isArray(input)) {
            const inputValue = input[1];

            if (typeof inputValue !== "string")
                return this._readInputFromArray(inputValue);

            inputID = inputValue;
        } else {
            inputID = input;
        }

        const block = this.blocks.get(inputID);
        SB3ReadMetadata.Logger.assert(block !== undefined);
        const blockInfo = this._getBlockInfo(block.opcode);

        if (blockInfo.type !== BlockType.INPUT)
            throw new Error(`Unexpected input ${(blockInfo.type === BlockType.HAT ? "hat" : "command")} type '${block.opcode}' in input (block '${inputID}').`);

        return blockInfo.deserializer(this, block);
    }
}

function readTargetMeta(meta: SB3ReadMetadata, target: ProjectSB3Target): CatnipSpriteDesc {
    const spriteID = meta.assignSpriteID();

    const variableDesc: CatnipVariableDesc[] = [];
    const variableValueDesc: CatnipTargetVariableDesc[] = [];

    for (const scratchVariableID in target.variables) {
        const scratchVariable = target.variables[scratchVariableID];

        const variableID = meta.addVariable(scratchVariableID, spriteID);

        variableDesc.push({
            id: variableID,
            name: scratchVariable[0],
        });

        let value: number | string;

        if (typeof scratchVariable[1] === "boolean") {
            value = "" + scratchVariable[1];
        } else {
            value = scratchVariable[1];
        }

        variableValueDesc.push({
            id: variableID,
            value: value
        });
    }

    return {
        id: spriteID,
        name: target.name,
        variables: variableDesc,
        scripts: [],

        target: {
            variables: variableValueDesc,
            x_position: 0,
            y_position: 0
        }
    };
}

export function readSB3(sb3: ProjectSB3): CatnipProjectDesc {
    const meta = new SB3ReadMetadata();

    const spritesDesc: CatnipSpriteDesc[] = [];

    for (const target of sb3.targets)
        spritesDesc.push(readTargetMeta(meta, target));

    for (let i = 0; i < spritesDesc.length; i++) {
        const target = sb3.targets[i];
        const desc = spritesDesc[i];

        const scriptReader = new SB3ScriptReader(meta, desc, target.blocks);
        scriptReader.readScripts();
    }

    return {
        sprites: spritesDesc
    };
}