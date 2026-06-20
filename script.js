import { Vector } from "./vector3.js";

const CANVAS_EL = document.getElementById('canvas');

CANVAS_EL.width = innerWidth;
CANVAS_EL.height = innerHeight;

const CANVAS = Vector.new(innerWidth, innerHeight, 0);

const CENTRE = Vector.mult2(CANVAS, 0.5);

const CENTRE_NEGATIVE = Vector.mult2(CENTRE, -1);

const CAMERA = Vector.new(0, 0, 0);

const CAMERA_DIRECTION = Vector.new(0, 0, 1);

const VIEWPORT = Vector.new(1.2, 1, 0);

const VIEWPORT_DISTANCE = 1;

const CONVERSION = Vector.new(CANVAS.x / VIEWPORT.x, CANVAS.y / VIEWPORT.y);

const RED = {r: 255, g: 0, b: 0};

const GREEN = {r: 0, g: 255, b: 0};

const BLUE = {r: 0, g: 0, b: 255};

const BLACK = {r: 0, g: 0, b: 0};

const YELLOW = {r: 255, g: 215, b: 0};

const PURPLE = {r: 128, g: 0, b: 128};

const CYAN = {r: 0, g: 255, b: 255};

const ctx = CANVAS_EL.getContext('2d');

const PIXEL_SIZE = 1;

const DEPTH_BUFFER = [];

const IMAGE_BUFFER = ctx.createImageData(CANVAS.x, CANVAS.y);

for (let x = 0; x < CANVAS.x; x++) {

    for (let y = 0; y < CANVAS.y; y++) {
        let i = getIndex(x, y);

        DEPTH_BUFFER[i] = Infinity;

        i *= 4;

        IMAGE_BUFFER.data[i] = IMAGE_BUFFER.data[i + 1] = IMAGE_BUFFER.data[i + 2] = IMAGE_BUFFER.data[i + 3] = 0;
    }
}

function getIndex(x, y) {
    return y * CANVAS.x + x;
}

const PLANES = [ // [normal, offset]
    [Vector.new(0,0,1), -VIEWPORT_DISTANCE],
    [Vector.new(Math.SQRT1_2, 0, Math.SQRT1_2), 0],
    [Vector.new(-Math.SQRT1_2, 0, Math.SQRT1_2), 0]
];

ctx.translate(0, CANVAS.y);
ctx.scale(1, -1);

ctx.font = '30px Arial';

function viewportToCanvas(x, y) {
    return {
        x: Math.round(x * CONVERSION.x), 
        y: Math.round(y * CONVERSION.y)
    };
}

function projectVertex(v) {
    let mult = VIEWPORT_DISTANCE / v.z;

    let proj = viewportToCanvas(v.x * mult, v.y * mult);
    proj.z = 1/v.z;

    return proj;
}

function interpolate(x0, y0, x1, y1) {
    if (x0 == x1) return [y0];
    let values = [];

    let m = (y1 - y0) / (x1 - x0);

    let y = y0;

    for (let x = x0; x <= x1; x++) {
        values.push(y);
        y += m;
    }

    return values;
}

// Drawing

function drawLine(po0, po1, colour = BLACK) {
    let p0 = Vector.round2(po0);
    let p1 = Vector.round2(po1);
    let dx = p1.x - p0.x;
    let dy = p1.y - p0.y;

    let {r, g, b} = colour;

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

    if (Math.abs(dx) >= Math.abs(dy)) {
        // closer to horizontal
        if (dx < 0) {
            [p0, p1] = [p1, p0]
            dx *= -1;
            dy *= -1;
        }

        let y_values = interpolate(p0.x, p0.y, p1.x, p1.y);

        for (let x = p0.x; x <= p1.x; x++) {
            if (x > CENTRE.x) break;
            if (x < CENTRE_NEGATIVE.x) continue;
            let y = y_values[x - p0.x];
            if (y > CENTRE.y) break;
            if (y < CENTRE_NEGATIVE.y) continue;
            ctx.fillRect(Math.round(x + CENTRE.x), Math.round(y + CENTRE.y), PIXEL_SIZE, PIXEL_SIZE);
        }
    }
    else {
        // closer to vertical
        if (dy < 0) {
            [p0, p1] = [p1, p0];
            dx *= -1;
            dy *= -1;
        }

        let x_values = interpolate(p0.y, p0.x, p1.y, p1.x);

        for (let y = p0.y; y <= p1.y; y++) {
            if (y > CENTRE.y) break;
            if (y < CENTRE_NEGATIVE.y) continue;
            let x = x_values[y - p0.y];
            if (x > CENTRE.x) break;
            if (x < CENTRE_NEGATIVE.x) continue;
            ctx.fillRect(Math.round(x + CENTRE.x), Math.round(y + CENTRE.y), PIXEL_SIZE, PIXEL_SIZE);
            //console.log(x + CENTRE.x, y + CENTRE.y);
        }
    }
}

function drawTriangleWireframe(p0, p1, p2, colour = BLACK) {
    drawLine(p0, p1, colour);
    drawLine(p1, p2, colour);
    drawLine(p2, p0, colour);
}

function drawFilledTriangle(p0, p1, p2, colour = RED) {
    // Ensure p0.y <= p1.y <= p2.y
    if (p1.y < p0.y) [p0, p1] = [p1, p0];
    if (p2.y < p0.y) [p0, p2] = [p2, p0];
    if (p2.y < p1.y) [p1, p2] = [p2, p1];

    // therefore, 1 'tall' side from p0 to p2, 2 'short' sides
    let x_0_1 = interpolate(p0.y, p0.x, p1.y, p1.x);
    let x_1_2 = interpolate(p1.y, p1.x, p2.y, p2.x);
    let x_0_2 = interpolate(p0.y, p0.x, p2.y, p2.x);

    // repeated value (last element of x_0_1 and first element of x_1_2)
    let x_0_1_2 = x_0_1.slice(0, -1).concat(x_1_2);

    //let middleIndex = Math.floor(x_0_2.length * 0.5);

    let x_left, x_right;
    
    let {r, g, b} = colour;

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;

    for (let y = p0.y; y < p2.y; y++) {
        if (y > CENTRE.y) return;
        if (y < -CENTRE.y) continue;
        let index = y - p0.y;
        x_left = Math.min(x_0_2[index], x_0_1_2[index]);
        x_right = Math.max(x_0_2[index], x_0_1_2[index]);
        for (let x = x_left; x <= x_right; x++) {
            if (x > CENTRE.x) return;
            if (x < -CENTRE.x) continue;
            ctx.fillRect(Math.round(x + CENTRE.x), Math.round(y + CENTRE.y), PIXEL_SIZE, PIXEL_SIZE);
        }
    }
}

function drawShadedTriangle(p0, p1, p2, colour = GREEN) {
    // Ensure p0.y <= p1.y <= p2.y
    // p.z = colour intensity at that point
    if (p1.y < p0.y) [p0, p1] = [p1, p0];
    if (p2.y < p0.y) [p0, p2] = [p2, p0];
    if (p2.y < p1.y) [p1, p2] = [p2, p1];

    console.log('bottom to top:', p0.name, p1.name, p2.name);

    // therefore, 1 'tall' side from p0 to p2, 2 'short' sides
    let x_0_1 = interpolate(p0.y, p0.x, p1.y, p1.x);
    let i_0_1 = interpolate(p0.y, p0.z, p1.y, p1.z);

    let x_1_2 = interpolate(p1.y, p1.x, p2.y, p2.x);
    let i_1_2 = interpolate(p1.y, p1.z, p2.y, p2.z);

    let x_0_2 = interpolate(p0.y, p0.x, p2.y, p2.x);
    let i_0_2 = interpolate(p0.y, p0.z, p2.y, p2.z);

    // same as in drawFilledTriangle - repeated value in both x and i for the short sides

    x_0_1.pop()

    let x_0_1_2 = x_0_1.concat(x_1_2);

    i_0_1.pop()

    let i_0_1_2 = i_0_1.concat(i_1_2);

    let {r, g, b} = colour;

    for (let y = p0.y; y <= p2.y; y++) {
        let index = y - p0.y;

        let x_l, x_r, i_l, i_r;

        let min = Math.min(x_0_2[index], x_0_1_2[index])

        if (min == x_0_2[index]) {
            x_l = x_0_2[index];
            x_r = x_0_1_2[index];
            i_l = i_0_2[index];
            i_r = i_0_1_2[index];
        }
        else {
            x_l = x_0_1_2[index];
            x_r = x_0_2[index];
            i_l = i_0_1_2[index];
            i_r = i_0_2[index];
        }

        let i_values = interpolate(x_l, i_l, x_r, i_r);

        for (let x = x_l; x <= x_r; x++) {
            let x_index = x - x_l;
            let i = i_values[x_index];

            ctx.fillStyle = `rgb(${r * i}, ${g * i}, ${b * i})`;

            ctx.fillRect(Math.round(x + CENTRE.x), Math.round(y + CENTRE.y), PIXEL_SIZE, PIXEL_SIZE);
        }
    }
}

function drawFilledDepthTriangle(p0, p1, p2, colour = GREEN) {
    // Ensure p0.y <= p1.y <= p2.y
    // p.z = colour intensity at that point
    if (p1.y < p0.y) [p0, p1] = [p1, p0];
    if (p2.y < p0.y) [p0, p2] = [p2, p0];
    if (p2.y < p1.y) [p1, p2] = [p2, p1];

    // therefore, 1 'tall' side from p0 to p2, 2 'short' sides
    let x_0_1 = interpolate(p0.y, p0.x, p1.y, p1.x);
    let i_0_1 = interpolate(p0.y, p0.z, p1.y, p1.z);

    let x_1_2 = interpolate(p1.y, p1.x, p2.y, p2.x);
    let i_1_2 = interpolate(p1.y, p1.z, p2.y, p2.z);

    let x_0_2 = interpolate(p0.y, p0.x, p2.y, p2.x);
    let i_0_2 = interpolate(p0.y, p0.z, p2.y, p2.z);

    // same as in drawFilledTriangle - repeated value in both x and i for the short sides

    x_0_1.pop()

    let x_0_1_2 = x_0_1.concat(x_1_2);

    i_0_1.pop()

    let i_0_1_2 = i_0_1.concat(i_1_2);

    let {r, g, b} = colour;
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

    for (let y = p0.y; y <= p2.y; y++) {
        let index = y - p0.y;
        
        let cy = Math.round(y + CENTRE.y);

        if (cy >= CANVAS.y) break;
        if (cy < 0) continue;

        let x_l, x_r, i_l, i_r;

        let min = Math.min(x_0_2[index], x_0_1_2[index])

        if (min == x_0_2[index]) {
            x_l = x_0_2[index];
            x_r = x_0_1_2[index];
            i_l = i_0_2[index];
            i_r = i_0_1_2[index];
        }
        else {
            x_l = x_0_1_2[index];
            x_r = x_0_2[index];
            i_l = i_0_1_2[index];
            i_r = i_0_2[index];
        }

        x_l = Math.round(x_l)
        x_r = Math.round(x_r)

        let i_values = interpolate(x_l, i_l, x_r, i_r);

        for (let x = x_l; x <= x_r; x++) {
            let x_index = x - x_l;
            let i = i_values[x_index];

            let cx = Math.round(x + CENTRE.x);

            if (cx >= CANVAS.x) break;
            if (cx < 0) continue;
            
            let index = getIndex(cx, cy);

            if (i <= DEPTH_BUFFER[index]) continue;

            DEPTH_BUFFER[index] = i;

            index *= 4;

            IMAGE_BUFFER.data[index] = r;
            IMAGE_BUFFER.data[index + 1] = g;
            IMAGE_BUFFER.data[index + 2] = b;
            IMAGE_BUFFER.data[index + 3] = 255;
            //ctx.fillRect(cx, cy, PIXEL_SIZE, PIXEL_SIZE);
        }
    }
}

function drawDot(dot) {
    ctx.fillStyle = 'red';
    ctx.fillText(dot.name, dot.x + CENTRE.x, dot.y + CENTRE.y);
}

function render3D(vertices, triangles, translateVector = null, scaleVector = null) {
    let projected = [];

    for (let v of vertices) {
        let realV = v;
        if (scaleVector) {
            realV = Vector.mult2(v, scaleVector);
        }

        if (translateVector) {
            realV = Vector.add2(realV, translateVector)
        }

        projected.push(projectVertex(realV))
    }

    for (let t of triangles) {
        let [index0, index1, index2, colour] = t;

        let p0 = vertices[index0]
        let p1 = vertices[index1]
        let p2 = vertices[index2]

        let v1 = Vector.subtract2(p1, p0);
        let v2 = Vector.subtract2(p2, p0);
        let normal = Vector.cross(v1, v2);

        if (Vector.dot(normal, CAMERA_DIRECTION) > 0) continue; // normal should point towards the camera - in opposite direction to CAMERA_DIRECTION

        drawFilledDepthTriangle(projected[index0], projected[index1], projected[index2], colour);
    }
}

const cube = {
    vertices: [
        Vector.new(0.5, 0.5, 0.5),
        Vector.new(-0.5, 0.5, 0.5),
        Vector.new(-0.5, -0.5, 0.5),
        Vector.new(0.5, -0.5, 0.5),
        Vector.new(0.5, 0.5, -0.5),
        Vector.new(-0.5, 0.5, -0.5),
        Vector.new(-0.5, -0.5, -0.5),
        Vector.new(0.5, -0.5, -0.5)
    ],
    
    triangles: [
        [0, 1, 2, RED],
        [0, 2, 3, RED],
        [4, 0, 3, GREEN],
        [4, 3, 7, GREEN],
        [5, 4, 7, BLUE],
        [5, 7, 6, BLUE],
        [1, 5, 6, YELLOW],
        [1, 6, 2, YELLOW],
        [4, 5, 1, PURPLE],
        [4, 1, 0, PURPLE],
        [2, 6, 7, CYAN],
        [2, 7, 3, CYAN]
    ],

    r: 1
}

const pyramid = {
    vertices: [
        Vector.new(0.5, -0.5, 0.5),
        Vector.new(0.5, -0.5, -0.5),
        Vector.new(-0.5, -0.5, -0.5),
        Vector.new(-0.5, -0.5, 0.5),
        Vector.new(0, 0.5, 0)
    ],

    triangles: [
        [0, 1, 4, RED],
        [1, 2, 4, GREEN],
        [2, 3, 4, BLUE],
        [0, 3, 4, YELLOW],
        [0, 1, 2, PURPLE],
        [0, 2, 3, CYAN]
    ],

    r: 1 // bounding sphere radius
}

const models = {cube, pyramid}

function createObject(type, position = null, rotation = null, scale = null) {
    let template = models[type];
    
    let newObj = {vertices: [], triangles: [], r: template.r};

    for (let v of template.vertices) {
        let realV = Vector.clone(v);

        if (rotation) {
            Vector.rotate(realV, rotation)
        }

        if (scale) {
            Vector.multElements(realV, scale);

            newObj.r *= Math.max(scale.x, scale.y, scale.z);
        }

        if (position) {
            Vector.add(realV, position);
        }

        newObj.vertices.push(realV);
    }

    for (let t of template.triangles) {
        newObj.triangles.push(t);
    }

    if (position) {
        newObj.position = position;
    }
    else {
        newObj.position = Vector.zero;
    }

    return newObj;
}

function signedDistance(plane, position) {
    return Vector.dot(plane[0], position) + plane[1];
}

function clipAgainstPlane(instance, plane) {
    let d = signedDistance(plane, instance.position);

    if (d > instance.r) return instance;

    if (d < -instance.r) return null;

    return instance;
}

function clip(instance) {
    let z_t = instance.position.z - VIEWPORT_DISTANCE
    // Behind camera - no drawing
    if (z_t <= 0) return null;

    // Too far to left - x-position further outside than 45-degree line
    let diagonal = Math.SQRT1_2 * instance.position.z;

    if (instance.position.x > diagonal || instance.position.x < -diagonal) return null;

    // As it is a 45-degree angle, the same value can be used for y

    if (instance.position.y > diagonal || instance.position.y < -diagonal) return null;

    return instance;
}

function clipInstances(instances) {
    let clipped = [];

    for (let i of instances) {
        let c = clip(i);

        if (c != null) clipped.push(c);
    }

    return clipped;
}

function moveObject(object, translateVector) {
    for (let v of object.vertices) {
        Vector.add(v, translateVector);
    }
}

function animate(timestamp) {
    requestAnimationFrame(animate)

    ctx.clearRect(0, 0, CANVAS.x, CANVAS.y);

    let move = Vector.new(Math.sin(timestamp * 0.001) * 0.03, 0, 0);

    let cube1 = createObject('cube', Vector.new(0, -0.5, 4.5), Vector.new(timestamp * 0.001, timestamp * 0.0015, 0));
    let cube2 = createObject('cube', Vector.new(2, 0, 5));

    let instances = [cube1, cube2];

    let clipped_instances = clipInstances(instances);

    for (let instance of clipped_instances) {
        render3D(instance.vertices, instance.triangles);
    }

    ctx.putImageData(IMAGE_BUFFER, 0, 0);

    ctx.save()
    ctx.scale(1, -1)
    ctx.translate(0, -CANVAS.y)
    ctx.fillStyle = 'black';
    ctx.fillText(instances.length - clipped_instances.length + ' objects skipped', 100, CANVAS.y - 100)
    ctx.restore()

    // clear buffer for next frame

    DEPTH_BUFFER.fill(0);
    IMAGE_BUFFER.data.fill(0)
}

requestAnimationFrame(animate)

if (false) {
    ctx.beginPath();
    ctx.moveTo(CENTRE.x, 0);
    ctx.lineTo(CENTRE.x, CANVAS.y);
    ctx.moveTo(0, CENTRE.y);
    ctx.lineTo(CANVAS.x, CENTRE.y);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
}