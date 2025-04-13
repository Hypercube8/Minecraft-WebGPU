export namespace Mat3x3 {
    export type Mat3x3 = [
        number, number, number, number,
        number, number, number, number,
        number, number, number, number
    ];

    export const zeroes: Mat3x3 = [
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ];

    export const identity: Mat3x3 = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0
    ];

    export function multiply(a: Mat3x3, b: Mat3x3, dst: Mat3x3 = zeroes): Mat3x3 {
        const a00: number = a[0 * 4 + 0];
        const a01: number = a[0 * 4 + 1];
        const a02: number = a[0 * 4 + 2];
        const a10: number = a[1 * 4 + 0];
        const a11: number = a[1 * 4 + 1];
        const a12: number = a[1 * 4 + 2];
        const a20: number = a[2 * 4 + 0];
        const a21: number = a[2 * 4 + 1];
        const a22: number = a[2 * 4 + 2];
        const b00: number = b[0 * 4 + 0];
        const b01: number = b[0 * 4 + 1];
        const b02: number = b[0 * 4 + 2];
        const b10: number = b[1 * 4 + 0];
        const b11: number = b[1 * 4 + 1];
        const b12: number = b[1 * 4 + 2];
        const b20: number = b[2 * 4 + 0];
        const b21: number = b[2 * 4 + 1];
        const b22: number = b[2 * 4 + 2];
    
        dst[0] = b00 * a00 + b01 * a10 + b02 * a20;
        dst[1] = b00 * a01 + b01 * a11 + b02 * a21;
        dst[2] = b00 * a02 + b01 * a12 + b02 * a22,

        dst[4] = b10 * a00 + b11 * a10 + b12 * a20;
        dst[5] = b10 * a01 + b11 * a11 + b12 * a21;
        dst[6] = b10 * a02 + b11 * a12 + b12 * a22;

        dst[8] = b20 * a00 + b21 * a10 + b22 * a20;
        dst[9] = b20 * a01 + b21 * a11 + b22 * a21;
        dst[10] = b20 * a02 + b21 * a12 + b22 * a22;
        return dst;
    }

    export function translation([tx, ty]: [number, number], dst: Mat3x3 = zeroes): Mat3x3 {
        dst[0] = 1; dst[1] = 0; dst[2] = 0;
        dst[4] = 0; dst[5] = 1; dst[6] = 0;
        dst[8] = tx; dst[9] = ty; dst[10] = 1;
        return dst;
    }

    export function translate(m: Mat3x3, translation: [number, number], dst?: Mat3x3) {
        return Mat3x3.multiply(m, Mat3x3.translation(translation), dst);
    }
    
    export function rotation(angleInRadians: number, dst: Mat3x3 = zeroes): Mat3x3 {
        const c: number = Math.cos(angleInRadians);
        const s: number = Math.sin(angleInRadians);

       dst[0] = c; dst[1] = s; dst[2] = 0;
       dst[4] = -s; dst[5] = c; dst[6] = 0;
       dst[8] = 0; dst[9] = 0; dst[10] = 1;
       return dst;
    }

    export function rotate(m: Mat3x3, angleInRadians: number, dst?: Mat3x3): Mat3x3 {
        return Mat3x3.multiply(m, Mat3x3.rotation(angleInRadians), dst);
    }

    export function scaling([sx, sy]: [number, number], dst: Mat3x3 = zeroes): Mat3x3 {
        dst[0] = sx; dst[1] = 0; dst[2] = 0;
        dst[4] = 0; dst[5] = sy; dst[6] = 0;
        dst[8] = 0; dst[9] = 0; dst[10] = 1;
        return dst;
    }

    export function scale(m: Mat3x3, scale: [number, number], dst?: Mat3x3): Mat3x3 {
        return Mat3x3.multiply(m, Mat3x3.scaling(scale), dst);
    }

    export function projection(width: number, height: number, dst: Mat3x3 = zeroes): Mat3x3 {
        dst[0] = 2 / width; dst[1] = 0; dst[2] = 0;
        dst[4] = 0; dst[5] = -2 / height; dst[6] = 0;
        dst[8] = -1; dst[9] = 1; dst[10] = 1;
        return dst; 
    } 
}