struct Uniforms {
    matrix: mat4x4f
}

struct Vertex {
    @location(0) position: vec4f
}

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(vert: Vertex) -> @builtin(position) vec4f {
    return uni.matrix * vert.position;
}

@fragment fn fs(@builtin(position) position: vec4f) -> @location(0) vec4f {
    return vec4f(1, 0, 0, 1);
}