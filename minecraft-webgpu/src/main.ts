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
      struct Vertex {
        @location(0) position: vec2f,
        @location(1) color: vec4f,
        @location(2) offset: vec2f,
        @location(3) scale: vec2f,
        @location(4) perVertexColor: vec3f
      }

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f
      }

      @vertex fn vs(
        vert: Vertex
      ) -> VSOutput {
        var vsOut: VSOutput;
        vsOut.position = vec4f(
          vert.position * vert.scale + vert.offset, 0.0, 1.0);
        vsOut.color = vert.color * vec4f(vert.perVertexColor, 1);
        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        return vsOut.color;
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
          arrayStride: 5 * 4,
          attributes: [
            {shaderLocation: 0, offset: 0, format: "float32x2"},
            {shaderLocation: 4, offset: 8, format: "float32x3"}
          ]
        },
        {
          arrayStride: 6 * 4,
          stepMode: "instance",
          attributes: [
            {shaderLocation: 1, offset: 0, format: "float32x4"},
            {shaderLocation: 2, offset: 16, format: "float32x2"}
          ]
        },
        {
          arrayStride: 2 * 4,
          stepMode: "instance",
          attributes: [
            {shaderLocation: 3, offset: 0, format: "float32x2"}
          ]
        }
      ]
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }]
    }
  });

  interface Circle {
    radius: number;
    numSubdivisions: number;
    innerRadius: number;
    startAngle: number;
    endAngle: number;
  }

  function createCircleVerticies(circle: Circle): {vertexData: Float32Array, numVerticies: number} {
    const numVerticies: number = circle.numSubdivisions * 3 * 2;

    const vertexData: Float32Array = new Float32Array(numVerticies * (2 + 3));

    let offset: number = 0;
    
    const addVertex = (x: number, y: number, r: number, g: number, b: number) => {
      vertexData[offset++] = x;
      vertexData[offset++] = y;
      vertexData[offset++] = r;
      vertexData[offset++] = g;
      vertexData[offset++] = b;
    };

    type Color = [number, number, number];
    const innerColor: Color = [1, 1, 1];
    const outerColor: Color = [0.1, 0.1, 0.1]; 

    for (let i = 0; i < circle.numSubdivisions; ++i) {
      const angle1: number = circle.startAngle + (i+0) * (circle.endAngle - circle.startAngle) / circle.numSubdivisions;
      const angle2: number = circle.startAngle + (i+1) * (circle.endAngle - circle.startAngle) / circle.numSubdivisions;

      const c1: number = Math.cos(angle1);
      const s1: number = Math.sin(angle1);
      const c2: number = Math.cos(angle2);
      const s2: number = Math.sin(angle2);

      addVertex(c1 * circle.radius, s1 * circle.radius, ...outerColor);
      addVertex(c2 * circle.radius, s2 * circle.radius, ...outerColor);
      addVertex(c1 * circle.innerRadius, s1 * circle.innerRadius, ...innerColor);

      addVertex(c1 * circle.innerRadius, s1 * circle.innerRadius, ...innerColor);
      addVertex(c2 * circle.radius, s2 * circle.radius, ...outerColor);
      addVertex(c2 * circle.innerRadius, s2 * circle.innerRadius, ...innerColor);
    }

    return {
      vertexData,
      numVerticies
    }
  }

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

  const kNumObjects: number = 100;

  interface ObjectInfo {
    scale: number; 
  }

  const objectInfos: ObjectInfo[] = [];

  const staticUnitSize: number =
    4 * 4 +
    2 * 4;
  const changingUnitSize: number = 
    2 * 4;
  
  const staticVertexBufferSize: number = staticUnitSize * kNumObjects;
  const changingVertexBufferSize: number = changingUnitSize * kNumObjects;
  
  const staticVertexBuffer: GPUBuffer = device!.createBuffer({
    label: "static vertex for objects",
    size: staticVertexBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });

  const changingVertexBuffer: GPUBuffer = device!.createBuffer({
    label: "changing vertex for objects",
    size: changingVertexBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });

  const kColorOffset: number = 0;
  const kOffsetOffset: number = 4;

  const kScaleOffset: number = 0;

  {
    const staticVertexValues: Float32Array = new Float32Array(staticVertexBufferSize / 4);
    for (let i = 0; i < kNumObjects; i++) {
      const staticOffset = i * (staticUnitSize / 4);

      staticVertexValues.set([rand(), rand(), rand()], staticOffset + kColorOffset);
      staticVertexValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);

      objectInfos.push({
        scale: rand(0.2, 0.5)
      });
    }
    device!.queue.writeBuffer(staticVertexBuffer, 0, staticVertexValues);
  }

  const vertexValues: Float32Array = new Float32Array(changingVertexBufferSize / 4);

  const { vertexData, numVerticies } = createCircleVerticies({
    radius: 0.5,
    numSubdivisions: 24,
    innerRadius: 0.25,
    startAngle: 0,
    endAngle: Math.PI * 2
  });

  const vertexBuffer = device!.createBuffer({
    label: "vertex buffer verticies",
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(vertexBuffer, 0, vertexData);

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
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setVertexBuffer(1, staticVertexBuffer);
    pass.setVertexBuffer(2, changingVertexBuffer);

    const aspect = canvas!.width / canvas!.height;

    objectInfos.forEach((info: ObjectInfo, ndx: number) => {
      const offset = ndx * (changingUnitSize / 4)
      vertexValues.set([info.scale / aspect, info.scale], offset + kScaleOffset);
    });    
    device!.queue.writeBuffer(changingVertexBuffer, 0, vertexValues);

    pass.draw(numVerticies, kNumObjects);

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