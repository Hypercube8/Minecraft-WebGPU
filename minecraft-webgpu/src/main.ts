import { Mat4, mat4 } from "wgpu-matrix";
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
      module
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }]
    }
  });

  const video = document.createElement("video");
  video.muted = true;
  video.loop = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous"
  video.src = "https://webgpufundamentals.org/webgpu/resources/videos/pexels-anna-bondarenko-5534310 (540p).mp4";
  await startPlayingAndWaitForVideo(video);

  interface ObjectInfo {
    sampler: GPUSampler,
    matrix: Mat4,
    uniformValues: Float32Array,
    uniformBuffer: GPUBuffer
  }

  const objectInfos: ObjectInfo[] = [];
  for (let i = 0; i < 4; ++i) {
    const sampler: GPUSampler = device!.createSampler({
      addressModeU: "repeat",
      addressModeV: "repeat",
      magFilter: (i % 1) ? "linear" : "nearest",
      minFilter: (i % 2) ? "linear" : "nearest"
    });

    const uniformBufferSize: number = 16 * 4;
    const uniformBuffer: GPUBuffer = device!.createBuffer({
      label: "uniform for quad",
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const uniformValues: Float32Array = new Float32Array(uniformBufferSize / 4);

    const kMatrixOffset: number = 0;
    const matrix: Float32Array = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);

    objectInfos.push({
      sampler,
      matrix,
      uniformValues,
      uniformBuffer
    });
  }

  const renderPassDescriptor: GPURenderPassDescriptor = {
    label: "our basic canvas renderPass",
    colorAttachments: [
      {
        view: context!.getCurrentTexture().createView(),
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: "clear",
        storeOp: "store"
      }
    ]
  };

  function render() {
    const canvasTexture: GPUTexture = context!.getCurrentTexture();
    (renderPassDescriptor.colorAttachments as any)[0].view = canvasTexture.createView();

    const fov: number = 60 * Math.PI / 180;
    const aspect: number = canvas!.clientWidth / canvas!.clientHeight;
    const zNear: number = 1;
    const zFar: number = 2000;
    const projectionMatrix: Mat4 = mat4.perspective(fov, aspect, zNear, zFar);

    const cameraPosition: number[] = [0, 0, 2];
    const up: number[] = [0, 1, 0];
    const target: number[] = [0, 0, 0];
    const viewMatrix: Mat4 = mat4.lookAt(cameraPosition, target, up);
    const viewProjectionMatrix: Mat4 = mat4.multiply(projectionMatrix, viewMatrix);

    const encoder: GPUCommandEncoder = device!.createCommandEncoder({ label: "our encoder" });
    const pass: GPURenderPassEncoder = encoder.beginRenderPass(renderPassDescriptor);

    pass.setPipeline(pipeline);

    const texture: GPUExternalTexture = device!.importExternalTexture({source: video});

    objectInfos.forEach(({sampler, matrix, uniformBuffer, uniformValues}, i) => {
      const bindGroup: GPUBindGroup = device!.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: texture },
          { binding: 2, resource: { buffer: uniformBuffer }}
        ]
      });

      const xSpacing: number = 1.2;
      const ySpacing: number = 0.5;
      const zDepth: number = 1;

      const x: number = i % 2 - 0.5;
      const y: number = i < 2 ? 1 : -1;

      mat4.translate(viewProjectionMatrix, [x * xSpacing, y * ySpacing, -zDepth * 0.5], matrix);
      mat4.rotateX(matrix, 0.25 * Math.PI * Math.sign(y), matrix);
      mat4.scale(matrix, [1, -1, 1], matrix);
      mat4.translate(matrix, [-0.5, -0.5, 0], matrix);

      device!.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      
      pass.setBindGroup(0, bindGroup);
      pass.draw(6);
    });

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
      render();
    }
  });
  observer.observe(canvas as Element);
  render();
}

main();  