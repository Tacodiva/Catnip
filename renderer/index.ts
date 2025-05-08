
import { ICatnipRenderer, PEN_ATTRIBUTE_STRIDE_BYTES, PEN_LINE_BUFFER_SIZE } from "../src/runtime/ICatnipRenderer";
import penFrag from "./shaders/pen.frag";
import penVert from "./shaders/pen.vert";
import blitFrag from "./shaders/blit.frag";
import blitVert from "./shaders/blit.vert";


export class CatnipRenderer implements ICatnipRenderer {
    public readonly canvasElement: HTMLCanvasElement;
    public readonly gl: WebGL2RenderingContext;

    public readonly quadTexCoordBuffer: WebGLBuffer;

    public readonly blitShader: WebGLProgram;
    public readonly blitATexCoordLoc: number;

    public readonly penShader: WebGLProgram;
    public readonly penUStageSizeLoc: WebGLUniformLocation;
    public readonly penAPositionLoc: number; // TODO Rename
    public readonly penALineColorLoc: number;
    public readonly penALineThicknessAndLengthLoc: number;
    public readonly penAPenPointsLoc: number;

    public readonly penAttributeBuffer: WebGLBuffer;
    public readonly penFramebuffer: WebGLFramebuffer;
    public readonly penTexture: WebGLTexture;





    public constructor() {
        this.canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
        const gl = this.gl = this.canvasElement.getContext("webgl2")!;

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        this.quadTexCoordBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadTexCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            1, 0,
            0, 0,
            1, 1,
            0, 1
        ]), gl.STATIC_DRAW);

        this.blitShader = this.createProgram(blitVert, blitFrag);
        this.blitATexCoordLoc = gl.getAttribLocation(this.blitShader, "a_texCoord");

        this.penShader = this.createProgram(penVert, penFrag);

        this.penUStageSizeLoc = gl.getUniformLocation(this.penShader, "u_stageSize")!;
        this.penAPositionLoc = gl.getAttribLocation(this.penShader, "a_position");
        this.penALineColorLoc = gl.getAttribLocation(this.penShader, 'a_lineColor');
        this.penALineThicknessAndLengthLoc = gl.getAttribLocation(this.penShader, 'a_lineThicknessAndLength');
        this.penAPenPointsLoc = gl.getAttribLocation(this.penShader, 'a_penPoints');

        this.penAttributeBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.penAttributeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, PEN_LINE_BUFFER_SIZE * PEN_ATTRIBUTE_STRIDE_BYTES, gl.STREAM_DRAW);

        this.penTexture = gl.createTexture()!;

        gl.bindTexture(gl.TEXTURE_2D, this.penTexture);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            480,
            360,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.penFramebuffer = gl.createFramebuffer()!;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.penFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.penTexture, 0);

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

    public drawFrame() {
        const gl = this.gl;

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

        gl.useProgram(this.blitShader);

        gl.viewport(0, 0, this.canvasElement.width, this.canvasElement.height);
        gl.bindTexture(gl.TEXTURE_2D, this.penTexture);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadTexCoordBuffer);
        gl.enableVertexAttribArray(this.blitATexCoordLoc);
        gl.vertexAttribPointer(this.blitATexCoordLoc, 2, gl.FLOAT, false, 2 * 4, 0);


        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    public _penSetFramebuffer(): void {
        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.penFramebuffer);
        gl.viewport(0, 0, 480, 360);
    }

    public penEraseAll(): void {
        const gl = this.gl;

        this._penSetFramebuffer();
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }


    public penDrawLines(data: Float32Array, length: number): void {
        const gl = this.gl;

        this._penSetFramebuffer();

        gl.useProgram(this.penShader);

        gl.uniform2fv(this.penUStageSizeLoc, [480, 360]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadTexCoordBuffer);
        gl.enableVertexAttribArray(this.penAPositionLoc);
        gl.vertexAttribPointer(this.penAPositionLoc, 2, gl.FLOAT, false, 2 * 4, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.penAttributeBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);

        gl.enableVertexAttribArray(this.penALineColorLoc);
        gl.vertexAttribPointer(
            this.penALineColorLoc,
            4, gl.FLOAT, false,
            PEN_ATTRIBUTE_STRIDE_BYTES, 0
        );

        gl.enableVertexAttribArray(this.penALineThicknessAndLengthLoc);
        gl.vertexAttribPointer(
            this.penALineThicknessAndLengthLoc,
            2, gl.FLOAT, false,
            PEN_ATTRIBUTE_STRIDE_BYTES, 4 * 4
        );

        gl.enableVertexAttribArray(this.penAPenPointsLoc);
        gl.vertexAttribPointer(
            this.penAPenPointsLoc,
            4, gl.FLOAT, false,
            PEN_ATTRIBUTE_STRIDE_BYTES, 6 * 4
        );

        gl.vertexAttribDivisor(this.penALineColorLoc, 1);
        gl.vertexAttribDivisor(this.penALineThicknessAndLengthLoc, 1);
        gl.vertexAttribDivisor(this.penAPenPointsLoc, 1);

        gl.drawArraysInstanced(
            gl.TRIANGLE_STRIP,
            0, 4,
            length
        );

        gl.vertexAttribDivisor(this.penALineColorLoc, 0);
        gl.vertexAttribDivisor(this.penALineThicknessAndLengthLoc, 0);
        gl.vertexAttribDivisor(this.penAPenPointsLoc, 0);
    }


}
