class VectorLib {
    new(x, y, z) {
        return {x, y, z}
    }

    zero = this.new(0,0,0)

    one = this.new(1, 1, 1)

    add(v1, v2) {
        v1.x += v2.x;
        v1.y += v2.y;
        v1.z += v2.z;
    }

    add2(v1, v2) {
        return {x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z}
    }

    subtract(v1, v2) {
        v1.x -= v2.x;
        v1.y -= v2.y;
        v1.z -= v2.z;
    }

    subtract2(v1, v2) {
        return {x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z}
    }

    dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    cross(v1, v2) {
        return this.new(v1.y * v2.z - v1.z * v2.y, v1.z * v2.x - v1.x * v2.z, v1.x * v2.y - v1.y * v2.x);
    }

    magnitude(v) {
        return Math.sqrt(this.dot(v, v))
    }

    magSquared(v) {
        return this.dot(v, v)
    }

    mult(v, k) {
        v.x *= k;
        v.y *= k;
        v.z *= k;
    }

    mult2(v, k) {
        return {x: v.x * k, y: v.y * k, z: v.z * k}
    }

    multElements(v1, v2) {
        v1.x *= v2.x;
        v1.y *= v2.y;
        v1.z *= v2.z;
    }

    multElements2(v1, v2) {
        return this.new(v1.x * v2.x, v1.y * v2.y, v1.z * v2.z);
    }

    unit(v) {
        this.mult(v, 1 / this.magnitude(v))
    }

    unit2(v) {
        return this.mult2(v, 1 / this.magnitude(v))
    }

    copy(v1, v2) {
        v1.x = v2.x;
        v1.y = v2.y;
        v1.z = v2.z;
    }

    clone(v) {
        return {x: v.x, y: v.y, z: v.z}
    }

    setMagnitude(v, mag) {
        this.mult(v, mag / this.magnitude(v))
    }

    distance(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        const dz = v1.z - v2.z;
        return Math.hypot(dx, dy, dz)
    }

    debug(v) {
        return `(${(v.x).toFixed(2)}, ${(v.y).toFixed(2)}, ${(v.z | 0).toFixed(2)})`;
    }

    round(v) {
        v.x = Math.round(v.x);
        v.y = Math.round(v.y);
        v.z = Math.round(v.z);
    }

    round2(v) {
        return this.new(Math.round(v.x), Math.round(v.y), Math.round(v.z));
    }

    rotate(v, rotationVector) {
        // rotationVector.x = rotation about x-axis, and so on, so in radians

        // using expanded form (multiply rotation matrices for each axis)

        let c_x = Math.cos(rotationVector.x);
        let s_x = Math.sin(rotationVector.x);
        let c_y = Math.cos(rotationVector.y);
        let s_y = Math.sin(rotationVector.y);
        let c_z = Math.cos(rotationVector.z);
        let s_z = Math.sin(rotationVector.z);

        let {x, y, z} = v;

        let newX = x * c_y * c_z + y * (s_x * s_y * c_z - s_z * c_x) + z * (s_x * s_z + s_y * c_x * c_z);

        let newY = x * s_z * c_y + y * (s_x * s_y * s_z + c_x * c_z) + z * (s_y * s_z * c_x - s_x * c_z);

        let newZ = x * (-s_y) + y * s_x * c_y + z * c_x * c_y;

        v.x = newX;
        v.y = newY;
        v.z = newZ;
    }

    rotate2(v, rotationVector) {
        // rotationVector.x = rotation about x-axis, and so on, so in radians

        // using expanded form (multiply rotation matrices for each axis)

        let c_x = Math.cos(rotationVector.x);
        let s_x = Math.sin(rotationVector.x);
        let c_y = Math.cos(rotationVector.y);
        let s_y = Math.sin(rotationVector.y);
        let c_z = Math.cos(rotationVector.z);
        let s_z = Math.sin(rotationVector.z);

        let {x, y, z} = v;

        let newX = x * c_y * c_z + y * (s_x * s_y * c_z - s_z * c_x) + z * (s_x * s_z + s_y * c_x * c_z);

        let newY = x * s_z * c_y + y * (s_x * s_y * s_z + c_x * c_z) + z * (s_y * s_z * c_x - s_x * c_z);

        let newZ = x * (-s_y) + y * s_x * c_y + z * c_x * c_y;

        return this.new(newX, newY, newZ);
    }

    average(...vs) {
        let x, y, z;

        let div = 1 / vs.length;

        for (let v of vs) {
            x += v.x * div;
            y += v.y * div;
            z += v.z * div;
        }

        return {x,y,z};
    }
}

export const Vector = new VectorLib()