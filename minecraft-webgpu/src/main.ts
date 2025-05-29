import texturedCubeShader from "/shaders/textured_cube.wgsl?raw";
import { mat4 } from "wgpu-matrix";
import { read } from "ktx-parse";
 
interface ModelData {
  vertexData: Float32Array;
  indexData: Uint16Array;
  numVertices: number;
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

    // Back quad 
     -0.5,  0.5, -0.5,   1.0, 1.0,
      0.5,  0.5, -0.5,   0.0, 1.0,
      0.5, -0.5, -0.5,   0.0, 0.0,
     -0.5, -0.5, -0.5,   1.0, 0.0,

    // Top quad
      0.5,  0.5, -0.5,   1.0, 1.0,   
     -0.5,  0.5, -0.5,   0.0, 1.0,   
     -0.5,  0.5,  0.5,   0.0, 0.0,
      0.5,  0.5,  0.5,   1.0, 0.0,

    // Bottom quad
     -0.5, -0.5, -0.5,   1.0, 1.0,
      0.5, -0.5, -0.5,   0.0, 1.0,   
      0.5, -0.5,  0.5,   0.0, 0.0, 
     -0.5, -0.5,  0.5,   1.0, 0.0,

    // Left quad
     -0.5,  0.5,  0.5,   1.0, 1.0,  
     -0.5,  0.5, -0.5,   0.0, 1.0,  
     -0.5, -0.5, -0.5,   0.0, 0.0,
     -0.5, -0.5,  0.5,   1.0, 0.0,   

     // Right quad
      0.5,  0.5, -0.5,   1.0, 1.0,
      0.5,  0.5,  0.5,   0.0, 1.0, 
      0.5, -0.5,  0.5,   0.0, 0.0, 
      0.5, -0.5, -0.5,   1.0, 0.0
  ]); 
    
  const indexData = new Uint16Array([
    // Front quad
      0,  1,  2, // top tri
      2,  3,  0, // bottom tri

    // Back quad
      4,  5,  6, // top tri
      6,  7,  4, // bottom tri

    // Top quad
      8,  9, 10, // top tri
     10, 11,  8, // bottom tri

    // Bottom quad
     12, 13, 14, // top tri
     14, 15, 12, // bottom tri

    // Left quad
     16, 17, 18, // top tri
     18, 19, 16, // bottom tri

    // Right quad
     20, 21, 22, // top
     22, 23, 20  // bottom tri
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

  alert(ktxTexture.pixelWidth);
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

  // device!.queue.writeTexture(
  //     { texture, },
  //     ktxTexture.levels[0].levelData,
  //     { bytesPerRow: ktxTexture.pixelWidth * 4 },
  //     { width: ktxTexture.pixelWidth, height: ktxTexture.pixelHeight }
  //   );

  const sampler = device!.createSampler({
    label: "Cube Sampler",
    minFilter: "nearest",
    magFilter: "nearest",
    mipmapFilter: "nearest"
  });

  const uniformBufferSize = (16) * 4;
  const uniformBuffer = device!.createBuffer({
    label: "Cube Unifoms",
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  const uniformValues = new Float32Array(uniformBufferSize / 4);

  const matrixOffset = 0;
  const matrixValue = uniformValues.subarray(matrixOffset, matrixOffset + 16);

  const cubeData = createCubeData();

  const vertexBuffer = device!.createBuffer({
    label: "Cube Vertex Buffer",
    size: cubeData.vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(vertexBuffer, 0, cubeData.vertexData);

  const indexBuffer = device!.createBuffer({
    label: "Cube Index Buffer",
    size: cubeData.indexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(indexBuffer, 0, cubeData.indexData);

  const bindGroup = device!.createBindGroup({
    label: "Cube Bind Group",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer }},
      { binding: 1, resource: sampler },
      { binding: 2, resource: texture.createView() }
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

  let depthTexture: GPUTexture | undefined;
  let multisampleTexture: GPUTexture | undefined;

  function render() {
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
    mat4.perspective(
      60 * Math.PI / 180,
      aspect,
      0.1,
      2000,
      matrixValue
    );
    const view = mat4.lookAt(
      [2, 0, 1],
      [0, 0, 0],
      [0, 1, 0]
    );
    mat4.multiply(matrixValue, view, matrixValue);

    device!.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    const encoder: GPUCommandEncoder = device!.createCommandEncoder({ label: "our encoder" });
    const pass: GPURenderPassEncoder = encoder.beginRenderPass(renderPassDescriptor);

    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint16");
    pass.setBindGroup(0, bindGroup);
    pass.drawIndexed(cubeData.numVertices);
    pass.end();

    const commandBuffer: GPUCommandBuffer = encoder.finish();
    device!.queue.submit([commandBuffer]);
  }

  const observer: ResizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas: HTMLCanvasElement = entry.target as HTMLCanvasElement;
      const width: number = entry.contentBoxSize[0].inlineSize;
      const height: number = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    }
    render();
  });
  observer.observe(canvas as Element);
}

main();  