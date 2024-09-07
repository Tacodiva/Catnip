import { registerSB3HatBlock } from "../../sb3_ops";

registerSB3HatBlock("event_whenflagclicked", (ctx, block) => ({
    type: "event",
    event: "whenflagclicked"
}));