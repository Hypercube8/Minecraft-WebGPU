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

    export function fromMat4(m: Mat4x4.Mat4x4, dst: Mat3x3 = zeroes()): Mat3x3 {
        dst[0] = m[0]; dst[1] = m[1]; dst[2] = m[2];
        dst[4] = m[4]; dst[5] = m[5]; dst[6] = m[6];
        dst[8] = m[8]; dst[9] = m[9]; dst[10] = m[10]; 

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

    export function inverse(m: Mat4x4, dst: Mat4x4 = zeroes()): Mat4x4 {
        const m00: number = m[0 * 4 + 0];
        const m01: number = m[0 * 4 + 1];
        const m02: number = m[0 * 4 + 2];
        const m03: number = m[0 * 4 + 3];
        const m10: number = m[1 * 4 + 0];
        const m11: number = m[1 * 4 + 1];
        const m12: number = m[1 * 4 + 2];
        const m13: number = m[1 * 4 + 3];
        const m20: number = m[2 * 4 + 0];
        const m21: number = m[2 * 4 + 1];
        const m22: number = m[2 * 4 + 2];
        const m23: number = m[2 * 4 + 3];
        const m30: number = m[3 * 4 + 0];
        const m31: number = m[3 * 4 + 1];
        const m32: number = m[3 * 4 + 2];
        const m33: number = m[3 * 4 + 3];

        const tmp0: number = m22 * m33;
        const tmp1: number = m32 * m23;
        const tmp2: number = m12 * m33;
        const tmp3: number = m32 * m13;
        const tmp4: number = m12 * m23;
        const tmp5: number = m22 * m13;
        const tmp6: number = m02 * m33;
        const tmp7: number = m32 * m03;
        const tmp8: number = m02 * m23;
        const tmp9: number = m22 * m03;
        const tmp10: number = m02 * m13;
        const tmp11: number = m12 * m03;

        const tmp12: number = m20 * m31;
        const tmp13: number = m30 * m21;
        const tmp14: number = m10 * m31;
        const tmp15: number = m30 * m11;
        const tmp16: number = m10 * m21;
        const tmp17: number = m20 * m11;
        const tmp18: number = m00 * m31;
        const tmp19: number = m30 * m01;
        const tmp20: number = m00 * m21;
        const tmp21: number = m20 * m01;
        const tmp22: number = m00 * m11;
        const tmp23: number = m10 * m01;

        const t0: number = (tmp0 * m11 + tmp3 * m21 + tmp4 * m31) -
                           (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
        const t1: number = (tmp1 * m01 + tmp6 * m21 + tmp9 * m31) -
                           (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
        const t2: number = (tmp2 * m01 + tmp7 * m11 + tmp10 * m31) -
                           (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
        const t3: number = (tmp5 * m01 + tmp8 * m11 + tmp11 * m21) -
                           (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);

        const d: number = 1 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

        dst[0] = d * t0;
        dst[1] = d * t1;
        dst[2] = d * t2;
        dst[3] = d * t3;

        dst[4] = d * ((tmp1 * m10 + tmp2 * m20 + tmp5 * m30) -
                      (tmp0 * m10 + tmp3 * m20 + tmp4 * m30));
        dst[5] = d * ((tmp0 * m00 + tmp7 * m20 + tmp8 * m30) -
                      (tmp1 * m00 + tmp6 * m20 + tmp9 * m30));
        dst[6] = d * ((tmp3 * m00 + tmp6 * m10 + tmp11 * m30) -
                      (tmp2 * m00 + tmp7 * m10 + tmp10 * m30));
        dst[7] = d * ((tmp4 * m00 + tmp9 * m10 + tmp10 * m20) -
                      (tmp5 * m00 + tmp8 * m10 + tmp11 * m20)); 

        dst[8] = d * ((tmp12 * m13 + tmp15 * m23 + tmp16 * m33) -
                      (tmp13 * m13 + tmp14 * m23 + tmp17 * m33));
        dst[9] = d * ((tmp13 * m03 + tmp18 * m23 + tmp21 * m33) -
                      (tmp12 * m03 + tmp19 * m23 + tmp20 * m33));
        dst[10] = d * ((tmp14 * m03 + tmp19 * m13 + tmp22 * m33) -
                       (tmp15 * m03 + tmp18 * m13 + tmp23 * m33));
        dst[11] = d * ((tmp17 * m03 + tmp20 * m13 + tmp23 * m23) -
                       (tmp16 * m03 + tmp21 * m13 + tmp22 * m23));               
        
        dst[12] = d * ((tmp14 * m22 + tmp17 * m32 + tmp13 * m12) -
                       (tmp16 * m32 + tmp12 * m12 + tmp15 * m22));
        dst[13] = d * ((tmp20 * m32 + tmp12 * m02 + tmp19 * m22) -
                       (tmp18 * m22 + tmp21 * m32 + tmp13 * m02));
        dst[14] = d * ((tmp18 * m12 + tmp23 * m32 + tmp15 * m02) -
                       (tmp22 * m32 + tmp14 * m02 + tmp19 * m12));
        dst[15] = d * ((tmp22 * m22 + tmp16 * m02 + tmp21 * m12) -
                       (tmp20 * m12 + tmp23 * m22 + tmp17 * m02)); 

        return dst;
    }

    export function cameraAim(eye: Vec3.Vec3, target: Vec3.Vec3, up: Vec3.Vec3, dst: Mat4x4 = zeroes()): Mat4x4 {
        const zAxis: Vec3.Vec3 = Vec3.normalize(Vec3.subtract(eye, target));
        const xAxis: Vec3.Vec3 = Vec3.normalize(Vec3.cross(up, zAxis));
        const yAxis: Vec3.Vec3 = Vec3.normalize(Vec3.cross(zAxis, xAxis));

        dst[0] = xAxis[0]; dst[1] = xAxis[1]; dst[2] = xAxis[2]; dst[3] = 0;
        dst[4] = yAxis[0]; dst[5] = yAxis[1]; dst[6] = yAxis[2]; dst[7] = 0;
        dst[8] = zAxis[0]; dst[9] = zAxis[1]; dst[10] = zAxis[2]; dst[11] = 0;
        dst[12] = eye[0]; dst[13] = eye[1]; dst[14] = eye[2]; dst[15] = 1;

        return dst;
    }

    export function lookAt(eye: Vec3.Vec3, target: Vec3.Vec3, up: Vec3.Vec3, dst?: Mat4x4): Mat4x4 {
        return Mat4x4.inverse(Mat4x4.cameraAim(eye, target, up, dst), dst);
    }

    export function aim(eye: Vec3.Vec3, target: Vec3.Vec3, up: Vec3.Vec3, dst: Mat4x4 = zeroes()): Mat4x4 {
        const zAxis: Vec3.Vec3 = Vec3.normalize(Vec3.subtract(target, eye));
        const xAxis: Vec3.Vec3 = Vec3.normalize(Vec3.cross(up, zAxis));
        const yAxis: Vec3.Vec3 = Vec3.normalize(Vec3.cross(zAxis, xAxis));

        dst[0] = xAxis[0]; dst[1] = xAxis[1]; dst[2] = xAxis[2]; dst[3] = 0;
        dst[4] = yAxis[0]; dst[5] = yAxis[1]; dst[6] = yAxis[2]; dst[7] = 0;
        dst[8] = zAxis[0]; dst[9] = zAxis[1]; dst[10] = zAxis[2]; dst[11] = 0;
        dst[12] = eye[0]; dst[13] = eye[1]; dst[14] = eye[2]; dst[15] = 1;

        return dst;
    }

    export function transpose(m: Mat4x4, dst: Mat4x4 = zeroes()): Mat4x4 {
        dst[0] = m[0]; dst[1] = m[4]; dst[2] = m[8]; dst[3] = m[12];
        dst[4] = m[1]; dst[5] = m[5]; dst[6] = m[9]; dst[7] = m[13];
        dst[8] = m[2]; dst[9] = m[6]; dst[10] = m[10]; dst[11] = m[14];
        dst[12] = m[3]; dst[13] = m[7]; dst[14] = m[11]; dst[15] = m[15];

        return dst;
    }
}

export namespace Vec3 {
    export type Vec3 = [number, number, number];

    export function zeroes(): Vec3 {
        return [0, 0, 0];
    }

    export function subtract(a: Vec3, b: Vec3, dst: Vec3 = zeroes()): Vec3 {
        dst[0] = a[0] - b[0];
        dst[1] = a[1] - b[1];
        dst[2] = a[2] - b[2];

        return dst;
    }

    export function cross(a: Vec3, b: Vec3, dst: Vec3 = zeroes()): Vec3 {
        const t0: number = a[1] * b[2] - a[2] * b[1];
        const t1: number = a[2] * b[0] - a[0] * b[2];
        const t2: number = a[0] * b[1] - a[1] * b[0];
        
        dst[0] = t0;
        dst[1] = t1;
        dst[2] = t2;

        return dst;
    }

    export function normalize(v: Vec3, dst: Vec3 = zeroes()): Vec3 {
        const length: number = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

        if (length > 0.00001) {
            dst[0] = v[0] / length;
            dst[1] = v[1] / length;
            dst[2] = v[2] / length;
        } else {
            dst[0] = 0;
            dst[1] = 0;
            dst[2] = 0;
        }

        return dst;
    }
}