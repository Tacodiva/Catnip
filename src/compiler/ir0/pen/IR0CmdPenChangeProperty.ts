import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1InstrPenChangeParam, IR1PenParameter, IR1PenParameterChangeType } from "../../ir1/pen/IR1InstrPenChangeParam";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0Input } from "../IR0Node";

export class IR0CmdPenChangeProperty extends IR0Command<["parameter", "value"]> {

    public type: IR1PenParameterChangeType;

    public constructor(type: IR1PenParameterChangeType, parameter: IR0Input, value: IR0Input) {
        super("pen_set_property", {
            parameter: {
                value: parameter,
                format: CatnipValueFormat.I32_HSTRING
            },
            value: {
                value,
                format: CatnipValueFormat.F64_NUMBER
            }
        });

        this.type = type;
    }

    public emitIR1(emitter: IR1Emitter) {

        const parameterValue = this.args.parameter.getResult();
        let parameter: IR1PenParameter;

        if (parameterValue.isConstant) {
            const parameterValueString = parameterValue.asConstantString();

            switch (parameterValueString.toLowerCase()) {
                case "color":
                    parameter = IR1PenParameter.COLOR;
                    break;
                case "saturation":
                    parameter = IR1PenParameter.SATURATION;
                    break;
                case "brightness":
                    parameter = IR1PenParameter.BRIGHTNESS;
                    break;
                case "transparency":
                    parameter = IR1PenParameter.TRANSPARENCY;
                    break;
                default:
                    CatnipCompilerLogger.warn("Invalid pen property name constant.");
                    parameter = IR1PenParameter.DYNAMIC;
                    break;
            }
        } else {
            parameter = IR1PenParameter.DYNAMIC;
        }

        if (parameter === IR1PenParameter.DYNAMIC) {
            emitter.emitInput(this.args.parameter);
        }
        
        emitter.emitInput(this.args.value);
        emitter.emitIR1(new IR1InstrPenChangeParam(parameter, this.type));
    }

    public clone(ctx: IR0CloneContext): IR0Command<string[]> {
        return new IR0CmdPenChangeProperty(this.type, this.args.parameter.input.clone(ctx), this.args.value.input.clone(ctx));
    }
} 