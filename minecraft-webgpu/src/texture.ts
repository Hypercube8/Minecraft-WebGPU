import { MipMapping } from "./mipmapping";

export namespace Texture {
    export type ImageSource = ImageBitmap |
                              HTMLCanvasElement |
                              HTMLVideoElement

    export function getSourceSize(source: ImageSource): number[] {
        if ("videoWidth" in source) {
            return [
                source.videoWidth,
                source.videoHeight
            ]
        } else {
            return [
                source.width,
                source.height
            ]
        }
    }

    export async function loadImageBitmap(url: string): Promise<ImageBitmap> {
        const res: Response = await fetch(url);
        const blob: Blob = await res.blob();
        return await createImageBitmap(blob, { colorSpaceConversion: "none" });
    }

    export interface TextureOptions {
        flipY: boolean,
        mips: boolean
    }

    export function copySourceToTexture(device: GPUDevice, texture: GPUTexture, source: ImageSource, options: Partial<TextureOptions>) {
        copySourcesToTexture(device, texture, [source], options);
    }

    export function copySourcesToTexture(device: GPUDevice, texture: GPUTexture, sources: ImageSource[], options: Partial<TextureOptions>) {
        sources.forEach((source, layer) => {
            device.queue.copyExternalImageToTexture(
                { source, flipY: options.flipY },
                { texture, origin: [0, 0, layer] },
                getSourceSize(source)
            );
        });

        if (texture.mipLevelCount > 1) {
            MipMapping.generateMips(device, texture);
        }
    }

    export function createTextureFromSource(device: GPUDevice, source: ImageSource, options: Partial<TextureOptions>) {
        createTextureFromSources(device, [source], options);
    }

    export function createTextureFromSources(device: GPUDevice, sources: ImageSource[], options: Partial<TextureOptions>): GPUTexture {
        const source: ImageSource = sources[0];
        const size: number[] = getSourceSize(source);
        const texture: GPUTexture = device!.createTexture({
            format: "rgba8unorm",
            mipLevelCount: options.mips ? MipMapping.numMipLevels(...size) : 1,
            size: [size[0], size[1], sources.length],
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT
        });
        copySourcesToTexture(device, texture, sources, options);
        return texture;
    }

    export async function createTextureFromImage(device: GPUDevice, url: string, options: Partial<TextureOptions>) {
        const imgBitmap: ImageBitmap = await loadImageBitmap(url);
        return createTextureFromSources(device, [imgBitmap], options);
    }
}