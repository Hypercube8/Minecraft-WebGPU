export namespace Mat3x3 {
    export type Mat3x3 = [
        number, number, number, number,
        number, number, number, number,
        number, number, number, number
    ];

    export function zeroes(): Mat3x3 {
        return [
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0
        ];
    }

    export function identity(): Mat3x3 {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0
        ];
    }

    export function multiply(a: Mat3x3, b: Mat3x3, dst: Mat3x3 = zeroes()): Mat3x3 {
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
        dst[2] = b00 * a02 + b01 * a12 + b02 * a22;

        dst[4] = b10 * a00 + b11 * a10 + b12 * a20;
        dst[5] = b10 * a01 + b11 * a11 + b12 * a21;
        dst[6] = b10 * a02 + b11 * a12 + b12 * a22;

        dst[8] = b20 * a00 + b21 * a10 + b22 * a20;
        dst[9] = b20 * a01 + b21 * a11 + b22 * a21;
        dst[10] = b20 * a02 + b21 * a12 + b22 * a22;
        return dst;
    }

    export function translation([tx, ty]: [number, number], dst: Mat3x3 = zeroes()): Mat3x3 {
        dst[0] = 1; dst[1] = 0; dst[2] = 0;
        dst[4] = 0; dst[5] = 1; dst[6] = 0;
        dst[8] = tx; dst[9] = ty; dst[10] = 1;
        return dst;
    }

    export function translate(m: Mat3x3, translation: [number, number], dst?: Mat3x3) {
        return Mat3x3.multiply(m, Mat3x3.translation(translation), dst);
    }
    
    export function rotation(angleInRadians: number, dst: Mat3x3 = zeroes()): Mat3x3 {
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

    export function scaling([sx, sy]: [number, number], dst: Mat3x3 = zeroes()): Mat3x3 {
        dst[0] = sx; dst[1] = 0; dst[2] = 0;
        dst[4] = 0; dst[5] = sy; dst[6] = 0;
        dst[8] = 0; dst[9] = 0; dst[10] = 1;
        return dst;
    }

    export function scale(m: Mat3x3, scale: [number, number], dst?: Mat3x3): Mat3x3 {
        return Mat3x3.multiply(m, Mat3x3.scaling(scale), dst);
    }

    export function projection(width: number, height: number, dst: Mat3x3 = zeroes()): Mat3x3 {
        dst[0] = 2 / width; dst[1] = 0; dst[2] = 0;
        dst[4] = 0; dst[5] = -2 / height; dst[6] = 0;
        dst[8] = -1; dst[9] = 1; dst[10] = 1;
        return dst; 
    } 
}

export namespace Mat4x4 {
    export type Mat4x4 = [
        number, number, number, number,
        number, number, number, number,
        number, number, number, number,
        number, number, number, number
    ];

    export function zeroes(): Mat4x4 {
        return [
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0
        ];
    }

    export function identity(): Mat4x4 {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    }

    export function multiply(a: Mat4x4, b: Mat4x4, dst: Mat4x4 = zeroes()): Mat4x4 {
        const b00: number = b[0 * 4 + 0];
        const b01: number = b[0 * 4 + 1];
        const b02: number = b[0 * 4 + 2];
        const b03: number = b[0 * 4 + 3];
        const b10: number = b[1 * 4 + 0];
        const b11: number = b[1 * 4 + 1];
        const b12: number = b[1 * 4 + 2];
        const b13: number = b[1 * 4 + 3];
        const b20: number = b[2 * 4 + 0];
        const b21: number = b[2 * 4 + 1];
        const b22: number = b[2 * 4 + 2];
        const b23: number = b[2 * 4 + 3];
        const b30: number = b[3 * 4 + 0];
        const b31: number = b[3 * 4 + 1];
        const b32: number = b[3 * 4 + 2];
        const b33: number = b[3 * 4 + 3];
        const a00: number = a[0 * 4 + 0];
        const a01: number = a[0 * 4 + 1];
        const a02: number = a[0 * 4 + 2];
        const a03: number = a[0 * 4 + 3];
        const a10: number = a[1 * 4 + 0];
        const a11: number = a[1 * 4 + 1];
        const a12: number = a[1 * 4 + 2];
        const a13: number = a[1 * 4 + 3];
        const a20: number = a[2 * 4 + 0];
        const a21: number = a[2 * 4 + 1];
        const a22: number = a[2 * 4 + 2];
        const a23: number = a[2 * 4 + 3];
        const a30: number = a[3 * 4 + 0];
        const a31: number = a[3 * 4 + 1];
        const a32: number = a[3 * 4 + 2];
        const a33: number = a[3 * 4 + 3];

        dst[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
        dst[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
        dst[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
        dst[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;

        dst[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
        dst[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
        dst[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
        dst[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;

        dst[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
        dst[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
        dst[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
        dst[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;

        dst[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
        dst[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
        dst[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
        dst[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;

        return dst;
    }

    export function translation([tx, ty, tz]: [number, number, number], dst: Mat4x4 = zeroes()): Mat4x4 {
        dst[0] = 1; dst[1] = 0; dst[2] = 0; dst[3] = 0;
        dst[4] = 0; dst[5] = 1; dst[6] = 0; dst[7] = 0;
        dst[8] = 0; dst[9] = 0; dst[10] = 1; dst[11] = 0;
        dst[12] = tx; dst[13] = ty; dst[14] = tz; dst[15] = 1;
        return dst;
    }

    export function translate(m: Mat4x4, translation: [number, number, number], dst?: Mat4x4): Mat4x4 {
        return Mat4x4.multiply(m, Mat4x4.translation(translation), dst);
    }

    export function rotationX(angleInRadians: number, dst: Mat4x4 = zeroes()): Mat4x4 {
        const c: number = Math.cos(angleInRadians);
        const s: number = Math.sin(angleInRadians);
        dst[0] = 1; dst[1] = 0; dst[2] = 0; dst[3] = 0;
        dst[4] = 0; dst[5] = c; dst[6] = s; dst[7] = 0;
        dst[8] = 0; dst[9] = -s; dst[10] = c; dst[11] = 0;
        dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;
        return dst;
    }

    export function rotateX(m: Mat4x4, angleInRadians: number, dst?: Mat4x4): Mat4x4 {
        return Mat4x4.multiply(m, Mat4x4.rotationX(angleInRadians), dst);
    }

    export function rotationY(angleInRadians: number, dst: Mat4x4 = zeroes()): Mat4x4 {
        const c: number = Math.cos(angleInRadians);
        const s: number = Math.sin(angleInRadians);
        dst[0] = c; dst[1] = 0; dst[2] = -s; dst[3] = 0;
        dst[4] = 0; dst[5] = 1; dst[6] = 0; dst[7] = 0;
        dst[8] = s; dst[9] = 0; dst[10] = c; dst[11] = 0;
        dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;
        return dst;
    }

    export function rotateY(m: Mat4x4, angleInRadians: number, dst?: Mat4x4): Mat4x4 {
        return Mat4x4.multiply(m, Mat4x4.rotationY(angleInRadians), dst);
    }

    export function rotationZ(angleInRadians: number, dst: Mat4x4 = zeroes()): Mat4x4 {
        const c: number = Math.cos(angleInRadians);
        const s: number = Math.sin(angleInRadians);
        dst[0] = c; dst[1] = s; dst[2] = 0; dst[3] = 0;
        dst[4] = -s; dst[5] = c; dst[6] = 0; dst[7] = 0;
        dst[8] = 0; dst[9] = 0; dst[10] = 1; dst[11] = 0;
        dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;
        return dst;
    }

    export function rotateZ(m: Mat4x4, angleInRadians: number, dst?: Mat4x4): Mat4x4 {
        return Mat4x4.multiply(m, Mat4x4.rotationZ(angleInRadians), dst);
    }

    export function scaling([sx, sy, sz]: [number, number, number], dst: Mat4x4 = zeroes()): Mat4x4 {
        dst[0] = sx; dst[1] = 0; dst[2] = 0; dst[3] = 0;
        dst[4] = 0; dst[5] = sy; dst[6] = 0; dst[7] = 0;
        dst[8] = 0; dst[9] = 0; dst[10] = sz; dst[11] = 0;
        dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;
        return dst;
    }

    export function scale(m: Mat4x4, scale: [number, number, number], dst?: Mat4x4): Mat4x4 {
        return Mat4x4.multiply(m, Mat4x4.scaling(scale), dst);
    }

    export function ortho(left: number, right: number, bottom: number, top: number, near: number, far: number, dst: Mat4x4 = zeroes()): Mat4x4 {
        dst[0] = 2 / (right - left); 
        dst[1] = 0; 
        dst[2] = 0; 
        dst[3] = 0;

        dst[4] = 0; 
        dst[5] = 2 / (top - bottom); 
        dst[6] = 0; 
        dst[7] = 0;

        dst[8] = 0; 
        dst[9] = 0;
        dst[10] = 1 / (near - far); 
        dst[11] = 0;

        dst[12] = (right + left) / (left - right); 
        dst[13] = (top + bottom) / (bottom - top); 
        dst[14] = near / (near - far);
        dst[15] = 1;
        
        return dst;
    }

    export function perspective(fieldOfViewYInRadians: number, aspect: number, zNear: number, zFar: number, dst: Mat4x4 = zeroes()): Mat4x4 {
        const f: number = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewYInRadians);
        const rangeInv: number = 1 / (zNear - zFar);

        dst[0] = f / aspect;
        dst[1] = 0;
        dst[2] = 0;
        dst[3] = 0;

        dst[4] = 0;
        dst[5] = f;
        dst[6] = 0;
        dst[7] = 0;

        dst[8] = 0;
        dst[9] = 0;
        dst[10] = zFar * rangeInv;
        dst[11] = -1;

        dst[12] = 0;
        dst[13] = 0;
        dst[14] = zNear * zFar * rangeInv;
        dst[15] = 0;

        return dst;
    }
}