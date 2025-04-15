import { Mat4x4 } from "./matrix";

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
        matrix: mat4x4f,
        fudgeFactor: f32
      };

      struct Vertex {
        @location(0) position: vec4f,
        @location(1) color: vec4f
      }

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f
      }

      @group(0) @binding(0) var<uniform> uni: Uniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
        
        let position = uni.matrix * vert.position;

        let zToDivideBy = 1.0 + position.z * uni.fudgeFactor;

        vsOut.position = vec4f(position.xyz, zToDivideBy);
        vsOut.color = vert.color;
        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        return vsOut.color;
      }
  `
  });

  const pipeline: GPURenderPipeline = device.createRenderPipeline({
    label: "2 attributes",
    layout: "auto",
    vertex: {
      module,
      buffers: [
        {
          arrayStride: 4 * 4,
          attributes: [
            {shaderLocation: 0, offset: 0, format: "float32x3"},
            {shaderLocation: 1, offset: 12, format: "unorm8x4"}
          ]
        }
      ]
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }]
    },
    primitive: {
      cullMode: "front"
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus"
    }
  });

  interface ModelData {
    vertexData: Float32Array;
    numVertices: number;
  }

  function createFVerticies(): ModelData {
    const positions: number[] = [
      0, 0, 0,
      30, 0, 0,
      0, 150, 0,
      30, 150, 0,

      30, 0, 0,
      100, 0, 0,
      30, 30, 0,
      100, 30, 0,

      30, 60, 0,
      70, 60, 0,
      30, 90, 0,
      70, 90, 0,

      0, 0, 30,
      30, 0, 30,
      0, 150, 30,
      30, 150, 30,

      30, 0, 30,
      100, 0, 30,
      30, 30, 30,
      100, 30, 30,

      30, 60, 30,
      70, 60, 30,
      30, 90, 30,
      70, 90, 30
    ];

    const indices: number[] = [
      0, 1, 2,    2, 1, 3,
      4, 5, 6,    6, 5, 7,
      8, 9, 10,   10, 9, 11,

      12, 14, 13,    14, 15, 13,
      16, 18, 17,    18, 19, 17,
      20, 22, 21,    22, 23, 21,
      
      0, 12, 5,    12, 17, 5,
      5, 17, 7,    17, 19, 7,
      6, 7, 18,    18, 7, 19,
      6, 18, 8,    18, 20, 8,
      8, 20, 9,    20, 21, 9,
      9, 21, 11,   21, 23, 11,
      10, 11, 22,  22, 11, 23,
      10, 22, 3,   22, 15, 3,
      2, 3, 14,    14, 3, 15,
      0, 2, 12,    12, 2, 14
    ];

    const quadColors: number[] = [
      200, 70, 120,
      200, 70, 120,
      200, 70, 120,

      80, 70, 200,
      80, 70, 200,
      80, 70, 200,

      70, 200, 210,
      160, 160, 220,
      90, 130, 110,
      200, 200, 70,
      210, 100, 70,
      210, 160, 70,
      70, 180, 210,
      100, 70, 210,
      76, 210, 100,
      140, 210, 80
    ];

    const numVertices: number = indices.length;
    const vertexData: Float32Array = new Float32Array(numVertices * 4);
    const colorData: Uint8Array = new Uint8Array(vertexData.buffer);

    for (let i = 0; i < indices.length; ++i) {
      const positionNdx: number = indices[i] * 3;
      const position: number[] = positions.slice(positionNdx, positionNdx + 3);
      vertexData.set(position, i * 4);

      const quadNdx: number = (i / 6 | 0) * 3;
      const color: number[] = quadColors.slice(quadNdx, quadNdx + 3); 
      colorData.set(color, i * 16 + 12);
      colorData[i * 16 + 15] = 255;
    }

    return {
      vertexData,
      numVertices
    }
  }

  const fModel: ModelData = createFVerticies();
  const vertexBuffer: GPUBuffer = device!.createBuffer({
    label: "vertex buffer vertices",
    size: fModel.vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(vertexBuffer, 0, fModel.vertexData);

  interface ObjectInfo {
    uniformBuffer: GPUBuffer;
    uniformValues: Float32Array;
    matrixValue: Float32Array;
    fudgeFactorValue: Float32Array;
    bindGroup: GPUBindGroup;
  }

  const numObjects: number = 5;
  const objectsInfos: ObjectInfo[] = []; 
  for (let i = 0; i < numObjects; ++i) {
    const uniformBufferSize: number = (16 + 1 + 3) * 4;
    const uniformBuffer: GPUBuffer = device!.createBuffer({
      label: "uniforms",
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const uniformValues: Float32Array = new Float32Array(uniformBufferSize / 4);

    const kMatrixOffset: number = 0;
    const kFudgeFactorOffset: number = 16;
    
    const matrixValue: Float32Array = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);
    const fudgeFactorValue: Float32Array = uniformValues.subarray(kFudgeFactorOffset, kFudgeFactorOffset + 1);

    const bindGroup: GPUBindGroup = device!.createBindGroup({
      label: "bind group for object",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {binding: 0, resource: { buffer: uniformBuffer }}
      ]
    });

    objectsInfos.push({
      uniformBuffer,
      uniformValues,
      matrixValue,
      fudgeFactorValue,
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
    ],
    depthStencilAttachment: {
      view: context!.getCurrentTexture().createView(),
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store"
    }
  };

  type Converter = (degrees: number) => number;
  const deg2Rad: Converter = d => d * Math.PI / 180;

  interface MatrixSettings {
    translation: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
    fudgeFactor: number
  }

  const settings: MatrixSettings = {
    translation: [0, 0, -1000],
    rotation: [deg2Rad(40), deg2Rad(0), deg2Rad(0)],
    scale: [3, 3, 3],
    fudgeFactor: 10
  };

  let depthTexture: GPUTexture;

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

    const encoder: GPUCommandEncoder = device!.createCommandEncoder({ label: "our encoder" });
    const pass: GPURenderPassEncoder = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);

    let matrix: Mat4x4.Mat4x4 = Mat4x4.ortho(
      0,
      canvas!.clientWidth, 
      canvas!.clientHeight, 
      0,
      1200,
      -1200
    );

    for (const {
      uniformBuffer,
      uniformValues,
      matrixValue,
      fudgeFactorValue,
      bindGroup
    } of objectsInfos) {
      Mat4x4.translate(matrix, settings.translation, matrix);
      Mat4x4.rotateX(matrix, settings.rotation[0], matrix);
      Mat4x4.rotateY(matrix, settings.rotation[1], matrix);
      Mat4x4.rotateZ(matrix, settings.rotation[2], matrix);
      Mat4x4.scale(matrix, settings.scale, matrix);

      matrixValue.set(matrix);
      fudgeFactorValue[0] = settings.fudgeFactor;

      device!.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.draw(fModel.numVertices);
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