
import { CatnipOps } from "./CatnipOps";
import core from "./core";
import looks from "./looks";
import event from "./event";
import control from "./control";
import operators from "./operators";
import data from "./data";
import procedure from "./procedure";

type Ops = typeof core &
    typeof looks &
    typeof event &
    typeof control &
    typeof operators &
    typeof data & 
    typeof procedure;

Object.assign(CatnipOps, core);
Object.assign(CatnipOps, looks);
Object.assign(CatnipOps, control);
Object.assign(CatnipOps, event);
Object.assign(CatnipOps, operators);
Object.assign(CatnipOps, data);
Object.assign(CatnipOps, procedure);

declare module "./CatnipOps" {
    interface CatnipOps extends Ops { }
}
