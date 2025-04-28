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
        vsOutput.position = vec4f(xy, 0.0, 1.0);
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

  const texture: GPUTexture = device!.createTexture({
    size: [kTextureWidth, kTextureHeight],
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
  });

  device!.queue.writeTexture(
    {texture},
    textureData,
    { bytesPerRow: kTextureWidth * 4 },
    { width: kTextureWidth, height: kTextureHeight }
  );

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
        { binding: 1, resource: texture.createView() }
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