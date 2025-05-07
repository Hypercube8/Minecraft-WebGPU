import { mat4, Mat4 } from "wgpu-matrix";
import { MipMapping } from "./mipmapping";
import texturedQuadShader from "/shaders/textured_quad.wgsl?raw";

async function loadImageBitmap(url: string): Promise<ImageBitmap> {
  const res: Response = await fetch(url);
  const blob: Blob = await res.blob();
  return await createImageBitmap(blob, { colorSpaceConversion: "none" });
}

interface TextureOptions {
  flipY: boolean,
  mips: boolean
}

function copySourceToTexture(device: GPUDevice, texture: GPUTexture, source: ImageBitmap, options: Partial<TextureOptions>) {
  device.queue.copyExternalImageToTexture(
    { source, flipY: options.flipY },
    { texture },
    { width: source.width, height: source.height }
  );

  if (texture.mipLevelCount > 1) {
    MipMapping.generateMips(device, texture);
  }
}

function createTextureFromSource(device: GPUDevice, source: ImageBitmap, options: Partial<TextureOptions>): GPUTexture {
  const texture: GPUTexture = device!.createTexture({
    format: "rgba8unorm",
    mipLevelCount: options.mips ? MipMapping.numMipLevels(source.width, source.height) : 1,
    size: [source.width, source.height],
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
    label: 'hardcoded textured quad shader',
    code: texturedQuadShader
  });

  const pipeline: GPURenderPipeline = device.createRenderPipeline({
    label: "hardcoded textured quad pipeline",
    layout: "auto",
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }]
    }
  });

  const textures: GPUTexture[] = await Promise.all([
    await createTextureFromImage(device,
        "/images/f-texture.png", {mips: true, flipY: false}),
    await createTextureFromImage(device, 
        "/images/coins.jpg", {mips: true}),
    await createTextureFromImage(device,
        "/images/Granite_paving_tileable_512x512.jpeg", {mips: true})
  ]);

  interface ObjectInfo {
    bindGroups: GPUBindGroup[],
    matrix: Mat4,
    uniformValues: Float32Array,
    uniformBuffer: GPUBuffer
  }

  const kMatrixOffset: number = 0;

  const objectInfos: ObjectInfo[] = [];
  for (let i = 0; i < 8; ++i) {
    const sampler: GPUSampler = device!.createSampler({
      addressModeU: "repeat",
      addressModeV: "repeat",
      magFilter: (i & 1) ? "linear" : "nearest",
      minFilter: (i & 2) ? "linear" : "nearest",
      mipmapFilter: (i & 4) ? "linear" : "nearest"
    });

    const uniformBufferSize: number = 
      16 * 4;
    const uniformBuffer: GPUBuffer = device!.createBuffer({
      label: "uniforms for quad",
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const uniformValues: Float32Array = new Float32Array(uniformBufferSize / 4);
    const matrix: Mat4 = uniformValues.subarray(kMatrixOffset, 16);

    const bindGroups: GPUBindGroup[] = textures.map(texture =>
      device!.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: texture.createView() },
          { binding: 2, resource: { buffer: uniformBuffer }} 
        ]
    }));

    objectInfos.push({
      bindGroups,
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

  let texNdx: number = 0;

  canvas!.addEventListener("click", () => {
    texNdx = (texNdx + 1) % textures.length;
    render();
  });

  function render() {
    const fov: number = 60 * Math.PI / 180;
    const aspect: number =  canvas!.clientWidth / canvas!.clientHeight;
    const zNear: number = 1;
    const zFar: number = 2000;
    const projectionMatrix: Mat4 = mat4.perspective(fov, aspect, zNear, zFar);

    const cameraPosition: number[] = [0, 0, 2];
    const up: number[] = [0, 1, 0];
    const target: number[] = [0, 0, 0];
    const cameraMatrix: Mat4 = mat4.lookAt(cameraPosition, target, up);
    const viewMatrix: Mat4 = mat4.inverse(cameraMatrix);
    const viewProjectionMatrix: Mat4 = mat4.multiply(projectionMatrix, viewMatrix);    
    
    (renderPassDescriptor.colorAttachments as any)[0].view = context!.getCurrentTexture().createView();

    const encoder: GPUCommandEncoder = device!.createCommandEncoder({ label: "our encoder" });
    const pass: GPURenderPassEncoder = encoder.beginRenderPass(renderPassDescriptor);

    pass.setPipeline(pipeline);

    objectInfos.forEach(({bindGroups, matrix, uniformBuffer, uniformValues}, i) => {
      const bindGroup: GPUBindGroup = bindGroups[texNdx];

      const xSpacing: number = 1.2;
      const ySpacing: number = 0.7;
      const zDepth: number = 50;

      const x: number = i % 4 - 1.5;
      const y: number = i < 4 ? 1 : -1;

      mat4.translate(viewProjectionMatrix, [x * xSpacing, y * ySpacing, -zDepth * 0.5], matrix);
      mat4.rotateX(matrix, 0.5 * Math.PI, matrix);
      mat4.scale(matrix, [1, zDepth * 2, 1], matrix);
      mat4.translate(matrix, [-0.5, -0.5, 0], matrix);

      device!.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      pass.setBindGroup(0, bindGroup);
      pass.draw(6);
    });

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