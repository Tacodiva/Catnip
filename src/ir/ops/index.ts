
import { CatnipOps } from "../CatnipOps";
import control from "./control";
import core from "./core";
import operators from "./operators";

type Ops = typeof core & typeof control & typeof operators;

Object.assign(CatnipOps, core);
Object.assign(CatnipOps, control);
Object.assign(CatnipOps, operators);

declare module "../CatnipOps" {
    interface CatnipOps extends Ops {}
}
