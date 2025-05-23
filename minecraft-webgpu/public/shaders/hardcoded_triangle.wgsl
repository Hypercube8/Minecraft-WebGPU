struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) baryCoord: vec3f
}

@vertex fn vs(
    @builtin(vertex_index) vertexIndex : u32
) -> VSOut {
    let pos = array(
        vec2f(0.0, 0.5),
        vec2f(-0.5, -0.5),
        vec2f(0.5, -0.5)
    );
    let bary = array(
        vec3f(1, 0, 0),
        vec3f(0, 1, 0),
        vec3f(0, 0, 1)
    );

    var vsOut: VSOut;
    vsOut.position = vec4f(pos[vertexIndex], 0.0, 1.0);
    vsOut.baryCoord = bary[vertexIndex];
    return vsOut;
}

@fragment fn fs(fsInput: VSOut) -> @location(0) vec4f {
    let allAbove0 = all(fsInput.baryCoord >= vec3f(0));
    let allBelow1 = all(fsInput.baryCoord <= vec3f(1));
    let inside = allAbove0 && allBelow1;
    let red = vec4f(1, 0, 0, 1);
    let yellow = vec4f(1, 1, 0, 1);
    return select(yellow, red, inside);
}