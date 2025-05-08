precision mediump float;

varying vec2 v_texCoord;

attribute vec2 a_texCoord;

void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_texCoord * vec2(2) - vec2(1), 0, 1);
}