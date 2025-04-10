export namespace Mat3x3 {
    export type Mat3x3 = [
        number, number, number,
        number, number, number,
        number, number, number
    ];

    export function multiply(a: mat3x3, b: mat3x3): mat3x3 {
        const a00: number = a[0 * 3 + 0];
        const a01: number = a[0 * 3 + 1];
        const a02: number = a[0 * 3 + 2];
        const a10: number = a[1 * 3 + 0];
        const a11: number = a[1 * 3 + 1];
        const a12: number = a[1 * 3 + 2];
        const a20: number = a[2 * 3 + 0];
        const a21: number = a[2 * 3 + 1];
        const a22: number = a[2 * 3 + 2];
        const b00: number = b[0 * 3 + 0];
        const b01: number = b[0 * 3 + 1];
        const b02: number = b[0 * 3 + 2];
        const b10: number = b[1 * 3 + 0];
        const b11: number = b[1 * 3 + 1];
        const b12: number = b[1 * 3 + 2];
        const b20: number = b[2 * 3 + 0];
        const b21: number = b[2 * 3 + 1];
        const b22: number = b[2 * 3 + 2];
        
        return [
            b00 * a00 + b01 * a10 + b02 * a20,
            b00 * a01 + b01 * a11 + b02 * a21,
            b00 * a02 + b01 * a12 + b02 * a22,
            b10 * a00 + b11 * a10 + b12 * a20,
            b10 * a01 + b11 * a11 + b12 * a21,
            b10 * a02 + b11 * a12 + b12 * a22,
            b20 * a00 + b21 * a10 + b22 * a20,
            b20 * a01 + b21 * a11 + b22 * a21,
            b20 * a02 + b21 * a12 + b22 * a22,
        ];
    }

    export function translation([tx, ty]: [number, number]): mat3x3 {
        return [
            1, 0, 0,
            0, 1, 0,
            tx, ty, 1
        ];
    }
    
    export function rotation(angleInRadians: number): mat3x3 {
        const c: number = Math.cos(angleInRadians);
        const s: number = Math.sin(angleInRadians);

        return [
            c, s, 0,
            -s, c, 0,
            0, 0, 1
        ];
    }

    export function scaling([sx, sy]: [number, number]): mat3x3 {
        return [
            sx, 0, 0,
            0, sy, 0,
            0, 0, 1
        ];
    }
}