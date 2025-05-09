import { mat4 } from "wgpu-matrix";
import { MipMapping } from "./mipmapping";
import texturedCubeShader from "/shaders/textured_cube.wgsl?raw";

interface ModelData {
  vertexData: Float32Array,
  indexData: Uint16Array,
  numVertices: number
}

function createCubeVertices(): ModelData {
  const vertexData: Float32Array = new Float32Array([
    -1,  1,  1,   0,    0,
    -1, -1,  1,   0,    0.5,
     1,  1,  1,   0.25, 0,
     1, -1,  1,   0.25, 0.5,

     1,  1, -1,   0.25, 0,
     1,  1,  1,   0.5,  0,
     1, -1, -1,   0.25, 0.5,
     1, -1,  1,   0.5,  0.5,

     1,  1, -1,   0.5,  0,
     1, -1, -1,   0.5,  0.5,
    -1,  1, -1,   0.75, 0,
    -1, -1, -1,   0.75, 0.5,

    -1,  1,  1,   0,    0.5,
    -1,  1, -1,   0.25, 0.5,
    -1, -1,  1,   0,    1,
    -1, -1, -1,   0.25, 1,
     
     1, -1,  1,   0.25, 0.5,
    -1, -1,  1,   0.5,  0.5,
     1, -1, -1,   0.25, 1,
    -1, -1, -1,   0.5,  1,

    -1,  1,  1,   0.5,  0.5,
     1,  1,  1,   0.75, 0.5,
    -1,  1, -1,   0.5,  1,
     1,  1, -1,   0.75, 1
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

async function startPlayingAndWaitForVideo(video: HTMLVideoElement) {
  return new Promise((resolve, reject) => {
    video.addEventListener("error", reject);
    if ("requestVideoFrameCallback" in video) {
      video.requestVideoFrameCallback(resolve);
    }
    video.play().catch(reject);
  })
}

type ImageSource = ImageBitmap |
                   HTMLCanvasElement |
                   HTMLVideoElement

function getSourceSize(source: ImageSource): number[] {
  if ("videoWidth" in source) {
    return [
      source.videoWidth,
      source.videoHeight
    ]
  } else {
    return [
      source.width,
      source.height
    ]
  }
}

async function loadImageBitmap(url: string): Promise<ImageBitmap> {
  const res: Response = await fetch(url);
  const blob: Blob = await res.blob();
  return await createImageBitmap(blob, { colorSpaceConversion: "none" });
}

interface TextureOptions {
  flipY: boolean,
  mips: boolean
}

function copySourceToTexture(device: GPUDevice, texture: GPUTexture, source: ImageSource, options: Partial<TextureOptions>) {
  device.queue.copyExternalImageToTexture(
    { source, flipY: options.flipY },
    { texture },
    getSourceSize(source)
  );

  if (texture.mipLevelCount > 1) {
    MipMapping.generateMips(device, texture);
  }
}

function createTextureFromSource(device: GPUDevice, source: ImageSource, options: Partial<TextureOptions>): GPUTexture {
  const size: number[] = getSourceSize(source);
  const texture: GPUTexture = device!.createTexture({
    format: "rgba8unorm",
    mipLevelCount: options.mips ? MipMapping.numMipLevels(...size) : 1,
    size,
    usage: GPUTextureUsage.TEXTURE_BINDING |
           GPUTextureUsage.COPY_DST |
           GPUTextureUsage.RENDER_ATTACHMENT
  });
  copySourceToTexture(device, texture, source, options);
  return texture;
}

async function createTextureFromImage(device: GPUDevice, url: string, options: Partial<TextureOptions>) {
  const imgBitmap: ImageBitmap = await loadImageBitmap(url);
  return createTextureFromSource(device, imgBitmap, options);
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
    }
  });

  const { vertexData, indexData, numVertices } = createCubeVertices();
  const vertexBuffer: GPUBuffer = device!.createBuffer({
    label: "vertex buffer vertices",
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(vertexBuffer, 0, vertexData);

  const indexBuffer: GPUBuffer = device!.createBuffer({
    label: "index buffer",
    size: vertexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(indexBuffer, 0, indexData);

  const texture: GPUTexture = await createTextureFromImage(device!, 
    "/images/noodles.jpg", {mips: true, flipY: false});

  const sampler: GPUSampler = device!.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear"
  });

  const uniformBufferSize: number = 16 * 4;
  const uniformBuffer: GPUBuffer = device!.createBuffer({
    label: "uniform buffer",
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const uniformValues: Float32Array = new Float32Array(uniformBufferSize / 4);

  const kMatrixOffset: number = 0;
  const matrixValue: Float32Array = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);

  const bindGroup = device!.createBindGroup({
    label: "bind group for object",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer }},
      { binding: 1, resource: sampler },
      { binding: 2, resource: texture.createView() }
    ]
  });

  let depthTexture: GPUTexture;

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

  interface CubeSettings {
    rotation: number[]
  }

  const degToRad = (d: number) => d * Math.PI / 180;

  const settings: CubeSettings = {
    rotation: [degToRad(25), degToRad(25), degToRad(0)]
  }

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

    const aspect: number = canvas!.clientWidth / canvas!.clientHeight;
    mat4.perspective(
      60 * Math.PI / 180,
      aspect,
      0.1,
      10,
      matrixValue
    );
    const view = mat4.lookAt(
      [0, 1, 5],
      [0, 0, 0],
      [0, 1, 0]
    );
    mat4.multiply(matrixValue, view, matrixValue);
    mat4.rotateX(matrixValue, settings.rotation[0], matrixValue);
    mat4.rotateY(matrixValue, settings.rotation[1], matrixValue);
    mat4.rotateZ(matrixValue, settings.rotation[2], matrixValue);

    device!.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    const encoder: GPUCommandEncoder = device!.createCommandEncoder({ label: "our encoder" });
    const pass: GPURenderPassEncoder = encoder.beginRenderPass(renderPassDescriptor);

    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint16");
    
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