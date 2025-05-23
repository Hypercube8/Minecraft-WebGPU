import hardcodedTriangleShader from "/shaders/hardcoded_triangle.wgsl?raw";

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
    format: presentationFormat,
  });

  const module: GPUShaderModule = device.createShaderModule({
    label: 'textured cube shader',
    code: hardcodedTriangleShader
  });

  const pipeline: GPURenderPipeline = device!.createRenderPipeline({
    label: "hardcoded triangle pipeline",
    layout: "auto",
    vertex: {
      module
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }]
    },
    multisample: {
      count: 4
    }
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    label: "our render pass descriptor",
    colorAttachments: [
      {
        view: context!.getCurrentTexture().createView(),
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: "clear",
        storeOp: "store"
      }
    ]
  } 

  let multisampleTexture: GPUTexture;

  function render() {
    const canvasTexture: GPUTexture = context!.getCurrentTexture();

    if (!multisampleTexture ||
        multisampleTexture.width !== canvasTexture.width ||
        multisampleTexture.height !== canvasTexture.height
    ) {
      if (multisampleTexture) {
        multisampleTexture.destroy();
      }

      multisampleTexture = device!.createTexture({
        format: canvasTexture.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        size: [canvasTexture.width, canvasTexture.height],
        sampleCount: 4
      });
    }

    (renderPassDescriptor as any).colorAttachments[0].view = multisampleTexture.createView();
    (renderPassDescriptor as any).colorAttachments[0].resolveTarget = canvasTexture.createView();

    const encoder: GPUCommandEncoder = device!.createCommandEncoder({ label: "our encoder" });
    const pass: GPURenderPassEncoder = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.draw(3);
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