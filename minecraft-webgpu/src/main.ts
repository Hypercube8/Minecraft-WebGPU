import texturedCubeShader from "/shaders/textured_cube.wgsl?raw";
import { mat4, Mat4, Vec2, Vec3, vec3 } from "wgpu-matrix";
import { read } from "ktx-parse";
 
interface ModelData {
  vertexData: Float32Array;
  indexData: Uint16Array;
  numVertices: number;
}

const deg2rad = (deg: number) => deg * Math.PI / 180;

interface Chunk {
  vertexData: Float32Array,
  indexData: Uint32Array,
  numVertices: number;
}

function generateFrontFace(x: number, y: number, z: number): number[] {
  return [
    //     Positions            UVs 
    x+0.5,  y+0.5,  z+0.5,   1.0, 1.0,        
    x-0.5,  y+0.5,  z+0.5,   0.0, 1.0,
    x-0.5,  y-0.5,  z+0.5,   0.0, 0.0,   
    x+0.5,  y-0.5,  z+0.5,   1.0, 0.0, 
  ]
}

function generateBackFace(x: number, y: number, z: number): number[] {
  return [
    //     Positions          UVs 
    x-0.5, y+0.5, z-0.5,   1.0, 1.0,
    x+0.5, y+0.5, z-0.5,   0.0, 1.0,
    x+0.5, y-0.5, z-0.5,   0.0, 0.0,
    x-0.5, y-0.5, z-0.5,   1.0, 0.0,
  ]
}

function generateTopFace(x: number, y: number, z: number): number[] {
  return [
    //     Positions          UVs 
    x+0.5, y+0.5, z-0.5,   1.0, 1.0,   
    x-0.5, y+0.5, z-0.5,   0.0, 1.0,   
    x-0.5, y+0.5, z+0.5,   0.0, 0.0,
    x+0.5, y+0.5, z+0.5,   1.0, 0.0,
  ]
}

function generateBottomFace(x: number, y: number, z: number): number[] {
  return [
    //     Positions          UVs 
    x-0.5, y-0.5, z-0.5,   1.0, 1.0,   
    x+0.5, y-0.5, z-0.5,   0.0, 1.0,   
    x+0.5, y-0.5, z+0.5,   0.0, 0.0,
    x-0.5, y-0.5, z+0.5,   1.0, 0.0,
  ]
}

function generateLeftFace(x: number, y: number, z: number): number[] {
  return [
    //     Positions          UVs 
    x-0.5, y+0.5, z+0.5,   1.0, 1.0,   
    x-0.5, y+0.5, z-0.5,   0.0, 1.0,   
    x-0.5, y-0.5, z-0.5,   0.0, 0.0,
    x-0.5, y-0.5, z+0.5,   1.0, 0.0,
  ]
}

function generateRightFace(x: number, y: number, z: number): number[] {
  return [
    //     Positions          UVs 
    x+0.5, y+0.5, z-0.5,   1.0, 1.0,   
    x+0.5, y+0.5, z+0.5,   0.0, 1.0,   
    x+0.5, y-0.5, z+0.5,   0.0, 0.0,
    x+0.5, y-0.5, z-0.5,   1.0, 0.0,
  ]
}

function generateFaceIndicies(faceID: number): number[] {
  const fid = faceID * 4;
  return [
    fid+0, fid+1, fid+2, // Top tri
    fid+2, fid+3, fid+0  // Bottom tri
  ]
}

function generateChunkMesh(data: Uint8Array): Chunk {
  const indexChunk = (x: number, y: number, z: number) => {
    if (x < 0 || x >= 32 || y < 0 || y >= 32 || z < 0 || z >= 32) return 0;
    return data[z * 1024 + y * 32 + x];
  }

  const vertexData: number[] = [];
  const indexData: number[] = []

  let faceNum = 0;

  for (let x = 0; x < 32; x++) {
    for (let y = 0; y < 32; y++) {
      for (let z = 0; z < 32; z++) {
        if (!indexChunk(x, y, z)) {
          continue;
        }

        const frontNeighbor = indexChunk(x, y, z+1);
        const backNeighbor = indexChunk(x, y, z-1);
        const upNeighbor = indexChunk(x, y+1, z);
        const downNeighbor = indexChunk(x, y-1, z);
        const leftNeighbor = indexChunk(x-1, y, z);
        const rightNeighbor = indexChunk(x+1, y, z);

        if (!frontNeighbor) { vertexData.push(...generateFrontFace(x, y, z)); indexData.push(...generateFaceIndicies(faceNum++)); }
        if (!backNeighbor) { vertexData.push(...generateBackFace(x, y, z)); indexData.push(...generateFaceIndicies(faceNum++)); }
        if (!upNeighbor) { vertexData.push(...generateTopFace(x, y, z)); indexData.push(...generateFaceIndicies(faceNum++)); }
        if (!downNeighbor) { vertexData.push(...generateBottomFace(x, y, z)); indexData.push(...generateFaceIndicies(faceNum++)); }
        if (!leftNeighbor) { vertexData.push(...generateLeftFace(x, y, z)); indexData.push(...generateFaceIndicies(faceNum++)); }
        if (!rightNeighbor) { vertexData.push(...generateRightFace(x, y, z)); indexData.push(...generateFaceIndicies(faceNum++)); }
      }
    }
  }

  return {
    vertexData: new Float32Array(vertexData),
    indexData: new Uint32Array(indexData),
    numVertices: indexData.length
  };
}

// Generate the data for a unit cube
function createCubeData(): ModelData {
  const vertexData = new Float32Array([
    //   Positions     |    UVs

    // Front quad             
      0.5,  0.5,  0.5,   1.0, 1.0,        
     -0.5,  0.5,  0.5,   0.0, 1.0,
     -0.5, -0.5,  0.5,   0.0, 0.0,   
      0.5, -0.5,  0.5,   1.0, 0.0,  

    // // Back quad 
    //  -0.5,  0.5, -0.5,   1.0, 1.0,
    //   0.5,  0.5, -0.5,   0.0, 1.0,
    //   0.5, -0.5, -0.5,   0.0, 0.0,
    //  -0.5, -0.5, -0.5,   1.0, 0.0,

    // // Top quad
    //   0.5,  0.5, -0.5,   1.0, 1.0,   
    //  -0.5,  0.5, -0.5,   0.0, 1.0,   
    //  -0.5,  0.5,  0.5,   0.0, 0.0,
    //   0.5,  0.5,  0.5,   1.0, 0.0,

    // // Bottom quad
    //  -0.5, -0.5, -0.5,   1.0, 1.0,
    //   0.5, -0.5, -0.5,   0.0, 1.0,   
    //   0.5, -0.5,  0.5,   0.0, 0.0, 
    //  -0.5, -0.5,  0.5,   1.0, 0.0,

    // // Left quad
    //  -0.5,  0.5,  0.5,   1.0, 1.0,  
    //  -0.5,  0.5, -0.5,   0.0, 1.0,  
    //  -0.5, -0.5, -0.5,   0.0, 0.0,
    //  -0.5, -0.5,  0.5,   1.0, 0.0,   

    //  // Right quad
    //   0.5,  0.5, -0.5,   1.0, 1.0,
    //   0.5,  0.5,  0.5,   0.0, 1.0, 
    //   0.5, -0.5,  0.5,   0.0, 0.0, 
    //   0.5, -0.5, -0.5,   1.0, 0.0
  ]); 
    
  const indexData = new Uint16Array([
    // Front quad
      0,  1,  2, // top tri
      2,  3,  0, // bottom tri

    // // Back quad
    //   4,  5,  6, // top tri
    //   6,  7,  4, // bottom tri

    // // Top quad
    //   8,  9, 10, // top tri
    //  10, 11,  8, // bottom tri

    // // Bottom quad
    //  12, 13, 14, // top tri
    //  14, 15, 12, // bottom tri

    // // Left quad
    //  16, 17, 18, // top tri
    //  18, 19, 16, // bottom tri

    // // Right quad
    //  20, 21, 22, // top
    //  22, 23, 20  // bottom tri
  ]);

  return {
    vertexData,
    indexData,
    numVertices: indexData.length
  }
}

async function main(): Promise<void> {
  const adapter: GPUAdapter | null = await navigator.gpu?.requestAdapter();
  const device: GPUDevice | undefined = await adapter?.requestDevice();

  if (!device) {
    throw new Error("WebGPU is not supported in this browser.");
  }

  const canvas: HTMLCanvasElement | null = document.querySelector('canvas');
  const context: GPUCanvasContext | null = canvas!.getContext('webgpu');

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context!.configure({
    device,
    format: presentationFormat
  });

  const module: GPUShaderModule = device.createShaderModule({
    label: 'Cube Shader',
    code: texturedCubeShader
  });

  const pipeline: GPURenderPipeline = device.createRenderPipeline({
    label: "Cube Pipeline",
    layout: "auto",
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (3 + 2) * 4,
          attributes: [
            {shaderLocation: 0, offset: 0, format: "float32x3"},
            {shaderLocation: 1, offset: 12, format: "float32x2"}
          ]
        }
      ]
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }]
    },
    primitive: {
      cullMode: "back"
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus"
    },
    multisample: {
      count: 4
    }
  });

  const res = await fetch("/assets/textures/dirt.ktx2");
  const arrayBuffer = await res.arrayBuffer();
  const ktxTexture = read(new Uint8Array(arrayBuffer));
 
  const texture = device!.createTexture({
    label: "Cube Texture",
    size: [ktxTexture.pixelWidth, ktxTexture.pixelHeight],
    mipLevelCount: ktxTexture.levels.length,
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | 
           GPUTextureUsage.COPY_DST |
           GPUTextureUsage.RENDER_ATTACHMENT
  });

  ktxTexture.levels.forEach((level, mipLevel) => {
    const width = ktxTexture.pixelWidth / Math.pow(2, mipLevel);
    const height = ktxTexture.pixelHeight / Math.pow(2, mipLevel);
    device!.queue.writeTexture(
      { texture, mipLevel },
      level.levelData,
      { bytesPerRow: width * 4 },
      { width, height }
    );
  })

  const sampler = device!.createSampler({
    label: "Cube Sampler",
    minFilter: "nearest",
    magFilter: "nearest",
    mipmapFilter: "linear"
  });

  const uniformBufferSize = 16 * 4;
  const uniformBuffer = device!.createBuffer({
    label: "Uniform Buffer for Cube",
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  const uniformValues = new Float32Array(uniformBufferSize / 4);

  const voxelData = new Uint8Array(32768);
  for (let i = 0; i < 32768; i++) {
    voxelData[i] = Math.round(Math.random());
  }
  
  const voxelMesh = generateChunkMesh(voxelData);

  const vertexBuffer = device!.createBuffer({
    label: "Cube Vertex Buffer",
    size: voxelMesh.vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(vertexBuffer, 0, voxelMesh.vertexData);

  const indexBuffer = device!.createBuffer({
    label: "Cube Index Buffer",
    size: voxelMesh.indexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(indexBuffer, 0, voxelMesh.indexData);

  const bindGroup = device!.createBindGroup({
    label: "Cube Bind Group",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: texture.createView() },
      { binding: 2, resource: { buffer: uniformBuffer }}
    ]
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    label: "our basic canvas renderPass",
    colorAttachments: [
      {
        view: context!.getCurrentTexture().createView(),
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: "clear",
        storeOp: "store"
      }
    ],
    depthStencilAttachment: {
      view: context!.getCurrentTexture().createView(),
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store"
    }
  };

  let deltaTime: number;

  const cameraInput: Vec2 = new Float32Array(2);

  window.addEventListener("click", async () => {
    await canvas!.requestPointerLock({
      unadjustedMovement: true
    })
  }); 

  const clamp = (x: number, min: number, max: number) => Math.min(Math.max(x, min), max);

  window.addEventListener("mousemove", (e) => {
    cameraInput[0] -= e.movementX * deltaTime;
    cameraInput[1] -= e.movementY * deltaTime;

    cameraInput[0] = cameraInput[0] % deg2rad(360);
    cameraInput[1] = clamp(cameraInput[1], deg2rad(-90), deg2rad(90));
  });

  const movement: Vec2 = new Float32Array(2);

  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "w":
        movement[1] = -1;
        e.preventDefault();
        e.stopPropagation();
        break;
      case "s":
        movement[1] = 1;
        e.preventDefault();
        e.stopPropagation();
        break;
      case "a":
        movement[0] = -1;
        e.preventDefault();
        e.stopPropagation();
        break;
      case "d":
        movement[0] = 1;
        e.preventDefault();
        e.stopPropagation();
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "w":
        movement[1] = 0;
        e.preventDefault();
        e.stopPropagation();
        break;
      case "s":
        movement[1] = 0;
        e.preventDefault();
        e.stopPropagation();
        break;
      case "a":
        movement[0] = 0;
        e.preventDefault();
        e.stopPropagation();
        break;
      case "d":
        movement[0] = 0;
        e.preventDefault();
        e.stopPropagation();
        break;
    }
  });

  let depthTexture: GPUTexture | undefined;
  let multisampleTexture: GPUTexture | undefined;

  let lastTime = 0;

  let position = [16, 0, 16];

  function render(elapsed: number) {
    deltaTime = (elapsed - lastTime) / 1000;
    lastTime = elapsed;
    
    const canvasTexture: GPUTexture = context!.getCurrentTexture();
    (renderPassDescriptor.colorAttachments as any)[0].view = canvasTexture.createView();

    function verifyRenderAttachment(renderAttachment: GPUTexture | undefined, newTextureCallback: () => void) {
      if (!renderAttachment ||
        renderAttachment.width !== canvasTexture.width ||
        renderAttachment.height !== canvasTexture.height) {
        if (renderAttachment) {
          renderAttachment.destroy();
        }
        newTextureCallback();
      }
    }

    verifyRenderAttachment(depthTexture, () => {
      depthTexture = device!.createTexture({
        label: "Depth Texture",
        size: [canvasTexture.width, canvasTexture.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        sampleCount: 4
      });
    });
    renderPassDescriptor.depthStencilAttachment!.view = depthTexture!.createView();

    verifyRenderAttachment(multisampleTexture, () => {
      multisampleTexture = device!.createTexture({
        label: "Multisample Texture",
        size: [canvasTexture.width, canvasTexture.height],
        format: canvasTexture.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        sampleCount: 4
      });
    });
    (renderPassDescriptor as any).colorAttachments[0].view = multisampleTexture!.createView();
    (renderPassDescriptor as any).colorAttachments[0].resolveTarget = canvasTexture.createView();

    const aspect = canvas!.clientWidth / canvas!.clientHeight;

    const projection = mat4.perspective(
      60 * Math.PI / 180,
      aspect,
      0.1,
      2000
    );

    const rotation = mat4.rotateX(mat4.rotationY(cameraInput[0]), cameraInput[1]);
    vec3.addScaled(position, rotation.slice(0, 4), movement[0] * deltaTime * 3, position);
    vec3.addScaled(position, rotation.slice(8, 12), movement[1] * deltaTime * 3, position);
    const view = mat4.translation(position);
    mat4.multiply(view, rotation, view);
    mat4.invert(view, view);

    mat4.multiply(projection, view, uniformValues);
    device!.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    const encoder: GPUCommandEncoder = device!.createCommandEncoder({ label: "our encoder" });
    const pass: GPURenderPassEncoder = encoder.beginRenderPass(renderPassDescriptor);

    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint32");
    pass.setBindGroup(0, bindGroup);
    pass.drawIndexed(voxelMesh.numVertices);
    pass.end();

    const commandBuffer: GPUCommandBuffer = encoder.finish();
    device!.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }

  const observer: ResizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas: HTMLCanvasElement = entry.target as HTMLCanvasElement;
      const width: number = entry.contentBoxSize[0].inlineSize;
      const height: number = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    }
    render(0);
  });
  observer.observe(canvas as Element);
}

main();  