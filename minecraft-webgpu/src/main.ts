import { Mat4x4, Vec3 } from "./matrix";

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
        matrix: mat4x4f
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
        
        vsOut.position = uni.matrix * vert.position;
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
      cullMode: "back"
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
      -50, 75, 15,
      -20, 75, 15,
      -50, -75, 15,
      -20, -75, 15,

      -20, 75, 15,
      50, 75, 15,
      -20, 45, 15,
      50, 45, 15,

      -20, 15, 15,
      20, 15, 15,
      -20, -15, 15,
      20, -15, 15,
      
      -50, 75, -15,
      -20, 75, -15,
      -50, -75, -15,
      -20, -75, -15,

      -20, 75, -15,
      50, 75, -15,
      -20, 45, -15,
      50, 45, -15,

      -20, 15, -15,
      20, 15, -15,
      -20, -15, -15,
      20, -15, -15
    ];

    const indices: number[] = [
      0,  2,  1,    2,  3,  1,   
      4,  6,  5,    6,  7,  5,   
      8, 10,  9,   10, 11,  9,   
  
      12, 13, 14,   14, 13, 15,   
      16, 17, 18,   18, 17, 19,   
      20, 21, 22,   22, 21, 23,   
  
      0,  5, 12,   12,  5, 17,   
      5,  7, 17,   17,  7, 19,   
      6, 18,  7,   18, 19,  7,   
      6,  8, 18,   18,  8, 20,   
      8,  9, 20,   20,  9, 21,   
      9, 11, 21,   21, 11, 23,   
      10, 22, 11,   22, 23, 11,   
      10,  3, 22,   22,  3, 15,   
      2, 14,  3,   14, 15,  3,   
      0, 12,  2,   12, 14,  2
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
    bindGroup: GPUBindGroup;
  }

  const numObjects: number = 5 * 5 + 1;
  const objectsInfos: ObjectInfo[] = []; 
  for (let i = 0; i < numObjects; ++i) {
    const uniformBufferSize: number = (16) * 4;
    const uniformBuffer: GPUBuffer = device!.createBuffer({
      label: "uniforms",
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const uniformValues: Float32Array = new Float32Array(uniformBufferSize / 4);

    const kMatrixOffset: number = 0;
    
    const matrixValue: Float32Array = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);

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
    target: Vec3.Vec3,
    targetAngle: number
  }

  const radius: number = 200;
  const settings: MatrixSettings = {
    target: [0, 200, 300],
    targetAngle: deg2Rad(0)
  };

  settings.target[0] = Math.cos(settings.targetAngle) * radius;
  settings.target[2] = Math.sin(settings.targetAngle) * radius;

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

    const aspect: number = canvas!.clientWidth / canvas!.clientHeight;
    const projection: Mat4x4.Mat4x4 = Mat4x4.perspective(
      deg2Rad(60),
      aspect,
      1,
      2000
    );

    const eye: Vec3.Vec3 = [-500, 300, -500];
    const target: Vec3.Vec3 = [0, -100, 0];
    const up: Vec3.Vec3 = [0, 1, 0];

    const viewMatrix: Mat4x4.Mat4x4 = Mat4x4.lookAt(eye, target, up);
    const viewProjectionMatrix: Mat4x4.Mat4x4 = Mat4x4.multiply(projection, viewMatrix);

    objectsInfos.forEach(({
      matrixValue,
      uniformBuffer,
      uniformValues,
      bindGroup
    }, i) => {
      const deep: number = 5;
      const across: number = 5;

      if (i < 25) {
        const gridX: number = i % across;
        const gridY: number = i / across | 0;

        const u: number = gridX / (across - 1);
        const v: number = gridY / (deep - 1);

        const x: number = (u - 0.5) * across * 150;
        const z: number = (v - 0.5) * deep * 150;

        const aimMatrix: Mat4x4.Mat4x4 = Mat4x4.aim([x, 0, z], settings.target, up);
        matrixValue.set(Mat4x4.multiply(viewProjectionMatrix, aimMatrix));
      } else {
        matrixValue.set(Mat4x4.translate(viewProjectionMatrix, settings.target));
      }

      device!.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.draw(fModel.numVertices);
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