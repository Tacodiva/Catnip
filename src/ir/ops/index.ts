
import { CatnipOps } from "../CatnipOps";
import control from "./control";
import core from "./core";

type Ops = typeof core & typeof control;

Object.assign(CatnipOps, core);
Object.assign(CatnipOps, control);

declare module "../CatnipOps" {
    interface CatnipOps extends Ops {}
}
