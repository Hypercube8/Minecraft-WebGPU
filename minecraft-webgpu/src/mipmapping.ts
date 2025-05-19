import mipmappingShader from "/shaders/mipmapping.wgsl?raw"

export namespace MipMapping {
    let sampler: GPUSampler;
    let module: GPUShaderModule;
    const pipelineByFormat: Map<GPUTextureFormat, GPURenderPipeline> = new Map<GPUTextureFormat, GPURenderPipeline>();

    export const numMipLevels = (...sizes: number[]) => {
        const maxSize: number = Math.max(...sizes);
        return 1 + Math.log2(maxSize) | 0;
    }

    export function generateMips(device: GPUDevice, texture: GPUTexture) {
        if (!module) {
            module = device.createShaderModule({
                label: "textured quad shaders for mip level generation",
                code: mipmappingShader
            });

            sampler = device.createSampler({
                minFilter: "linear"
            });
        }

        if (!pipelineByFormat.get(texture.format)) {
            pipelineByFormat.set(texture.format, device.createRenderPipeline({
                label: "mip level generator pipeline",
                layout: "auto",
                vertex: {
                    module
                },
                fragment: {
                    module,
                    targets: [{ format: texture.format }]
                }
              })
            );
        }

        const pipeline: GPURenderPipeline | undefined = pipelineByFormat.get(texture.format);
        
        const encoder: GPUCommandEncoder = device.createCommandEncoder({
            label: "mip gen encoder"
        });

        for (let baseMipLevel = 1; baseMipLevel < texture.mipLevelCount; ++baseMipLevel) {
            for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
                const bindGroup: GPUBindGroup = device.createBindGroup({
                    layout: pipeline!.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: sampler },
                        { 
                            binding: 1,
                            resource: texture.createView({
                                dimension: "2d",
                                baseMipLevel: baseMipLevel - 1,
                                mipLevelCount: 1,
                                baseArrayLayer: layer,
                                arrayLayerCount: 1
                            })
                        }
                    ]
                });

                const renderPassDescriptor: GPURenderPassDescriptor = {
                    label: "our basic canvas renderPass",
                    colorAttachments: [
                        {
                            view: texture.createView({
                                dimension: "2d",
                                baseMipLevel,
                                mipLevelCount: 1,
                                baseArrayLayer: layer,
                                arrayLayerCount: 1
                            }),
                            loadOp: "clear",
                            storeOp: "store"
                        }
                    ]
                }

                const pass: GPURenderPassEncoder = encoder.beginRenderPass(renderPassDescriptor);
                pass.setPipeline(pipeline!);
                pass.setBindGroup(0, bindGroup);
                pass.draw(6);
                pass.end();
            }
        }
        const commandBuffer: GPUCommandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    }
}