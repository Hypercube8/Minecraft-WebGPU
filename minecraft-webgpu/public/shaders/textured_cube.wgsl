struct Uniforms {
    matrix: mat4x4f
}

struct Vertex {
    @location(0) position: vec4f,
    @location(1) texcoord: vec2f
}

struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) texcoord: vec2f
}

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var cubeSampler: sampler;
@group(0) @binding(2) var cubeTexture: texture_2d<f32>;

@vertex fn vs(vert: Vertex) -> VSOut {
    var vsOut: VSOut;
    vsOut.position = uni.matrix * vert.position;
    vsOut.texcoord = vert.texcoord;
    return vsOut;
}

@fragment fn fs(fsIn: VSOut) -> @location(0) vec4f {
    return textureSample(cubeTexture, cubeSampler, fsIn.texcoord);
}