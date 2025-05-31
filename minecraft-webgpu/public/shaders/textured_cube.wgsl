struct Transform {
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

@group(0) @binding(0) var<storage, read> transforms: array<Transform>;
@group(0) @binding(1) var cubeSampler: sampler;
@group(0) @binding(2) var cubeTexture: texture_2d<f32>;

@vertex fn vs(
    @builtin(instance_index) instanceIndex: u32,
    vert: Vertex) -> VSOut {
    let transform = transforms[instanceIndex];
    var vsOut: VSOut;
    vsOut.position = transform.matrix * vert.position;
    vsOut.texcoord = vert.texcoord;
    return vsOut;
}

@fragment fn fs(fsIn: VSOut) -> @location(0) vec4f {
    return textureSample(cubeTexture, cubeSampler, fsIn.texcoord);
}