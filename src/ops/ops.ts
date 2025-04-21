
import { CatnipOps } from "./CatnipOps";
import core from "./core";
import motion from "./motion";
import looks from "./looks";
import event from "./event";
import control from "./control";
import operators from "./operators";
import sensing from "./sensing";
import data from "./data";
import procedure from "./procedure";
import pen from "./pen";

type Ops = typeof core &
    typeof motion &
    typeof looks &
    typeof event &
    typeof control &
    typeof operators &
    typeof sensing &
    typeof data & 
    typeof procedure &
    typeof pen;

Object.assign(CatnipOps, core);
Object.assign(CatnipOps, motion);
Object.assign(CatnipOps, looks);
Object.assign(CatnipOps, control);
Object.assign(CatnipOps, event);
Object.assign(CatnipOps, operators);
Object.assign(CatnipOps, sensing);
Object.assign(CatnipOps, data);
Object.assign(CatnipOps, procedure);
Object.assign(CatnipOps, pen);

declare module "./CatnipOps" {
    interface CatnipOps extends Ops { }
}
