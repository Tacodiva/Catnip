
type ProjectSB3Extension = "pen" | "wedo2" | "music" | "microbit" | "text2speech" | "translate" | "videoSensing" | "ev3" | "makeymakey" | "boost" | "gdxfor";

type ProjectSB3Value = string | number | boolean;

export type ProjectSB3Variable = [
    name: string,
    value: ProjectSB3Value,
    isCloud?: true
];

export type ProjectSB3List = [
    name: string,
    value: (ProjectSB3Value)[]
];

export const enum ProjectSB3InputValueType {
    SHADOW_ONLY = 1,
    INPUT_ONLY = 2,
    SHADOWED_INPUT = 3
}

export const enum ProjectSB3InputValueType {
    NUMBER = 4,
    POSITIVE_NUMBER = 5,
    POSITIVE_INTEGER = 6,
    INTEGER = 7,
    ANGLE = 8,
    COLOR = 9,
    STRING = 10,
    BROADCAST = 11,
    VARIABLE = 12,
    LIST = 13
}

export type ProjectSB3InputValueNumber = [
    type: ProjectSB3InputValueType.NUMBER | ProjectSB3InputValueType.POSITIVE_NUMBER | ProjectSB3InputValueType.POSITIVE_INTEGER | ProjectSB3InputValueType.INTEGER | ProjectSB3InputValueType.ANGLE,
    /** The number value. */
    value: string
];

export type ProjectSB3InputValueColor = [
    type: ProjectSB3InputValueType.COLOR,
    /** '#' followed by a hexadecimal number representing the color */
    value: string
];

export type ProjectSB3InputValueString = [
    type: ProjectSB3InputValueType.STRING,
    /** The string value. */
    value: string
];

export type ProjectSB3InputValueNameID = [
    type: ProjectSB3InputValueType.BROADCAST | ProjectSB3InputValueType.VARIABLE | ProjectSB3InputValueType.LIST,
    /** The name of the broadcast, variable or list as shown in the editor. */
    name: string,
    /** The ID of the broadcast, variable or list. */
    id: string,
];

/** An array representing an input. */
export type ProjectSB3InputValueInline = ProjectSB3InputValueNumber | ProjectSB3InputValueColor | ProjectSB3InputValueString | ProjectSB3InputValueNameID;

/** The block ID of the input or an array representing it. */
export type ProjectSB3InputValue = string | ProjectSB3InputValueInline;

export const enum ProjectSB3InputType {
    SHADOW_ONLY = 1,
    INPUT_ONLY = 2,
    SHADOWED_INPUT = 3
}

export type ProjectSB3InputShadowOnly = [
    type: ProjectSB3InputType.SHADOW_ONLY,
    shadow: ProjectSB3InputValue
];

export type ProjectSB3InputInputOnly = [
    type: ProjectSB3InputType.INPUT_ONLY,
    input: ProjectSB3InputValue
];

export type ProjectSB3InputShadowedInput = [
    type: ProjectSB3InputType.SHADOWED_INPUT,
    input: ProjectSB3InputValue | null,
    shadow: ProjectSB3InputValue
];

export type ProjectSB3Input = ProjectSB3InputShadowOnly | ProjectSB3InputInputOnly | ProjectSB3InputShadowedInput | undefined;

export type ProjectSB3Field<TID extends string | null | undefined = string | null | undefined, TValue extends ProjectSB3Value = ProjectSB3Value> = [
    value: TValue,
    /** The ID of the field's value. On present on certain fields. */
    id: TID
];

interface ProjectSB3MutationBase {
    tagName: "mutation",
    children: [],
}

export interface ProjectSB3MutationProcedure extends ProjectSB3MutationBase {
    /** The name of the custom block, including inputs: %s for string/number inputs and %b for boolean inputs. */
    proccode: string;
    /** A string which contains a JSON array of the ids of the arguments; these can also be found in the input property of the main block. */
    argumentids: string;
    /** True if this block runs without screen refresh. */
    warp: "true" | "false";
}

export interface ProjectSB3MutationProcedurePrototype extends ProjectSB3MutationProcedure {
    /** A string which contains a JSON array of the names of the arguments. */
    argumentnames: string;
    /** A string which contains a JSON array of the defaults of the arguments. For round inputs this is "" and for booleans it's false. */
    argumentdefaults: string;
}

export interface ProjectSB3MutationControlStop extends ProjectSB3MutationBase {
    /** True if this block can have a block following it or not. True for stop other scripts in sprite otherwise false.  */
    hasnext: boolean;
}

export type ProjectSB3Mutation = ProjectSB3MutationProcedure | ProjectSB3MutationProcedurePrototype | ProjectSB3MutationControlStop;

export type ProjectSB3BlockTopLevelVariable = [
    type: ProjectSB3InputValueType.VARIABLE | ProjectSB3InputValueType.LIST,
    /** The name of the broadcast, variable or list as shown in the editor. */
    name: string,
    /** The ID of the broadcast, variable or list. */
    id: string,

    x: number,
    y: number
];

export type ProjectSB3BlockOpcode = keyof SB3BlockTypes | string;

export type ProjectSB3BlockInputs<TOpcode extends ProjectSB3BlockOpcode = ProjectSB3BlockOpcode>
    = TOpcode extends keyof SB3BlockTypes ? SB3BlockTypes[TOpcode]["inputs"] : Record<string, ProjectSB3Input>;

export type ProjectSB3BlockFields<TOpcode extends ProjectSB3BlockOpcode = ProjectSB3BlockOpcode>
    = TOpcode extends keyof SB3BlockTypes ? SB3BlockTypes[TOpcode]["fields"] : Record<string, ProjectSB3Field>;

export type ProjectSB3BlockMutation<TOpcode extends ProjectSB3BlockOpcode = ProjectSB3BlockOpcode>
    = TOpcode extends keyof SB3BlockTypes ? SB3BlockTypes[TOpcode]["mutation"] : ProjectSB3Mutation;

interface ProjectSB3BlockBase<TOpcode extends ProjectSB3BlockOpcode = ProjectSB3BlockOpcode> {
    /** A string naming the block. */
    opcode: TOpcode;
    /** The ID of the following block */
    next: string | null;
    /** 
     * If the block is a stack block and is preceded, this is the ID of the preceding block. 
     * If the block is the first stack block in a C mouth, this is the ID of the C block. 
     * If the block is an input to another block, this is the ID of that other block.
     * Otherwise it is null. 
     */
    parent: string | null;
    /** 
     * An object associating input names with the ID of the block inside the input, or an array
     * representing the value of the input.
     */
    inputs: ProjectSB3BlockInputs<TOpcode>;
    /** An object associating field names and their values. */
    fields: ProjectSB3BlockFields<TOpcode>;
    /** Present when opcode is "procedures_call", "procedures_prototype" or "control_stop". */
    mutation: ProjectSB3BlockMutation<TOpcode>;
    /** True if this block is a shadow. */
    shadow: boolean;
    /** True if this block has no parent. */
    topLevel: boolean;
    /** The ID of the attached comment, if there is one. */
    comment?: string;
}

export interface ProjectSB3BlockTopLevel<TOpcode extends ProjectSB3BlockOpcode = ProjectSB3BlockOpcode> extends ProjectSB3BlockBase<TOpcode> {
    topLevel: true;
    x: number;
    y: number;
}

export interface ProjectSB3BlockInput<TOpcode extends ProjectSB3BlockOpcode = ProjectSB3BlockOpcode> extends ProjectSB3BlockBase<TOpcode> {
    topLevel: false;
}

export type ProjectSB3Block<TOpcode extends ProjectSB3BlockOpcode = ProjectSB3BlockOpcode> = ProjectSB3BlockTopLevel<TOpcode> | ProjectSB3BlockInput<TOpcode>;

export interface ProjectSB3Comment {
    /** The ID of the block the comment is attached to. */
    blockId: string;
    /** The x-coordinate of the comment. */
    x: number;
    /** The y-coordinate of the comment. */
    y: number;
    /** The width of the comment. */
    width: number
    /** The height of the comment. */
    height: number
    /** True if the comment is collapsed. */
    minimized: boolean;
    /** The content of the comment. */
    text: string;
}

interface ProjectSB3Asset {
    /** The MD5 hash of the asset file. */
    assetId: string;
    name: string;
    /** The name of the asset file. */
    md5ext: string;
    dataFormat: string;
}

export interface ProjectSB3Costume extends ProjectSB3Asset {
    /** The reciprocal of the scaling factor, if this costume is a bitmap. */
    bitmapResolution?: number;
    /** The x-coordinate of the center of the image. */
    rotationCenterX: number;
    /** The y-coordinate of the center of the image. */
    rotationCenterY: number;
}

export interface ProjectSB3Sound extends ProjectSB3Asset {
    /** The sample rate of the sound in Hz. */
    rate: number;
    /** The number of samples in the sound. */
    sampleCount: number;
}

export type ProjectSB3TargetBlocks = Record<string, ProjectSB3Block | ProjectSB3BlockTopLevelVariable>;

interface ProjectSB3TargetBase {
    isStage: boolean;
    name: string;
    /** A record associating IDs with variables.  */
    variables: Record<string, ProjectSB3Variable>;
    /** A record associating IDs with lists.  */
    lists: Record<string, ProjectSB3List>;
    /** A record associating broadcast IDs with their name. Normally only present in the stage. */
    broadcasts?: Record<string, string>;
    /** A record associating IDs with lists.  */
    blocks: ProjectSB3TargetBlocks;
    /** A record associating IDs with comments.  */
    comments: Record<string, ProjectSB3Comment>;
    /** The index in the costumes array of the current costume.  */
    currentCostume: number;
    costumes: ProjectSB3Costume[];
    sounds: ProjectSB3Sound[];
    /** The layer of the current sprite. Sprites with a higher layer are shown infront of those with a lower layer. */
    layerOrder: number;
    volume: number;
}

export interface ProjectSB3Sprite extends ProjectSB3TargetBase {
    isStage: false;
    visible: boolean;
    x: number;
    y: number;
    size: number;
    direction: number;
    draggable: boolean;
    rotationStyle: "all around" | "left-right" | "don't rotate";
}

export interface ProjectSB3Stage extends ProjectSB3TargetBase {
    isStage: true;
    name: "Stage";
    layerOrder: 0;
    tempo: number;
    /** If "on" or "on-flipped", video is visible on the stage. If "on-flipped" the video is flipped. */
    videoState: "on" | "off" | "on-flipped",
    videoTransparency: number;
    /** The language of the TTS extension. Defaults to the editor's language. */
    textToSpeechLanguage?: string;
}

export type ProjectSB3Target = ProjectSB3Sprite | ProjectSB3Stage;

interface ProjectSB3MonitorBase {
    /** The ID of this monitor. */
    id: string;
    mode: string;
    /** The opcode of the block the monitor belongs to. */
    opcode: string;
    /** An object associating names of inputs of the block the monitor belongs to with their values. */
    params: Record<string, ProjectSB3Value>;
    /** The name of the target the monitor belongs to, if any. */
    spriteName?: string;
    width: number;
    height: number;
    x: number;
    y: number;
    visible: boolean;
}

export interface ProjectSB3MonitorVariable extends ProjectSB3MonitorBase {
    mode: "default" | "large" | "slider";
    /** The value appearing on the monitor. */
    value: number | string;

    sliderMin: number;
    sliderMax: number;
    /** True if the monitor's slider allows only integer values. */
    isDiscrete: boolean;
}

export interface ProjectSB3MonitorList extends ProjectSB3MonitorBase {
    mode: "list";
    /** The values appearing on the monitor. */
    value: (number | string)[];
}

export type ProjectSB3Monitor = ProjectSB3MonitorVariable | ProjectSB3MonitorList;

export interface ProjectSB3 {
    targets: ProjectSB3Target[],
    monitors: ProjectSB3Monitor[],

    meta: {
        /** Semantic Version */
        semver: "3.0.0",
        /** VM Version, like 0.2.0 */
        vm: string,
        /** The user agent of the client which created this SB3. */
        agent: string
    },

    /** An array of the identifiers of the extensions used. */
    extensions: (string | ProjectSB3Extension)[],
}

export type SB3BlockTypes = {
    [K in keyof SB3BlockTypeDefinition]: SB3BlockTypeDefinition[K] & {
        inputs: {},
        fields: {},
    } & ("mutation" extends keyof SB3BlockTypeDefinition[K] ? { mutation: SB3BlockTypeDefinition[K]["mutation"] } : { mutation: undefined });
};

type SB3BlockTypeDefinition = {

    "motion_gotoxy": {
        inputs: {
            "X": ProjectSB3Input,
            "Y": ProjectSB3Input,
        }
    },
    "motion_setx": {
        inputs: {
            "X": ProjectSB3Input,
        }
    },
    "motion_changexby": {
        inputs: {
            "DX": ProjectSB3Input,
        }
    },
    "motion_sety": {
        inputs: {
            "Y": ProjectSB3Input,
        }
    },
    "motion_changeyby": {
        inputs: {
            "DY": ProjectSB3Input,
        }
    },
    "motion_xposition": {},
    "motion_yposition": {},

    "looks_say": {
        inputs: {
            "MESSAGE": ProjectSB3Input,
        }
    },
    "looks_costume": {
        fields: {
            "COSTUME": ProjectSB3Field<null>
        }
    },
    "looks_switchcostumeto": {
        inputs: {
            "COSTUME": ProjectSB3Input,
        }
    },
    "looks_costumenumbername": {
        fields: {
            "NUMBER_NAME": ProjectSB3Field<null, "name" | "number">
        }
    }

    "event_whenflagclicked": {},
    "event_broadcast": {
        inputs: {
            "BROADCAST_INPUT": ProjectSB3Input
        }
    },
    "event_broadcastandwait": {
        inputs: {
            "BROADCAST_INPUT": ProjectSB3Input
        }
    },
    "event_whenbroadcastreceived": {
        fields: {
            "BROADCAST_OPTION": ProjectSB3Field<string>
        }
    },
    "event_whenkeypressed": {
        fields: {
            "KEY_OPTION": ProjectSB3Field<null>
        }
    },

    "control_if": {
        inputs: {
            "CONDITION": ProjectSB3Input,
            "SUBSTACK": ProjectSB3Input,
        },
    },
    "control_if_else": {
        inputs: {
            "CONDITION": ProjectSB3Input,
            "SUBSTACK": ProjectSB3Input,
            "SUBSTACK2": ProjectSB3Input,
        },
    },
    "control_repeat": {
        inputs: {
            "TIMES": ProjectSB3Input,
            "SUBSTACK": ProjectSB3Input,
        },
    },
    "control_repeat_until": {
        inputs: {
            "CONDITION": ProjectSB3Input,
            "SUBSTACK": ProjectSB3Input,
        }
    },
    "control_while": {
        inputs: {
            "CONDITION": ProjectSB3Input,
            "SUBSTACK": ProjectSB3Input,
        }
    },
    "control_forever": {
        inputs: {
            "SUBSTACK": ProjectSB3Input,
        },
    },
    "control_for_each": {
        fields: {
            "VARIABLE": ProjectSB3Field<string>
        },
        inputs: {
            "VALUE": ProjectSB3Input,
            "SUBSTACK": ProjectSB3Input,
        }
    },
    "control_stop": {
        fields: {
            "STOP_OPTION": ProjectSB3Field<null, SB3BlockControlStopOption>
        }
    },
    "control_wait": {
        inputs: {
            "DURATION": ProjectSB3Input
        }
    }

    "operator_add": {
        inputs: {
            "NUM1": ProjectSB3Input,
            "NUM2": ProjectSB3Input,
        },
    },
    "operator_subtract": {
        inputs: {
            "NUM1": ProjectSB3Input,
            "NUM2": ProjectSB3Input,
        },
    },
    "operator_multiply": {
        inputs: {
            "NUM1": ProjectSB3Input,
            "NUM2": ProjectSB3Input,
        },
    },
    "operator_divide": {
        inputs: {
            "NUM1": ProjectSB3Input,
            "NUM2": ProjectSB3Input,
        },
    }
    "operator_lt": {
        inputs: {
            "OPERAND1": ProjectSB3Input,
            "OPERAND2": ProjectSB3Input,
        }
    },
    "operator_gt": {
        inputs: {
            "OPERAND1": ProjectSB3Input,
            "OPERAND2": ProjectSB3Input,
        }
    },
    "operator_equals": {
        inputs: {
            "OPERAND1": ProjectSB3Input,
            "OPERAND2": ProjectSB3Input,
        }
    },
    "operator_mod": {
        inputs: {
            "NUM1": ProjectSB3Input,
            "NUM2": ProjectSB3Input,
        }
    },
    "operator_or": {
        inputs: {
            "OPERAND1": ProjectSB3Input,
            "OPERAND2": ProjectSB3Input,
        }
    },
    "operator_round": {
        inputs: {
            "NUM": ProjectSB3Input,
        }
    },
    "operator_and": {
        inputs: {
            "OPERAND1": ProjectSB3Input,
            "OPERAND2": ProjectSB3Input,
        }
    },
    "operator_not": {
        inputs: {
            "OPERAND": ProjectSB3Input,
        }
    },
    "operator_join": {
        inputs: {
            "STRING1": ProjectSB3Input,
            "STRING2": ProjectSB3Input,
        }
    },
    "operator_length": {
        inputs: {
            "STRING": ProjectSB3Input,
        }
    },
    "operator_letter_of": {
        inputs: {
            "LETTER": ProjectSB3Input,
            "STRING": ProjectSB3Input,
        }
    },
    "operator_contains": {
        inputs: {
            "STRING1": ProjectSB3Input,
            "STRING2": ProjectSB3Input,
        }
    },
    "operator_mathop": {
        inputs: {
            "NUM": ProjectSB3Input,
        },
        fields: {
            "OPERATOR": ProjectSB3Field<null, SB3BlockOperatorMathOp>
        }
    },
    "operator_random": {
        inputs: {
            "FROM": ProjectSB3Input,
            "TO": ProjectSB3Input,
        }
    },

    "sensing_dayssince2000": {},
    "sensing_keypressed": {
        inputs: {
            "KEY_OPTION": ProjectSB3Input
        }
    },
    "sensing_keyoptions": {
        fields: {
            "KEY_OPTION": ProjectSB3Field<null>
        }
    },
    "sensing_mousex": {},
    "sensing_mousey": {},
    "sensing_mousedown": {},
    "sensing_timer": {},
    "sensing_resettimer": {}

    "data_variable": {
        fields: {
            "VARIABLE": ProjectSB3Field<string>
        },
    },
    "data_setvariableto": {
        inputs: {
            "VALUE": ProjectSB3Input
        },
        fields: {
            "VARIABLE": ProjectSB3Field<string>
        },
    },
    "data_changevariableby": {
        inputs: {
            "VALUE": ProjectSB3Input
        },
        fields: {
            "VARIABLE": ProjectSB3Field<string>
        },
    },
    "data_itemoflist": {
        inputs: {
            "INDEX": ProjectSB3Input
        },
        fields: {
            "LIST": ProjectSB3Field<string>
        },
    },
    "data_lengthoflist": {
        fields: {
            "LIST": ProjectSB3Field<string>
        }
    },
    "data_addtolist": {
        inputs: {
            "ITEM": ProjectSB3Input
        },
        fields: {
            "LIST": ProjectSB3Field<string>
        }
    },
    "data_deletealloflist": {
        fields: {
            "LIST": ProjectSB3Field<string>
        }
    },
    "data_replaceitemoflist": {
        inputs: {
            "ITEM": ProjectSB3Input,
            "INDEX": ProjectSB3Input,
        },
        fields: {
            "LIST": ProjectSB3Field<string>
        }
    },
    "data_insertatlist": {
        inputs: {
            "ITEM": ProjectSB3Input,
            "INDEX": ProjectSB3Input,
        },
        fields: {
            "LIST": ProjectSB3Field<string>
        }
    },
    "data_deleteoflist": {
        inputs: {
            "INDEX": ProjectSB3Input,
        },
        fields: {
            "LIST": ProjectSB3Field<string>
        }
    },
    "data_itemnumoflist": {
        inputs: {
            "ITEM": ProjectSB3Input,
        },
        fields: {
            "LIST": ProjectSB3Field<string>
        }
    },
    "data_listcontainsitem": {
        inputs: {
            "ITEM": ProjectSB3Input,
        },
        fields: {
            "LIST": ProjectSB3Field<string>
        }
    },

    "procedures_definition": {
        inputs: {
            /** custom_block points to a block of type procedures_prototype */
            "custom_block": ProjectSB3Input
        }
    },
    "procedures_prototype": {
        inputs: Record<string, ProjectSB3Input>,
        mutation: ProjectSB3MutationProcedurePrototype
    },
    "procedures_call": {
        inputs: Record<string, ProjectSB3Input>,
        mutation: ProjectSB3MutationProcedure
    },
    "argument_reporter_string_number": {
        fields: {
            /** The name of this reporter */
            "VALUE": ProjectSB3Field
        }
    },
    "argument_reporter_boolean": {
        fields: {
            /** The name of this reporter */
            "VALUE": ProjectSB3Field
        }
    },

    "pen_clear": {},
    "pen_penDown": {},
    "pen_penUp": {},
    "pen_setPenColorToColor": {
        inputs: {
            "COLOR": ProjectSB3Input
        }
    },
    "pen_setPenSizeTo": {
        inputs: {
            "SIZE": ProjectSB3Input
        }
    },
    "pen_changePenColorParamBy": {
        inputs: {
            "VALUE": ProjectSB3Input,
            "COLOR_PARAM": ProjectSB3Input,
        }
    },
    "pen_changePenSizeBy": {
        inputs: {
            "SIZE": ProjectSB3Input,
        }
    },
    "pen_setPenColorParamTo": {
        inputs: {
            "VALUE": ProjectSB3Input,
            "COLOR_PARAM": ProjectSB3Input,
        }
    },
    "pen_menu_colorParam": {
        fields: {
            "colorParam": ProjectSB3Field<null>
        }
    }
};

export enum SB3BlockOperatorMathOp {
    ABS = "abs",
    FLOOR = "floor",
    CEILING = "ceiling",
    SQRT = "sqrt",
    SIN = "sin",
    COS = "cos",
    TAN = "tan",
    ASIN = "asin",
    ACOS = "acos",
    ATAN = "atan",
    LN = "ln",
    LOG = "log",
    POW_E = "e ^",
    POW_10 = "10 ^"
}

export enum SB3BlockControlStopOption {
    ALL = "all",
    OTHER_IN_SPRITE = "other scripts in sprite",
    OTHER_IN_STAGE = "other scripts in stage",
    THIS_SCRIPT = "this script"
}