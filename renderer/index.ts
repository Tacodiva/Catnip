
import { ICatnipRenderer, PEN_ATTRIBUTE_STRIDE_BYTES, PEN_LINE_BUFFER_SIZE } from "../src/runtime/ICatnipRenderer";
import penFrag from "./shaders/pen.frag";
import penVert from "./shaders/pen.vert";

export class CatnipRenderer implements ICatnipRenderer {
    public readonly canvasElement: HTMLCanvasElement;
    public readonly gl: WebGL2RenderingContext;

    public readonly penShader: WebGLProgram;
    public readonly u_stageSize_loc: WebGLUniformLocation;
    public readonly a_position_loc: number; // TODO Rename
    public readonly a_lineColor_loc: number;
    public readonly a_lineThicknessAndLength_loc: number;
    public readonly a_penPoints_loc: number;

    public readonly a_position_glbuffer: WebGLBuffer;
    public readonly attribute_glbuffer: WebGLBuffer;


    public constructor() {
        this.canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
        const gl = this.gl = this.canvasElement.getContext("webgl2")!;

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        this.penShader = this.createProgram(penVert, penFrag);

        this.u_stageSize_loc = gl.getUniformLocation(this.penShader, "u_stageSize")!;
        this.a_position_loc = gl.getAttribLocation(this.penShader, "a_position");
        this.a_lineColor_loc = gl.getAttribLocation(this.penShader, 'a_lineColor');
        this.a_lineThicknessAndLength_loc = gl.getAttribLocation(this.penShader, 'a_lineThicknessAndLength');
        this.a_penPoints_loc = gl.getAttribLocation(this.penShader, 'a_penPoints');

        this.a_position_glbuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.a_position_glbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            1, 0,
            0, 0,
            1, 1,
            0, 1
        ]), gl.STATIC_DRAW);

        this.attribute_glbuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.attribute_glbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, PEN_LINE_BUFFER_SIZE * PEN_ATTRIBUTE_STRIDE_BYTES, gl.STREAM_DRAW);

        this.penEraseAll();
    }

    private createShader(type: GLenum, source: string): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
            return shader;
        }

        const shaderError = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Error compiling shader.\n${shaderError}`)
    }

    private createProgram(vertexShader: WebGLShader | string, fragmentShader: WebGLShader | string): WebGLProgram {
        const gl = this.gl;

        if (typeof (vertexShader) === "string") {
            vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShader);
        }

        if (typeof (fragmentShader) === "string") {
            fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShader);
        }

        const program = gl.createProgram()!;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        var success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
            return program;
        }

        const programError = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`Error compiling shader program.\n${programError}`)
    }

    public penEraseAll(): void {
        const gl = this.gl;

        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }


    public penDrawLines(data: Float32Array, length: number): void {
        const gl = this.gl;

        console.log("Drawing " + length + " lines!");

        gl.useProgram(this.penShader);

        gl.uniform2fv(this.u_stageSize_loc, [this.canvasElement.width, this.canvasElement.height]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.a_position_glbuffer);
        gl.enableVertexAttribArray(this.a_position_loc);
        gl.vertexAttribPointer(this.a_position_loc, 2, gl.FLOAT, false, 2 * 4, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.attribute_glbuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);

        gl.enableVertexAttribArray(this.a_lineColor_loc);
        gl.vertexAttribPointer(
            this.a_lineColor_loc,
            4, gl.FLOAT, false,
            PEN_ATTRIBUTE_STRIDE_BYTES, 0
        );

        gl.enableVertexAttribArray(this.a_lineThicknessAndLength_loc);
        gl.vertexAttribPointer(
            this.a_lineThicknessAndLength_loc,
            2, gl.FLOAT, false,
            PEN_ATTRIBUTE_STRIDE_BYTES, 4 * 4
        );

        gl.enableVertexAttribArray(this.a_penPoints_loc);
        gl.vertexAttribPointer(
            this.a_penPoints_loc,
            4, gl.FLOAT, false,
            PEN_ATTRIBUTE_STRIDE_BYTES, 6 * 4
        );

        gl.vertexAttribDivisor(this.a_lineColor_loc, 1);
        gl.vertexAttribDivisor(this.a_lineThicknessAndLength_loc, 1);
        gl.vertexAttribDivisor(this.a_penPoints_loc, 1);

        gl.drawArraysInstanced(
            gl.TRIANGLE_STRIP,
            0, 4,
            length
        );

        gl.vertexAttribDivisor(this.a_lineColor_loc, 0);
        gl.vertexAttribDivisor(this.a_lineThicknessAndLength_loc, 0);
        gl.vertexAttribDivisor(this.a_penPoints_loc, 0);
    }


}
