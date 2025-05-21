import { concentricCircleShader } from "../public/shaders/concentric.ts";

async function main(): Promise<void> {
  const adapter: GPUAdapter | null = await navigator.gpu?.requestAdapter();

  const hasBGRA8unormStorage: boolean | undefined = adapter?.features.has("bgra8unorm-storage");
  const device: GPUDevice | undefined = await adapter?.requestDevice({
    requiredFeatures: hasBGRA8unormStorage ? ["bgra8unorm-storage"] : []
  });

  if (!device) {
    throw new Error("WebGPU is not supported in this browser.");
  }

  const canvas: HTMLCanvasElement | null = document.querySelector('canvas');
  const context: GPUCanvasContext | null = canvas!.getContext('webgpu');

  const presentationFormat = hasBGRA8unormStorage ?
    navigator.gpu.getPreferredCanvasFormat() :
    "rgba8unorm";
  context!.configure({
    device,
    format: presentationFormat,
    usage: GPUTextureUsage.TEXTURE_BINDING | 
           GPUTextureUsage.STORAGE_BINDING
  });

  const module: GPUShaderModule = device.createShaderModule({
    label: 'textured cube shader',
    code: concentricCircleShader(presentationFormat)
  });

  const pipeline: GPUComputePipeline = device!.createComputePipeline({
    label: "circles in storage texture",
    layout: "auto",
    compute: {
      module
    }
  });



  function render() {
    const canvasTexture: GPUTexture = context!.getCurrentTexture();

    const bindGroup = device!.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: canvasTexture.createView() }
      ]
    });

    const encoder: GPUCommandEncoder = device!.createCommandEncoder({ label: "our encoder" });
    const pass: GPUComputePassEncoder = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(canvasTexture.width, canvasTexture.height);
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