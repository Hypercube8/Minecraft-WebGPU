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
        @location(4) perVertexColor: vec4f
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
        vsOut.color = vert.color * vert.perVertexColor;
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
          arrayStride: 2 * 4 + 4,
          attributes: [
            {shaderLocation: 0, offset: 0, format: "float32x2"},
            {shaderLocation: 4, offset: 8, format: "unorm8x4"}
          ]
        },
        {
          arrayStride: 4 + 2 * 4,
          stepMode: "instance",
          attributes: [
            {shaderLocation: 1, offset: 0, format: "unorm8x4"},
            {shaderLocation: 2, offset: 4, format: "float32x2"}
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

  function createCircleVerticies(circle: Circle): {vertexData: Float32Array, indexData: Uint32Array, numVerticies: number} {
    const numVerticies: number = (circle.numSubdivisions + 1) * 2;

    const vertexData: Float32Array = new Float32Array(numVerticies * (2 + 1));
    const colorData: Uint8Array = new Uint8Array(vertexData.buffer);

    let offset: number = 0;
    let colorOffset: number = 8;
    
    const addVertex = (x: number, y: number, r: number, g: number, b: number) => {
      vertexData[offset++] = x;
      vertexData[offset++] = y;
      offset++;
      colorData[colorOffset++] = r * 255;
      colorData[colorOffset++] = g * 255;
      colorData[colorOffset++] = b * 255;
      colorOffset += 9;
    };

    type Color = [number, number, number];
    const innerColor: Color = [1, 1, 1];
    const outerColor: Color = [0.1, 0.1, 0.1]; 

    for (let i = 0; i <= circle.numSubdivisions; ++i) {
      const angle: number = circle.startAngle + (i+0) * (circle.endAngle - circle.startAngle) / circle.numSubdivisions;
      
      const c1: number = Math.cos(angle);
      const s1: number = Math.sin(angle);

      addVertex(c1 * circle.radius, s1 * circle.radius, ...outerColor);
      addVertex(c1 * circle.innerRadius, s1 * circle.innerRadius, ...innerColor);
    } 

    const indexData: Uint32Array = new Uint32Array(circle.numSubdivisions * 6);
    let ndx: number = 0;

    for (let i = 0; i < circle.numSubdivisions; ++i) {
      const ndxOffset: number = i * 2;

      indexData[ndx++] = ndxOffset;
      indexData[ndx++] = ndxOffset+1;
      indexData[ndx++] = ndxOffset+2;

      indexData[ndx++] = ndxOffset+2;
      indexData[ndx++] = ndxOffset+1;
      indexData[ndx++] = ndxOffset+3;
    }


    return {
      vertexData,
      indexData,
      numVerticies: indexData.length
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
    4 +
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
  const kOffsetOffset: number = 1;

  const kScaleOffset: number = 0;

  {
    const staticVertexValuesU8: Uint8Array = new Uint8Array(staticVertexBufferSize);
    const staticVertexValuesF32: Float32Array = new Float32Array(staticVertexValuesU8.buffer);
    for (let i = 0; i < kNumObjects; i++) {
      const staticOffsetU8 = i * staticUnitSize;
      const staticOffsetF32 = staticOffsetU8 / 4;

      staticVertexValuesU8.set(
        [rand() * 255, rand() * 255, rand() * 255, 255], 
        staticOffsetU8 + kColorOffset);
      staticVertexValuesF32.set(
        [rand(-0.9, 0.9), rand(-0.9, 0.9)], 
        staticOffsetF32 + kOffsetOffset);

      objectInfos.push({
        scale: rand(0.2, 0.5)
      });
    }
    device!.queue.writeBuffer(staticVertexBuffer, 0, staticVertexValuesF32);
  }

  const vertexValues: Float32Array = new Float32Array(changingVertexBufferSize / 4);

  const { vertexData, indexData, numVerticies } = createCircleVerticies({
    radius: 0.5,
    numSubdivisions: 24,
    innerRadius: 0.25,
    startAngle: 0,
    endAngle: Math.PI * 2
  });

  const vertexBuffer: GPUBuffer = device!.createBuffer({
    label: "vertex buffer",
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(vertexBuffer, 0, vertexData);

  const indexBuffer: GPUBuffer = device!.createBuffer({
    label: "index buffer",
    size: indexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device!.queue.writeBuffer(indexBuffer, 0, indexData);

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
    pass.setIndexBuffer(indexBuffer, "uint32");

    const aspect = canvas!.width / canvas!.height;

    objectInfos.forEach((info: ObjectInfo, ndx: number) => {
      const offset = ndx * (changingUnitSize / 4)
      vertexValues.set([info.scale / aspect, info.scale], offset + kScaleOffset);
    });    
    device!.queue.writeBuffer(changingVertexBuffer, 0, vertexValues);

    pass.drawIndexed(numVerticies, kNumObjects);

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