
import { CatnipCommandList } from '../ops/CatnipOp';
import { CatnipScriptTrigger } from '../ops/CatnipScriptTrigger';
import { CatnipSprite } from './CatnipSprite';


export type CatnipScriptID = string;

export interface CatnipScriptDesc {
    id: CatnipScriptID,
    trigger: CatnipScriptTrigger,
    commands: CatnipCommandList
};

export class CatnipScript {

    public readonly sprite: CatnipSprite;
    public readonly id: CatnipScriptID;

    public readonly trigger: CatnipScriptTrigger;

    public readonly commands: CatnipCommandList;

    /** @internal */
    constructor(sprite: CatnipSprite, desc: CatnipScriptDesc) {
        this.sprite = sprite;
        this.id = desc.id;
        this.trigger = desc.trigger;
        this.commands = desc.commands;
    }

}