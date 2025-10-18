import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { IR1Function } from "./IR1Function";
import { IR1 } from "./IR1";
import { IR1StringificationContext } from "./IR1StringificationContext";
import { IR1Trigger } from "./IR1Trigger";


export class IR1Script {
    public readonly ir: IR1;
    public readonly trigger: IR1Trigger;
    public readonly spriteID: CatnipSpriteID;

    public entrypoint: IR1Function;
    public functions: IR1Function[];

    public constructor(ir: IR1, trigger: IR1Trigger, spriteID: CatnipSpriteID) {
        this.ir = ir;
        this.trigger = trigger;
        this.spriteID = spriteID;
        this.functions = [];
        this.entrypoint = new IR1Function(this);

        this.ir.scripts.push(this);
    }

    public stringify(ctx?: IR1StringificationContext): void {
        ctx ??= new IR1StringificationContext();

        ctx.openBlock("script");

        ctx.writeLine(`entrypoint ${ctx.getFunctionName(this.entrypoint)}`);
        ctx.writeLine(`trigger ${this.trigger.stringify()}`);
        ctx.writeLine();

        for (const func of this.functions) func.stringify(ctx);

        ctx.closeBlock();
    }

}
