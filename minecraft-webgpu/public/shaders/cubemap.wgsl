struct Uniforms {
    matrix: mat4x4f
}

struct Vertex {
    @location(0) position: vec4f
}

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f
}

@vertex fn vs(vert: Vertex) -> VSOutput {
    var vsOut: VSOutput;
    vsOut.position = uni.matrix * vert.position;
    vsOut.normal = normalize(vert.position.xyz);
    return vsOut;
}

@group(0) @binding(0) var<uniform> uni: Uniforms; 
@group(0) @binding(1) var ourSampler: sampler;
@group(0) @binding(2) var ourTexture: texture_cube<f32>;

@fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
    return textureSample(ourTexture, ourSampler, normalize(fsInput.normal));
}