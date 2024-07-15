import { CatnipOpTypes } from "../CatnipOpTypes";
import { Control } from "./Control"
import { Core } from "./Core"
import { Operator } from "./Operator";

type Ops = typeof Core & typeof Control & typeof Operator;

declare module "../CatnipOpTypes" {
    interface CatnipOpTypes extends Ops {}
}

Object.assign(CatnipOpTypes, Core);
Object.assign(CatnipOpTypes, Operator);
Object.assign(CatnipOpTypes, Control);