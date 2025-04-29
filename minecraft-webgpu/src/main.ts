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
        scale: vec2f,
        offset: vec2f
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
        vsOutput.position = vec4f(xy * uni.scale + uni.offset, 0.0, 1.0);
        vsOutput.texcoord = xy;
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

  const kTextureWidth: number = 5;
  const kTextureHeight: number = 7;

  const _: number[] = [255, 0, 0, 255];
  const y: number[] = [255, 255, 0, 255];
  const b: number[] = [0, 0, 255, 255];
  const textureData: Uint8Array = new Uint8Array([
    _, _, _, _, _,
    _, y, _, _, _,
    _, y, _, _, _,
    _, y, y, y, _,
    _, y, _, _, _,
    _, y, y, y, _,
    b, _, _, _, _,
  ].flat());

  const mips: MipTexture[] = generateMips(textureData, kTextureWidth);

  const texture: GPUTexture = device!.createTexture({
    label: "yellow F on red",
    size: [mips[0].srcWidth, mips[0].srcHeight],
    mipLevelCount: mips.length,
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
  });

  mips.forEach(({src, srcWidth, srcHeight}, mipLevel) => {
    device!.queue.writeTexture(
      {texture, mipLevel},
      src,
      { bytesPerRow: srcWidth * 4 },
      { width: srcWidth, height: srcHeight }
    );
  });

  const uniformBufferSize: number = 
    2 * 4 +
    2 * 4;
  const uniformBuffer: GPUBuffer = device!.createBuffer({
    label: "uniforms for quad",
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const uniformValues: Float32Array = new Float32Array(uniformBufferSize / 4);

  const kScaleOffset: number = 0;
  const kOffsetOffset: number = 2;

  const bindGroups: GPUBindGroup[] = [];
  for (let i = 0; i < 8; ++i) {
    const sampler: GPUSampler = device!.createSampler({
      addressModeU: (i & 1) ? "repeat" : "clamp-to-edge",
      addressModeV: (i & 2) ? "repeat" : "clamp-to-edge",
      magFilter: (i & 4) ? "linear" : "nearest"
    });

    const bindGroup: GPUBindGroup = device!.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture.createView() },
        { binding: 2, resource: { buffer: uniformBuffer }}
      ]
    });
    bindGroups.push(bindGroup);
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

  function render() {
    const ndx: number = (settings.addressModeU === "repeat" ? 1 : 0) + 
                        (settings.addressModeV === "repeat" ? 1 : 0) +
                        (settings.magFilter === "linear" ? 4 : 0);

    uniformValues.set([1, 1], kScaleOffset);
    uniformValues.set([0, 0], kOffsetOffset);

    device!.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    const bindGroup: GPUBindGroup = bindGroups[ndx];
    

    (renderPassDescriptor.colorAttachments as any)[0].view = context!.getCurrentTexture().createView();

    const encoder: GPUCommandEncoder = device!.createCommandEncoder({ label: "our encoder" });
    const pass: GPURenderPassEncoder = encoder.beginRenderPass(renderPassDescriptor);

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6);
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