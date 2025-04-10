import { Mat3x3 } from "./matrix";

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
      struct Uniforms {
        color: vec4f,
        resolution: vec2f,
        matrix: mat3x3f
      };

      struct Vertex {
        @location(0) position: vec2f
      }

      struct VSOutput {
        @builtin(position) position: vec4f,
      }

      @group(0) @binding(0) var<uniform> uni: Uniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;

        let position = (uni.matrix * vec3f(vert.position, 1)).xy; 

        let zeroToOne = position / uni.resolution;

        let zeroToTwo = zeroToOne * 2.0;

        let flippedClipSpace = zeroToTwo - 1.0;

        let clipSpace = flippedClipSpace * vec2f(1, -1);
        
        vsOut.position = vec4f(clipSpace, 0.0, 1.0);
        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        return uni.color;
      }
  `
  });

  const pipeline: GPURenderPipeline = device.createRenderPipeline({
    label: "hardcoded triangles pipeline",
    layout: "auto",
    vertex: {
      module,
      buffers: [
        {
          arrayStride: 2 * 4,
          attributes: [
            {shaderLocation: 0, offset: 0, format: "float32x2"}
          ]
        }
      ]
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }]
    }
  });

  interface ModelData {
    vertexData: Float32Array;
    indexData: Uint32Array;
    numVertices: number;
  }

  function createFVerticies(): ModelData {
    const vertexData: Float32Array = new Float32Array([
      0, 0,
      30, 0,
      0, 150,
      30, 150,

      30, 0,
      100, 0,
      30, 30,
      100, 30,

      30, 60,
      70, 60,
      30, 90,
      70, 90
    ]);

    const indexData: Uint32Array = new Uint32Array([
      0, 1, 2,    2, 1, 3,
      4, 5, 6,    6, 5, 7,
      8, 9, 10,   10, 9, 11
    ]);

    return {
      vertexData,
      indexData,
      numVertices: indexData.length
    }
  }

  const uniformBufferSize: number = (4 + 2 + 2 + 12) * 4;
  const uniformBuffer: GPUBuffer = device!.createBuffer({
    label: "uniforms",
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const uniformValues: Float32Array = new Float32Array(uniformBufferSize / 4);

  const kColorOffset: number = 0;
  const kResolutionOffset: number = 4;
  const kMatrixOffset: number = 8;
  
  const colorValue: Float32Array = uniformValues.subarray(kColorOffset, kColorOffset + 4);
  const resolutionValue: Float32Array = uniformValues.subarray(kResolutionOffset, kResolutionOffset + 2);
  const matrixValue: Float32Array = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 12);

  colorValue.set([Math.random(), Math.random(), Math.random(), 1]);

  const fModel: ModelData = createFVerticies();
  const vertexBuffer: GPUBuffer = device!.createBuffer({
    label: "vertex buffer vertices",
    size: fModel.vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(vertexBuffer, 0, fModel.vertexData);

  const indexBuffer: GPUBuffer = device!.createBuffer({
    label: "index buffer",
    size: fModel.indexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(indexBuffer, 0, fModel.indexData);

  const bindGroup: GPUBindGroup = device!.createBindGroup({
    label: "bind group for object",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {binding: 0, resource: { buffer: uniformBuffer }}
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
      }
    ]
  };

  type Converter = (degrees: number) => number;
  const deg2Rad: Converter = d => d * Math.PI / 180;

  interface MatrixSettings {
    translation: [number, number],
    rotation: number,
    scale: [number, number]
  }

  const settings: MatrixSettings = {
    translation: [0, 0],
    rotation: deg2Rad(0),
    scale: [1, 1]
  };

  function render() {
    (renderPassDescriptor.colorAttachments as any)[0].view = context!.getCurrentTexture().createView();

    const encoder: GPUCommandEncoder = device!.createCommandEncoder({ label: "our encoder" });
    const pass: GPURenderPassEncoder = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint32");

    const translationMatrix: Mat3x3.Mat3x3 = Mat3x3.translation(settings.translation);
    const rotationMatrix: Mat3x3.Mat3x3 = Mat3x3.rotation(settings.rotation);
    const scaleMatrix: Mat3x3.Mat3x3 = Mat3x3.scaling(settings.scale);

    let matrix: Mat3x3.Mat3x3 = Mat3x3.multiply(scaleMatrix, rotationMatrix);
    matrix = Mat3x3.multiply(matrix, translationMatrix);
    
    resolutionValue.set([canvas!.width, canvas!.height]);
    matrixValue.set([
      ...matrix.slice(0, 3), 0,
      ...matrix.slice(3, 6), 0,
      ...matrix.slice(6, 9), 0
    ]);

    device!.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    pass.setBindGroup(0, bindGroup);
    pass.drawIndexed(fModel.numVertices);

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