import { CatnipCommandOp, CatnipInputOp } from "./ops";
import { CatnipScriptTriggerDesc } from "./runtime/CatnipScript";
import { ProjectSB3Block, ProjectSB3BlockOpcode, SB3BlockTypes } from "./sb3";
import { SB3ScriptReader } from "./sb3_reader";

export type SB3CommandBlockDeserializer<TOpcode extends ProjectSB3BlockOpcode> = (ctx: SB3ScriptReader, block: ProjectSB3Block<TOpcode>) => CatnipCommandOp;
export type SB3InputBlockDeserializer<TOpcode extends ProjectSB3BlockOpcode> = (ctx: SB3ScriptReader, block: ProjectSB3Block<TOpcode>) => CatnipInputOp;
export type SB3HatBlockDeserializer<TOpcode extends ProjectSB3BlockOpcode> = (ctx: SB3ScriptReader, block: ProjectSB3Block<TOpcode>) => CatnipScriptTriggerDesc;

export const sb3_ops = {
    commandBlocks: new Map() as Map<string, SB3CommandBlockDeserializer<ProjectSB3BlockOpcode>>,
    inputBlocks: new Map() as Map<string, SB3InputBlockDeserializer<ProjectSB3BlockOpcode>>,
    hatBlocks: new Map() as Map<string, SB3HatBlockDeserializer<ProjectSB3BlockOpcode>>,
}

export function registerSB3CommandBlock<TOpcode extends keyof SB3BlockTypes>(opcode: TOpcode, deserializer: SB3CommandBlockDeserializer<TOpcode>) {
    sb3_ops.commandBlocks.set(opcode, deserializer as SB3CommandBlockDeserializer<ProjectSB3BlockOpcode>);
}

export function registerSB3InputBlock<TOpcode extends keyof SB3BlockTypes>(opcode: TOpcode, deserializer: SB3InputBlockDeserializer<TOpcode>) {
    sb3_ops.inputBlocks.set(opcode, deserializer as SB3InputBlockDeserializer<ProjectSB3BlockOpcode>);
}

export function registerSB3HatBlock<TOpcode extends keyof SB3BlockTypes>(opcode: TOpcode, deserializer: SB3HatBlockDeserializer<TOpcode>) {
    sb3_ops.hatBlocks.set(opcode, deserializer as SB3HatBlockDeserializer<ProjectSB3BlockOpcode>);
}