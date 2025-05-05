import { mat4, Mat4 } from "wgpu-matrix";

const createBlendedMap = () => {
  const w: number[] = [255, 255, 255, 255];
  const r: number[] = [255, 0, 0, 255];
  const b: number[] = [0, 28, 116, 255];
  const y: number[] = [255, 231, 0, 255];
  const g: number[] = [58, 181, 75, 255];
  const a: number[] = [38, 123, 167, 255];
  const data: Uint8Array = new Uint8Array([
    w, r, r, r, r, r, r, a, a, r, r, r, r, r, r, w,
    w, w, r, r, r, r, r, a, a, r, r, r, r, r, w, w,
    w, w, w, r, r, r, r, a, a, r, r, r, r, w, w, w,
    w, w, w, w, r, r, r, a, a, r, r, r, w, w, w, w,
    w, w, w, w, w, r, r, a, a, r, r, w, w, w, w, w,
    w, w, w, w, w, w, r, a, a, r, w, w, w, w, w, w,
    w, w, w, w, w, w, w, a, a, w, w, w, w, w, w, w,
    b, b, b, b, b, b, b, b, a, y, y, y, y, y, y, y,
    b, b, b, b, b, b, b, g, y, y, y, y, y, y, y, y,
    w, w, w, w, w, w, w, g, g, w, w, w, w, w, w, w,
    w, w, w, w, w, w, r, g, g, r, w, w, w, w, w, w,
    w, w, w, w, w, r, r, g, g, r, r, w, w, w, w, w,
    w, w, w, w, r, r, r, g, g, r, r, r, w, w, w, w,
    w, w, w, r, r, r, r, g, g, r, r, r, r, w, w, w,
    w, w, r, r, r, r, r, g, g, r, r, r, r, r, w, w,
    w, r, r, r, r, r, r, g, g, r, r, r, r, r, r, w,
  ].flat());
  return generateMips(data, 16);
}

const createCheckeredMap = () => {
  const ctx: CanvasRenderingContext2D | null = document.createElement("canvas").getContext("2d", {willReadFrequently: true});
  
  interface Level {
    size: number,
    color: string
  }

  const levels: Level[] = [
    { size: 64, color: "rgb(128,0,255)" },
    { size: 32, color: "rgb(0,255,0)" },
    { size: 16, color: "rgb(255,0,0)" },
    { size:  8, color: "rgb(255,255,0)" },
    { size:  4, color: "rgb(0,0,255)" },
    { size:  2, color: "rgb(0,255,255)" },
    { size:  1, color: "rgb(255,0,255)" }
  ]
  return levels.map(({size, color}, i) => {
    ctx!.canvas.width = size;
    ctx!.canvas.height = size;
    ctx!.fillStyle = i & 1 ? "#000" : "fff";
    ctx!.fillRect(0, 0, size, size);
    ctx!.fillStyle = color;
    ctx!.fillRect(0, 0, size/2, size/2);
    ctx!.fillRect(size/2, size/2, size/2, size/2);
    const imgData: ImageData = ctx!.getImageData(0, 0, size, size);
    return {
      src: new Uint8Array(imgData.data),
      srcWidth: size,
      srcHeight: size
    }
  });
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Uint8Array, b: Uint8Array, t: number) => a.map((v, i) => lerp(v, b[i], t)); 
const billinearFilter = (tl: Uint8Array, tr: Uint8Array, bl: Uint8Array, br: Uint8Array, t1: number, t2: number) => {
  const t: Uint8Array = mix(tl, tr, t1);
  const b: Uint8Array = mix(bl, br, t1);
  return mix(t, b, t2);
}

interface MipTexture {
  src: Uint8Array,
  srcWidth: number,
  srcHeight: number
}

const createNextMipLevelRgba8Unorm = (mip: MipTexture) => {
    const dstWidth: number = Math.max(1, mip.srcWidth / 2 | 0);
    const dstHeight: number = Math.max(1, mip.srcHeight / 2 | 0);
    const dst: Uint8Array = new Uint8Array(dstWidth * dstHeight * 4);
    
    const getSrcPixel = (x: number, y: number) => {
      const offset: number = (y * mip.srcWidth + x) * 4;
      return mip.src.subarray(offset, offset + 4);
    }

    for (let y = 0; y < dstHeight; ++y) {
      for (let x = 0; x < dstWidth; ++x) {
        const u: number = (x + 0.5) / dstWidth;
        const v: number = (y + 0.5) / dstHeight;

        const au: number = (u * mip.srcWidth - 0.5);
        const av: number = (v * mip.srcHeight - 0.5);

        const tx: number = au | 0;
        const ty: number = av | 0;

        const t1: number = au % 1;
        const t2: number = av % 1;

        const tl: Uint8Array = getSrcPixel(tx, ty);
        const tr: Uint8Array = getSrcPixel(tx + 1, ty);
        const bl: Uint8Array = getSrcPixel(tx, ty + 1);
        const br: Uint8Array = getSrcPixel(tx + 1, ty + 1);

        const dstOffset: number = (y * dstWidth + x) * 4;
        dst.set(billinearFilter(tl, tr, bl, br, t1, t2), dstOffset);
      }
    }
    return { src: dst, srcWidth: dstWidth, srcHeight: dstHeight };
}

const generateMips = (src: Uint8Array, srcWidth: number) => {
  const srcHeight: number = src.length / 4 / srcWidth;

  let mip: MipTexture = { src, srcWidth, srcHeight };
  const mips: MipTexture[] = [mip];

  while (mip.srcWidth > 1 || mip.srcHeight > 1 ) {
    mip = createNextMipLevelRgba8Unorm(mip);
    mips.push(mip);
  }
  return mips;
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
    code: /* wgsl */`
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f
      }

      struct Uniforms {
        matrix: mat4x4f
      }

      @group(0) @binding(2) var<uniform> uni: Uniforms; 

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> VSOutput {
        let pos = array(
          vec2f(0.0, 0.0),
          vec2f(1.0, 0.0),
          vec2f(0.0, 1.0),

          vec2f(0.0, 1.0),
          vec2f(1.0, 0.0),
          vec2f(1.0, 1.0)
        );

        var vsOutput: VSOutput;
        let xy = pos[vertexIndex];
        vsOutput.position = uni.matrix * vec4f(xy, 0.0, 1.0);
        vsOutput.texcoord = xy * vec2f(1, 50);
        return vsOutput;
      }

      @group(0) @binding(0) var ourSampler: sampler;
      @group(0) @binding(1) var ourTexture: texture_2d<f32>; 

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        return textureSample(ourTexture, ourSampler, vsOut.texcoord);
      }
  `
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

  const createTextureWithMips = (mips: MipTexture[], label: string) => {
    const texture = device.createTexture({
      label,
      size: [mips[0].srcWidth, mips[0].srcHeight],
      mipLevelCount: mips.length,
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    mips.forEach(({src, srcWidth, srcHeight}, mipLevel) => {
      device!.queue.writeTexture(
        { texture, mipLevel },
        src,
        { bytesPerRow: srcWidth * 4},
        { width: srcWidth, height: srcHeight }
      );
    }); 
    return texture;
  };

  const textures: GPUTexture[] = [
    createTextureWithMips(createBlendedMap(), "blended"),
    createTextureWithMips(createCheckeredMap(), "checkered")
  ]; 

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

  type AddressMode = "repeat" | "clamp-to-edge";
  type FilterMode = "linear" | "nearest";

  interface SamplingSettings {
    addressModeU: AddressMode,
    addressModeV: AddressMode,
    magFilter: FilterMode
  }

  const settings: SamplingSettings = {
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    magFilter: "nearest"
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