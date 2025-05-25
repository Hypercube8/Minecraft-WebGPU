import texturedCubeShader from "/shaders/cube.wgsl?raw";
import { mat4 } from "wgpu-matrix";
 
interface ModelData {
  vertexData: Float32Array;
  indexData: Uint16Array;
  numVertices: number;
}

// Generate the data for a unit cube
function createCubeData(): ModelData {
  const vertexData = new Float32Array([
    // Front quad             
      0.5,  0.5,  0.5,  
     -0.5,  0.5,  0.5,
     -0.5, -0.5,  0.5,
      0.5, -0.5,  0.5,

    // Back quad 
      0.5,  0.5, -0.5,
     -0.5,  0.5, -0.5,
     -0.5, -0.5, -0.5,
      0.5, -0.5, -0.5,
  ]); 
    
  const indexData = new Uint16Array([
    // Front quad
    0, 1, 2, // top tri
    3, 0, 2, // bottom tri

    // Back quad
    5, 4, 7, // top tri
    6, 5, 7, // bottom tri

    // Top quad
    4, 5, 1, // top tri
    0, 4, 1, // bottom tri

    // Bottom quad
    3, 2, 6, // top tri
    7, 3, 6, // bottom tri

    // Left quad
    1, 5, 6, // top tri
    2, 1, 6, // bottom tri

    // Right quad
    4, 0, 3, // top
    7, 4, 3 // bottom tri
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
          arrayStride: (3) * 4,
          attributes: [
            {shaderLocation: 0, offset: 0, format: "float32x3"},
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
      { binding: 0, resource: { buffer: uniformBuffer }}
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
      10,
      matrixValue
    );
    const view = mat4.lookAt(
      [0, 3, 4],
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
    pass.setBindGroup(0, bindGroup)
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