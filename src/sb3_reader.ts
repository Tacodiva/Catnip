import { CatnipEventID } from "./compiler/ir/core/event_trigger";
import { createLogger, Logger } from "./log";
import { CatnipCommandList, CatnipCommandOp, CatnipInputOp, CatnipOps } from "./ops";
import { CatnipScriptTrigger } from "./ops/CatnipScriptTrigger";
import { CatnipProcedureID, CatnipProcedureTriggerArgType } from "./ops/procedure/procedure_definition";
import { CatnipProjectDesc } from "./runtime/CatnipProject";
import { CatnipScriptID } from "./runtime/CatnipScript";
import { CatnipSpriteDesc, CatnipSpriteID } from "./runtime/CatnipSprite";
import { CatnipTargetVariableDesc } from "./runtime/CatnipTarget";
import { CatnipVariableDesc, CatnipVariableID } from "./runtime/CatnipVariable";
import { ProjectSB3, ProjectSB3Block, ProjectSB3BlockOpcode, ProjectSB3Field, ProjectSB3Input, ProjectSB3InputType, ProjectSB3InputValueColor, ProjectSB3InputValueInline, ProjectSB3InputValueNameID, ProjectSB3InputValueNumber, ProjectSB3InputValueString, ProjectSB3InputValueType, ProjectSB3Target, ProjectSB3TargetBlocks, SB3BlockTypes } from "./sb3";
import { SB3ReadLogger } from "./sb3_logger";
import { sb3_ops, SB3CommandBlockDeserializer, SB3HatBlockDeserializer, SB3InputBlockDeserializer } from "./sb3_ops";


export interface SB3VariableInfo {
    readonly spriteID: CatnipSpriteID;
    readonly variableID: CatnipVariableID;
}

export interface SB3ProcedureArgumentInfo {
    readonly id: string;
    readonly name: string;
    readonly type: CatnipProcedureTriggerArgType;
}

export interface SB3ProcedureInfo {
    readonly procedureID: CatnipProcedureID;
    readonly args: ReadonlyArray<SB3ProcedureArgumentInfo>;
}

export class SB3ReadMetadata {
    private _spriteCount: number;
    private _scriptCount: number;

    private _procedureMap: Map<string, SB3ProcedureInfo>;
    private _procedureCount: number;

    private _variableMap: Map<string, SB3VariableInfo>;
    private _variableCount: number;

    private _broadcastMap: Map<string, CatnipEventID>;
    private _broadcastCount: number;

    public constructor() {
        this._spriteCount = 0;
        this._scriptCount = 0;
        this._variableCount = 0;
        this._variableMap = new Map();
        this._procedureCount = 0;
        this._procedureMap = new Map();
        this._broadcastCount = 0;
        this._broadcastMap = new Map();
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

    private _assignProcedureID(proccode: string): CatnipProcedureID {
        return (this._procedureCount++) + "_" + proccode;
    }

    public addProcedure(proccode: string, args: ReadonlyArray<SB3ProcedureArgumentInfo>): CatnipProcedureID {
        const procedureID = this._assignProcedureID(proccode);
        this._procedureMap.set(proccode, {
            procedureID,
            args
        });
        return procedureID;
    }

    public getProcedure(proccode: string): SB3ProcedureInfo | null {
        const procedureInfo = this._procedureMap.get(proccode);
        if (procedureInfo === undefined) return null;
        return procedureInfo;
    }

    public getBroadcast(id: string, name: string): CatnipEventID {
        let broadcastEvent = this._broadcastMap.get(id);
        if (broadcastEvent === undefined) {
            broadcastEvent = this._assignBroadcastID(name);
            this._broadcastMap.set(id, broadcastEvent);
        }
        return broadcastEvent;
    }

    public assignSpriteID(): CatnipSpriteID {
        return (this._spriteCount++) + "";
    }

    public assignScriptID(): CatnipScriptID {
        return (this._scriptCount++) + "";
    }

    private _assignBroadcastID(name: string): CatnipEventID {
        return name + "_" + (this._broadcastCount++);
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

    public getBlock(id: string): ProjectSB3Block {
        const block = this.blocks.get(id);
        if (block === undefined) throw new Error(`Unknown block ID '${id}'`);
        return block;
    }

    public readScripts() {
        const scripts: { trigger: CatnipScriptTrigger, stack: string | null }[] = [];

        // We deserialize the hats first to enumerate all the procedures
        for (const hatBlock of this.blocks.values()) {
            if (!hatBlock.topLevel) continue;

            const hatBlockInfo = this._getBlockInfo(hatBlock.opcode);

            if (hatBlockInfo.type !== BlockType.HAT) continue;

            const trigger = hatBlockInfo.deserializer(this, hatBlock);

            scripts.push({
                trigger,
                stack: hatBlock.next
            });
        }

        for (const script of scripts) {
            const scriptCommands = this.readStack(script.stack);

            this.spriteDesc.scripts.push({
                id: this.meta.assignScriptID(),
                trigger: script.trigger,
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
                return CatnipOps.core_const.create({ value: array[1] });
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

    public readOptionalInputOrBlockID(input: ProjectSB3Input | string | null): string | ProjectSB3InputValueInline | null {
        if (input === null) return null;

        if (Array.isArray(input)) {
            return input[1];
        } else {
            return input;
        }
    }

    public readInputOrBlockID(input: ProjectSB3Input | string | null): string | ProjectSB3InputValueInline {
        SB3ReadLogger.assert(input !== null);

        const inputOrBlockID = this.readOptionalInputOrBlockID(input);

        if (inputOrBlockID === null)
            throw new Error("Unexpected null input value.");

        return inputOrBlockID;
    }

    public readBlockID(input: ProjectSB3Input | string | null): string {
        const inputOrBlockID = this.readInputOrBlockID(input);
        if (typeof inputOrBlockID !== "string")
            throw new Error(`Unexpected array literal, expected block ID.`);
        return inputOrBlockID;
    }

    public readOptionalBlockID(input: ProjectSB3Input | string | null): string | null {
        const inputOrBlockID = this.readOptionalInputOrBlockID(input);
        if (inputOrBlockID === null) return null;
        if (typeof inputOrBlockID !== "string")
            throw new Error(`Unexpected array literal, expected block ID.`);
        return inputOrBlockID;
    }

    public readStack(stack: ProjectSB3Input | string | null): CatnipCommandList {
        let stackID: string | null = this.readBlockID(stack);
        const stackCommands: CatnipCommandList = [];

        while (stackID !== null) {
            const block = this.getBlock(stackID);

            const blockInfo = this._getBlockInfo(block.opcode);

            if (blockInfo.type !== BlockType.COMMAND)
                throw new Error(`Unexpected input ${(blockInfo.type === BlockType.HAT ? "hat" : "input")} type '${block.opcode}' in block stack (block '${stackID}').`);

            stackCommands.push(blockInfo.deserializer(this, block));

            stackID = block.next;
        }

        return stackCommands;
    }

    public readInput(input: ProjectSB3Input | string | null): CatnipInputOp {
        const inputOrBlockID = this.readInputOrBlockID(input);

        if (Array.isArray(inputOrBlockID)) {
            return this._readInputFromArray(inputOrBlockID);
        }

        const block = this.getBlock(inputOrBlockID);
        const blockInfo = this._getBlockInfo(block.opcode);

        if (blockInfo.type !== BlockType.INPUT)
            throw new Error(`Unexpected input ${(blockInfo.type === BlockType.HAT ? "hat" : "command")} type '${block.opcode}' in input (block '${inputOrBlockID}').`);

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