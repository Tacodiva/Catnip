import { CatnipValueFormat } from "./compiler/CatnipValueFormat";
import { createLogger, Logger } from "./log";
import { CatnipCommandList, CatnipCommandOp, CatnipInputOp, CatnipOps } from "./ops";
import { CatnipScriptTrigger } from "./ops/CatnipScriptTrigger";
import { op_const } from "./ops/core/const";
import { CatnipProcedureID } from "./ops/procedure/procedure_definition";
import { CatnipCostumeDesc } from "./runtime/CatnipCostume";
import { CatnipListDesc, CatnipListID } from "./runtime/CatnipList";
import { CatnipProjectDesc } from "./runtime/CatnipProject";
import { CatnipScriptID } from "./runtime/CatnipScript";
import { CatnipSpriteDesc, CatnipSpriteID } from "./runtime/CatnipSprite";
import { CatnipTargetListDesc, CatnipTargetVariableDesc } from "./runtime/CatnipTarget";
import { CatnipVariableDesc, CatnipVariableID } from "./runtime/CatnipVariable";
import { ProjectSB3, ProjectSB3Block, ProjectSB3BlockOpcode, ProjectSB3Field, ProjectSB3Input, ProjectSB3InputType, ProjectSB3InputValueColor, ProjectSB3InputValueInline, ProjectSB3InputValueNameID, ProjectSB3InputValueNumber, ProjectSB3InputValueString, ProjectSB3InputValueType, ProjectSB3Target, ProjectSB3TargetBlocks, SB3BlockTypes } from "./sb3";
import { SB3ReadLogger } from "./sb3_logger";
import { sb3_ops, SB3CommandBlockDeserializer, SB3HatBlockDeserializer, SB3InputBlockDeserializer } from "./sb3_ops";


export interface SB3VariableInfo {
    readonly spriteID: CatnipSpriteID;
    readonly variableID: CatnipVariableID;
}

export interface SB3ListInfo {
    readonly spriteID: CatnipSpriteID;
    readonly listID: CatnipListID;
}

export interface SB3ProcedureArgumentInfo {
    readonly id: string;
    readonly name: string;
    readonly format: CatnipValueFormat;
}

export interface SB3ProcedureInfo {
    readonly warp: boolean;
    readonly procedureID: CatnipProcedureID;
    readonly args: readonly SB3ProcedureArgumentInfo[];
}

export class SB3ReadMetadata {
    private _spriteCount: number;
    private _scriptCount: number;

    private _procedureMap: Map<string, SB3ProcedureInfo>;
    private _procedureCount: number;

    private _variableMap: Map<string, SB3VariableInfo>;
    private _variableCount: number;

    private _listMap: Map<string, SB3ListInfo>;
    private _listCount: number;

    public constructor() {
        this._spriteCount = 0;
        this._scriptCount = 0;
        this._variableCount = 0;
        this._variableMap = new Map();
        this._listCount = 0;
        this._listMap = new Map();
        this._procedureCount = 0;
        this._procedureMap = new Map();
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

    private _assignListID(): CatnipVariableID {
        return (this._listCount++) + "";
    }

    public addList(scratchListID: string, spriteID: CatnipSpriteID): CatnipListID {
        const listID = this._assignListID();
        this._listMap.set(scratchListID, { spriteID, listID: listID });
        return listID;
    }

    public getList(scratchListID: string): SB3ListInfo {
        const listInfo = this._listMap.get(scratchListID);
        if (listInfo === undefined) throw new Error(`Unknown list ID '${scratchListID}'`);
        return listInfo;
    }

    private _assignProcedureID(proccode: string): CatnipProcedureID {
        return (this._procedureCount++) + "_" + proccode;
    }

    public addProcedure(proccode: string, args: readonly SB3ProcedureArgumentInfo[], warp: boolean): CatnipProcedureID {
        const procedureID = this._assignProcedureID(proccode);
        this._procedureMap.set(proccode, {
            procedureID,
            args,
            warp
        });
        return procedureID;
    }

    public getProcedure(proccode: string): SB3ProcedureInfo | null {
        const procedureInfo = this._procedureMap.get(proccode);
        if (procedureInfo === undefined) return null;
        return procedureInfo;
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

    public getList(list: string | ProjectSB3Field<string>): SB3ListInfo {
        let listID: string;

        if (Array.isArray(list)) {
            listID = list[1];
        } else {
            listID = list;
        }

        return this.meta.getList(listID);
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
                return CatnipOps.core_const.create({ value: array[1] });
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

    public readInputOrBlockID(input: ProjectSB3Input | string | null): string | ProjectSB3InputValueInline | null {
        if (input === null) return null;

        if (Array.isArray(input)) {
            return input[1];
        } else {
            return input ?? null;
        }
    }

    public readBlockID(input: ProjectSB3Input | string | null): string | null {
        const inputOrBlockID = this.readInputOrBlockID(input);
        if (Array.isArray(inputOrBlockID))
            throw new Error(`Unexpected array literal, expected block ID.`);
        return inputOrBlockID;
    }

    public readOptionalBlockID(input: ProjectSB3Input | string | null): string | null {
        const inputOrBlockID = this.readInputOrBlockID(input);
        if (inputOrBlockID === null) return null;
        if (typeof inputOrBlockID !== "string")
            throw new Error(`Unexpected array literal, expected block ID.`);
        return inputOrBlockID;
    }

    public readStack(stack: ProjectSB3Input | string | null): CatnipCommandList {
        if (stack === null) return [];

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

        // This can happen if one of the inputs is named incorrectly
        if (input === undefined) throw new Error("Undefined block input.");

        const inputOrBlockID = this.readInputOrBlockID(input);

        if (Array.isArray(inputOrBlockID)) {
            return this._readInputFromArray(inputOrBlockID);
        }

        if (inputOrBlockID === null) {
            return op_const.create({ value: undefined })
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

    const listDesc: CatnipListDesc[] = [];
    const listValueDesc: CatnipTargetListDesc[] = [];

    const costumes: CatnipCostumeDesc[] = [];

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

    for (const scratchListID in target.lists) {
        const scratchList = target.lists[scratchListID];

        const listID = meta.addList(scratchListID, spriteID);

        listDesc.push({
            id: listID,
            name: scratchList[0],
        });

        let value: (number | string)[] = [];

        for (const listValue of scratchList[1]) {
            if (typeof listValue === "boolean") {
                value.push("" + listValue);
            } else {
                value.push(listValue);
            }
        }

        listValueDesc.push({
            id: listID,
            value: value
        });
    }

    for (const costume of target.costumes) {
        costumes.push({
            name: costume.name
        });
    }

    return {
        id: spriteID,
        name: target.name,
        variables: variableDesc,
        lists: listDesc,
        scripts: [],
        costumes,

        target: {
            variables: variableValueDesc,
            lists: listValueDesc,
            x_position: 0,
            y_position: 0,
            currentCostume: target.currentCostume
        }
    };
}

export function readSB3(sb3: ProjectSB3): CatnipProjectDesc {
    // const sb3Start = 
    console.time("SB3 Parse");

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

    console.timeEnd("SB3 Parse");
    return {
        sprites: spritesDesc
    };
}