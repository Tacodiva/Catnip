
import "./when_flag_clicked";
import "./broadcast_trigger";
import { when_flag_clicked_trigger } from "./when_flag_clicked";
import { op_event_broadcast } from "./broadcast";
import { op_event_broadcast_and_wait } from "./broadcast_and_wait";

export default {
    event_when_flag_clicked_trigger: when_flag_clicked_trigger,
    event_broadcast: op_event_broadcast,
    op_event_broadcast_and_wait: op_event_broadcast_and_wait,
};