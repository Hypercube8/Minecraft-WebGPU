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
    label: 'hardcoded triangle',
    code: /* wgsl */`
      struct OurStruct {
        color: vec4f,
        scale: vec2f,
        offset: vec2f
      };

      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        let pos = array(
          vec2f( 0.0, 0.5),
          vec2f(-0.5, -0.5),
          vec2f( 0.5, -0.5),
        );

        return vec4f(
          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
  `
  });

  const pipeline: GPURenderPipeline = device.createRenderPipeline({
    label: "hardcoded triangles pipeline",
    layout: "auto",
    vertex: {
      module
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }]
    }
  });

  type RandomFunction = (min?: number, max?: number) => number;
  const rand: RandomFunction = (min?, max?) => {
    if (min == undefined) {
      min = 0;
      max = 1;
    } else if (max == undefined) {
      max = min;
      min = 0;
    }
    return min + Math.random() * (max - min);
  }; 

  const uniformBufferSize: number = 
    4 * 4 +
    2 * 4 +
    2 * 4;

  const kColorOffset: number = 0;
  const kScaleOffset: number = 4;
  const kOffsetOffset: number = 6;

  const kNumObjects: number = 100;

  interface ObjectInfo {
    scale: number;
    uniformBuffer: GPUBuffer;
    uniformValues: Float32Array;
    bindGroup: GPUBindGroup; 
  }

  const objectInfos: ObjectInfo[] = [];

  for (let i = 0; i < kNumObjects; i++) {
    const uniformBuffer: GPUBuffer = device.createBuffer({
      label: `uniforms for obj ${i}`,
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    }); 

    const uniformValues: Float32Array = new Float32Array(uniformBufferSize / 4);

    uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);
    uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);

    const bindGroup: GPUBindGroup = device.createBindGroup({
      label: `bind group for obj ${i}`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer }}
      ]
    });

    objectInfos.push({
      scale: rand(0.2, 0.5),
      uniformBuffer,
      uniformValues,
      bindGroup
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
    (renderPassDescriptor.colorAttachments as any)[0].view = context!.getCurrentTexture().createView();

    const encoder: GPUCommandEncoder = device!.createCommandEncoder({ label: "our encoder" });
    
    const pass: GPURenderPassEncoder = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    const aspect = canvas!.width / canvas!.height;

    for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
      uniformValues.set([scale / aspect, scale], kScaleOffset);
      device!.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
    }
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