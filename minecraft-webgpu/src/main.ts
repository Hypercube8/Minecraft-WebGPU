import { Mat4, mat4 } from "wgpu-matrix";
import { Texture } from "./texture";

import texturedCubeShader from "/shaders/cubemap.wgsl?raw";

interface FaceSettings {
  faceColor: string,
  textColor: string,
  text: string
}

function generateFace(size: number, settings: FaceSettings) {
  const canvas: HTMLCanvasElement = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
  ctx!.fillStyle = settings.faceColor;
  ctx!.fillRect(0, 0, size, size);
  ctx!.font = `${size * 0.7}px sans-serif`;
  ctx!.textAlign = "center";
  ctx!.textBaseline = "middle";
  ctx!.fillStyle = settings.textColor;
  ctx!.fillText(settings.text, size / 2, size / 2);
  return canvas;
}

interface ModelData {
  vertexData: Float32Array,
  indexData: Uint16Array,
  numVertices: number
}

function createCubeVertices(): ModelData {
  const vertexData: Float32Array = new Float32Array([
    -1,  1,  1,   
    -1, -1,  1,   
     1,  1,  1,  
     1, -1,  1,   

     1,  1, -1,   
     1,  1,  1,   
     1, -1, -1,  
     1, -1,  1,   

     1,  1, -1,   
     1, -1, -1,   
    -1,  1, -1,   
    -1, -1, -1,   

    -1,  1,  1,   
    -1,  1, -1,   
    -1, -1,  1,  
    -1, -1, -1,   
     
     1, -1,  1, 
    -1, -1,  1,   
     1, -1, -1,   
    -1, -1, -1,   

    -1,  1,  1,  
     1,  1,  1,  
    -1,  1, -1,  
     1,  1, -1,  
  ]);

  const indexData: Uint16Array = new Uint16Array([
    0,  1,  2,  2,  1,  3,
    4,  5,  6,  6,  5,  7,
    8,  9,  10, 10, 9,  11,
    12, 13, 14, 14, 13, 15,
    16, 17, 18, 18, 17, 19,
    20, 21, 22, 22, 21, 23
  ]);

  return {
    vertexData,
    indexData,
    numVertices: indexData.length
  };
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
    label: 'textured cube shader',
    code: texturedCubeShader
  });

  const pipeline: GPURenderPipeline = device.createRenderPipeline({
    label: "hardcoded textured cube pipeline",
    layout: "auto",
    vertex: {
      module,
      buffers: [
        {
          arrayStride: 3 * 4,
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
    }
  });

  const faceSize: number = 128;
  const faceCanvases: HTMLCanvasElement[] = [
    { faceColor: "#F00", textColor: "#0FF", text: "+X"},
    { faceColor: "#FF0", textColor: "#00F", text: "-X"},
    { faceColor: "#0F0", textColor: "#F0F", text: "+Y"},
    { faceColor: "#0FF", textColor: "#F00", text: "-Y"},
    { faceColor: "#00F", textColor: "#FF0", text: "+Z"},
    { faceColor: "#F0F", textColor: "#0F0", text: "-Z"},
  ].map(faceInfo => generateFace(faceSize, faceInfo));

  for (const canvas of faceCanvases) {
    document.body.appendChild(canvas);
  }

  const texture: GPUTexture = await Texture.createTextureFromSources(
    device, faceCanvases, {mips: true, flipY: false}
  );

  const sampler: GPUSampler = device!.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear"
  });

  const uniformBufferSize: number = 16 * 4;
  const uniformBuffer: GPUBuffer = device!.createBuffer({
    label: "uniform for cube",
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const uniformValues: Float32Array = new Float32Array(uniformBufferSize / 4);

  const kMatrixOffset: number = 0;
  const matrix: Float32Array = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);

  const { vertexData, indexData, numVertices } = createCubeVertices();
  const vertexBuffer: GPUBuffer = device!.createBuffer({
    label: "vertex buffer vertices",
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(vertexBuffer, 0, vertexData);

  const indexBuffer: GPUBuffer = device!.createBuffer({
    label: "index buffer",
    size: indexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(indexBuffer, 0, indexData);

  const bindGroup: GPUBindGroup = device!.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer }},
      { binding: 1, resource: sampler },
      { binding: 2, resource: texture.createView({dimension: "cube"}) }
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
      },
    ],
    depthStencilAttachment: {
        view: context!.getCurrentTexture().createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store"
      }
  };

  const deg2rad = (d: number) => d * Math.PI / 180; 

  const settings = {
    rotation: [deg2rad(20), deg2rad(25), deg2rad(0)]
  };

  let depthTexture: GPUTexture;

  function render() {
    const canvasTexture: GPUTexture = context!.getCurrentTexture();
    (renderPassDescriptor.colorAttachments as any)[0].view = canvasTexture.createView();

    if (!depthTexture ||
        depthTexture.width !== canvasTexture.width ||
        depthTexture.height !== canvasTexture.height) {
      if (depthTexture) {
        depthTexture.destroy();
      }
      depthTexture = device!.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT  
      });
    }
    renderPassDescriptor.depthStencilAttachment!.view = depthTexture.createView();

    const encoder: GPUCommandEncoder = device!.createCommandEncoder({ label: "our encoder" });
    const pass: GPURenderPassEncoder = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint16");

    const aspect: number = canvas!.clientWidth / canvas!.clientHeight;
    mat4.perspective(
      60 * Math.PI / 180,
      aspect,
      0.1,
      10,
      matrix
    );

    const view: Mat4 = mat4.lookAt(
      [0, 1, 5],
      [0, 0, 0],
      [0, 1, 0]
    );
    mat4.multiply(matrix, view, matrix);
    mat4.rotateX(matrix, settings.rotation[0], matrix);
    mat4.rotateY(matrix, settings.rotation[1], matrix);
    mat4.rotateZ(matrix, settings.rotation[2], matrix);

    device!.queue.writeBuffer(uniformBuffer, 0, uniformValues);
    pass.setBindGroup(0, bindGroup);
    pass.drawIndexed(numVertices);

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
      render();
    }
  });
  observer.observe(canvas as Element);
  render();
}

main();  