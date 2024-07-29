
import { CatnipOps } from "../CatnipOps";
import core from "./core";
import control from "./control";
import operators from "./operators";
import data from "./data";

type Ops = typeof core & typeof control & typeof operators & typeof data;

Object.assign(CatnipOps, core);
Object.assign(CatnipOps, control);
Object.assign(CatnipOps, operators);
Object.assign(CatnipOps, data);

declare module "../CatnipOps" {
    interface CatnipOps extends Ops {}
}
