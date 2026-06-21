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

let skipped_triangles = 0;

const LIGHTS = [];

const AMBIENT_LIGHT_INTENSITY = 0.1;

LIGHTS.push(
    {
        type: 'p',
        x: -2,
        y: 0,
        z: 5,
        i: 0.1
    },

    {
        type: 'd',
        x: 1,
        y: 1,
        z: 1,
        i: 0.1
    },

    {
        type: 'p',
        x: 0,
        y: 2,
        z: 5,
        i: 0.1
    }
)

const sumI = (sum, light) => sum + light.i;

const MAX_INTENSITY = AMBIENT_LIGHT_INTENSITY + LIGHTS.reduce(sumI, 0)

const AMBIENT_RGB = Math.round(255 * AMBIENT_LIGHT_INTENSITY / MAX_INTENSITY);

CANVAS_EL.style.backgroundColor = `rgb(${AMBIENT_RGB}, ${AMBIENT_RGB}, ${AMBIENT_RGB})`

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

function getLightLevel(p, n) {
    let V = Vector.subtract2(CAMERA, p);

    let i = AMBIENT_LIGHT_INTENSITY;

    Vector.unit(V);

    for (let light of LIGHTS) {
        let L;
        let d2 = null;
        if (light.type == 'p') {
            L = Vector.subtract2(light, p);
            d2 = Vector.magSquared(L);
            Vector.unit(L);
        }
        else if (light.type == 'd') {
            L = Vector.unit2(light);
            Vector.mult(L, -1);
        }

        let dot = Vector.dot(n, L);

        if (dot > 0) i += light.i * dot;

        if (d2) i += light.i * dot / (1 + 0.1 * d2)

        let H = Vector.add2(L, V);

        Vector.unit(H);

        let spec = Math.pow(
            Math.max(0, Vector.dot(n, H)),
            16
        );

        i += light.i * spec * 0.5;
    }

    return i;
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
    let z_0_1 = interpolate(p0.y, p0.z, p1.y, p1.z);

    let x_1_2 = interpolate(p1.y, p1.x, p2.y, p2.x);
    let z_1_2 = interpolate(p1.y, p1.z, p2.y, p2.z);

    let x_0_2 = interpolate(p0.y, p0.x, p2.y, p2.x);
    let z_0_2 = interpolate(p0.y, p0.z, p2.y, p2.z);

    // same as in drawFilledTriangle - repeated value in both x and i for the short sides

    x_0_1.pop()

    let x_0_1_2 = x_0_1.concat(x_1_2);

    z_0_1.pop()

    let z_0_1_2 = z_0_1.concat(z_1_2);

    let {r, g, b} = colour;

    for (let y = p0.y; y <= p2.y; y++) {
        let index = y - p0.y;

        let x_l, x_r, z_l, z_r;

        let min = Math.min(x_0_2[index], x_0_1_2[index])

        if (min == x_0_2[index]) {
            x_l = x_0_2[index];
            x_r = x_0_1_2[index];
            z_l = z_0_2[index];
            z_r = z_0_1_2[index];
        }
        else {
            x_l = x_0_1_2[index];
            x_r = x_0_2[index];
            z_l = z_0_1_2[index];
            z_r = z_0_2[index];
        }

        let z_values = interpolate(x_l, z_l, x_r, z_r);

        for (let x = x_l; x <= x_r; x++) {
            let x_index = x - x_l;
            let z = z_values[x_index];

            ctx.fillStyle = `rgb(${r * z}, ${g * z}, ${b * z})`;

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
    let z_0_1 = interpolate(p0.y, p0.z, p1.y, p1.z);

    let x_1_2 = interpolate(p1.y, p1.x, p2.y, p2.x);
    let z_1_2 = interpolate(p1.y, p1.z, p2.y, p2.z);

    let x_0_2 = interpolate(p0.y, p0.x, p2.y, p2.x);
    let z_0_2 = interpolate(p0.y, p0.z, p2.y, p2.z);

    // same as in drawFilledTriangle - repeated value in both x and i for the short sides

    x_0_1.pop()

    let x_0_1_2 = x_0_1.concat(x_1_2);

    z_0_1.pop()

    let z_0_1_2 = z_0_1.concat(z_1_2);

    let {r, g, b} = colour;
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

    for (let y = p0.y; y <= p2.y; y++) {
        let index = y - p0.y;
        
        let cy = Math.round(y + CENTRE.y);

        if (cy >= CANVAS.y) break;
        if (cy < 0) continue;

        let x_l, x_r, z_l, z_r;

        let min = Math.min(x_0_2[index], x_0_1_2[index])

        if (min == x_0_2[index]) {
            x_l = x_0_2[index];
            x_r = x_0_1_2[index];
            z_l = z_0_2[index];
            z_r = z_0_1_2[index];
        }
        else {
            x_l = x_0_1_2[index];
            x_r = x_0_2[index];
            z_l = z_0_1_2[index];
            z_r = z_0_2[index];
        }

        x_l = Math.round(x_l)
        x_r = Math.round(x_r)

        let z_values = interpolate(x_l, z_l, x_r, z_r);

        for (let x = x_l; x <= x_r; x++) {
            let x_index = x - x_l;
            let z = z_values[x_index];

            let cx = Math.round(x + CENTRE.x);

            if (cx >= CANVAS.x) break;
            if (cx < 0) continue;
            
            let index = getIndex(cx, cy);

            if (z <= DEPTH_BUFFER[index]) continue;

            DEPTH_BUFFER[index] = z;

            index *= 4;

            IMAGE_BUFFER.data[index] = r;
            IMAGE_BUFFER.data[index + 1] = g;
            IMAGE_BUFFER.data[index + 2] = b;
            IMAGE_BUFFER.data[index + 3] = 255;
            //ctx.fillRect(cx, cy, PIXEL_SIZE, PIXEL_SIZE);
        }
    }
}

function drawShadedDepthTriangle(p0, p1, p2, colour = GREEN) {
    // Ensure p0.y <= p1.y <= p2.y
    // p.z = colour intensity at that point
    if (p1.y < p0.y) [p0, p1] = [p1, p0];
    if (p2.y < p0.y) [p0, p2] = [p2, p0];
    if (p2.y < p1.y) [p1, p2] = [p2, p1];

    // therefore, 1 'tall' side from p0 to p2, 2 'short' sides
    let x_0_1 = interpolate(p0.y, p0.x, p1.y, p1.x);
    let z_0_1 = interpolate(p0.y, p0.z, p1.y, p1.z);
    let i_0_1 = interpolate(p0.y, p0.i, p1.y, p1.i);

    let x_1_2 = interpolate(p1.y, p1.x, p2.y, p2.x);
    let z_1_2 = interpolate(p1.y, p1.z, p2.y, p2.z);
    let i_1_2 = interpolate(p1.y, p1.i, p2.y, p2.i);

    let x_0_2 = interpolate(p0.y, p0.x, p2.y, p2.x);
    let z_0_2 = interpolate(p0.y, p0.z, p2.y, p2.z);
    let i_0_2 = interpolate(p0.y, p0.i, p2.y, p2.i);

    // same as in drawFilledTriangle - repeated value in both x and i for the short sides

    x_0_1.pop()

    let x_0_1_2 = x_0_1.concat(x_1_2);

    z_0_1.pop()

    let z_0_1_2 = z_0_1.concat(z_1_2);

    i_0_1.pop()

    let i_0_1_2 = i_0_1.concat(i_1_2);

    let {r, g, b} = colour;

    for (let y = p0.y; y <= p2.y; y++) {
        let index = y - p0.y;
        
        let cy = Math.round(CANVAS.y - y - CENTRE.y);

        if (cy >= CANVAS.y) continue;
        if (cy < 0) break;

        let x_l, x_r, z_l, z_r, i_l, i_r;

        let min = Math.min(x_0_2[index], x_0_1_2[index])

        if (min == x_0_2[index]) {
            x_l = x_0_2[index];
            x_r = x_0_1_2[index];
            z_l = z_0_2[index];
            z_r = z_0_1_2[index];
            i_l = i_0_2[index];
            i_r = i_0_1_2[index];
        }
        else {
            x_l = x_0_1_2[index];
            x_r = x_0_2[index];
            z_l = z_0_1_2[index];
            z_r = z_0_2[index];
            i_l = i_0_1_2[index];
            i_r = i_0_2[index];
        }

        x_l = Math.round(x_l)
        x_r = Math.round(x_r)

        let z_values = interpolate(x_l, z_l, x_r, z_r);
        let i_values = interpolate(x_l, i_l, x_r, i_r);

        for (let x = x_l; x <= x_r; x++) {
            let cx = Math.round(x + CENTRE.x);

            if (cx >= CANVAS.x) break;
            if (cx < 0) continue;
            
            let index = getIndex(cx, cy);
            
            let x_index = x - x_l;
            let z = z_values[x_index];
            let i = i_values[x_index] / MAX_INTENSITY;

            if (z <= DEPTH_BUFFER[index]) continue;

            DEPTH_BUFFER[index] = z;

            index *= 4;

            IMAGE_BUFFER.data[index] = r * i;
            IMAGE_BUFFER.data[index + 1] = g * i;
            IMAGE_BUFFER.data[index + 2] = b * i;
            IMAGE_BUFFER.data[index + 3] = 255;
            //ctx.fillRect(cx, cy, PIXEL_SIZE, PIXEL_SIZE);
        }
    }
}

function drawDot(dot) {
    ctx.fillStyle = 'red';
    ctx.fillText(dot.name || 'P', dot.x + CENTRE.x, dot.y + CENTRE.y);
}

function render3D(vertices, triangles, translateVector = null, scaleVector = null) {
    let worldVertices = [];
    let projected = [];

    for (let v of vertices) {
        let realV = v;
        if (scaleVector) {
            realV = Vector.multElements2(v, scaleVector);
        }

        if (translateVector) {
            realV = Vector.add2(realV, translateVector)
        }

        worldVertices.push(realV)
        projected.push(projectVertex(realV))
    }

    for (let t of triangles) {
        let [index0, index1, index2, colour] = t;

        let p0 = worldVertices[index0]
        let p1 = worldVertices[index1]
        let p2 = worldVertices[index2]

        let v1 = Vector.subtract2(p1, p0);
        let v2 = Vector.subtract2(p2, p0);
        let normal = Vector.cross(v1, v2);

        Vector.unit(normal);

        let proj0 = projected[index0];
        let proj1 = projected[index1];
        let proj2 = projected[index2];

        let area = 
        (proj1.x - proj0.x) * (proj2.y - proj0.y) -
        (proj2.x - proj0.x) * (proj1.y - proj0.y);

        if (area >= 0) {
            skipped_triangles++;
            continue;
        }

        proj0.i = getLightLevel(p0, normal);
        proj1.i = getLightLevel(p1, normal);
        proj2.i = getLightLevel(p2, normal);

        drawShadedDepthTriangle(proj0, proj1, proj2, colour || CYAN);
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
        [4, 0, 3, RED],
        [4, 3, 7, RED],
        [5, 4, 7, RED],
        [5, 7, 6, RED],
        [1, 5, 6, RED],
        [1, 6, 2, RED],
        [4, 5, 1, RED],
        [4, 1, 0, RED],
        [2, 6, 7, RED],
        [2, 7, 3, RED]
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
        [0, 1, 4, BLUE],
        [1, 2, 4, BLUE],
        [2, 3, 4, BLUE],
        [0, 4, 3, BLUE],
        [0, 2, 1, BLUE],
        [0, 3, 2, BLUE]
    ],

    r: 1 // bounding sphere radius
}

const t = (1 + Math.sqrt(5)) / 2;

const isosphere = {
    vertices: [
        {x:-0.525731,y:0.850651,z:0.000000},
        {x:0.525731,y:0.850651,z:0.000000},
        {x:-0.525731,y:-0.850651,z:0.000000},
        {x:0.525731,y:-0.850651,z:0.000000},

        {x:0.000000,y:-0.525731,z:0.850651},
        {x:0.000000,y:0.525731,z:0.850651},
        {x:0.000000,y:-0.525731,z:-0.850651},
        {x:0.000000,y:0.525731,z:-0.850651},

        {x:0.850651,y:0.000000,z:-0.525731},
        {x:0.850651,y:0.000000,z:0.525731},
        {x:-0.850651,y:0.000000,z:-0.525731},
        {x:-0.850651,y:0.000000,z:0.525731},

        {x:-0.809017,y:0.500000,z:0.309017},
        {x:-0.500000,y:0.309017,z:0.809017},
        {x:-0.309017,y:0.809017,z:0.500000},
        {x:0.309017,y:0.809017,z:0.500000},
        {x:0.000000,y:1.000000,z:0.000000},
        {x:0.309017,y:0.809017,z:-0.500000},
        {x:-0.309017,y:0.809017,z:-0.500000},
        {x:-0.500000,y:0.309017,z:-0.809017},
        {x:0.500000,y:0.309017,z:-0.809017},
        {x:0.809017,y:0.500000,z:-0.309017},
        {x:0.809017,y:-0.500000,z:-0.309017},
        {x:1.000000,y:0.000000,z:0.000000},
        {x:0.809017,y:-0.500000,z:0.309017},
        {x:0.500000,y:-0.309017,z:0.809017},
        {x:0.309017,y:-0.809017,z:0.500000},
        {x:-0.309017,y:-0.809017,z:0.500000},
        {x:-0.809017,y:-0.500000,z:0.309017},
        {x:-1.000000,y:0.000000,z:0.000000},
        {x:-0.809017,y:-0.500000,z:-0.309017},
        {x:-0.309017,y:-0.809017,z:-0.500000},
        {x:0.309017,y:-0.809017,z:-0.500000},
        {x:0.500000,y:-0.309017,z:-0.809017},
        {x:0.000000,y:-1.000000,z:0.000000},
        {x:-0.500000,y:-0.309017,z:-0.809017},
        {x:0.000000,y:0.000000,z:-1.000000},
        {x:0.000000,y:0.000000,z:1.000000},
        {x:0.500000,y:0.309017,z:0.809017},
        {x:-0.500000,y:0.309017,z:0.809017},
        {x:0.500000,y:0.309017,z:-0.809017},
        {x:-0.500000,y:0.309017,z:-0.809017}
    ],

    triangles: [
        [0,12,14],[11,13,12],[5,14,13],[12,13,14],

        [0,14,16],[5,15,14],[1,16,15],[14,15,16],

        [0,16,18],[1,17,16],[7,18,17],[16,17,18],

        [0,18,19],[7,20,18],[10,19,20],[18,20,19],

        [0,19,12],[10,41,19],[11,12,41],[19,41,12],

        [1,15,17],[5,38,15],[9,17,38],[15,38,17],

        [5,13,39],[11,39,13],[4,25,39],[13,39,25],

        [11,41,28],[10,30,41],[2,28,30],[41,30,28],

        [10,20,35],[7,36,20],[6,35,36],[20,36,35],

        [7,17,40],[1,21,17],[8,40,21],[17,21,40],

        [3,24,26],[9,25,24],[4,26,25],[24,25,26],

        [3,26,34],[4,27,26],[2,34,27],[26,27,34],

        [3,34,32],[2,31,34],[6,32,31],[34,31,32],

        [3,32,22],[6,33,32],[8,22,33],[32,33,22],

        [3,22,24],[8,23,22],[9,24,23],[22,23,24],

        [4,38,25],[9,38,23],[5,39,38],[38,39,25],

        [2,27,28],[4,28,25],[11,28,39],[28,39,25],

        [6,31,35],[2,30,31],[10,35,30],[31,30,35],

        [8,33,40],[6,36,33],[7,40,36],[33,36,40],

        [9,23,21],[8,21,40],[1,38,21],[21,38,40]
    ],

    r: 1
};

const icosphere = {
    vertices: [
        // 12 Original Icosahedron Vertices
        Vector.new(-0.525731, 0.850651, 0.0),   // 0
        Vector.new(0.525731, 0.850651, 0.0),    // 1
        Vector.new(-0.525731, -0.850651, 0.0),  // 2
        Vector.new(0.525731, -0.850651, 0.0),   // 3
        Vector.new(0.0, -0.525731, 0.850651),   // 4
        Vector.new(0.0, 0.525731, 0.850651),    // 5
        Vector.new(0.0, -0.525731, -0.850651),  // 6
        Vector.new(0.0, 0.525731, -0.850651),   // 7
        Vector.new(0.850651, 0.0, -0.525731),   // 8
        Vector.new(0.850651, 0.0, 0.525731),    // 9
        Vector.new(-0.850651, 0.0, -0.525731),  // 10
        Vector.new(-0.850651, 0.0, 0.525731),   // 11

        // 30 Unique Normalized Midpoints
        Vector.new(-0.809017, 0.5, 0.309017),   // 12
        Vector.new(-0.5, 0.309017, 0.809017),   // 13
        Vector.new(-0.309017, 0.809017, 0.5),   // 14
        Vector.new(0.309017, 0.809017, 0.5),    // 15
        Vector.new(0.0, 1.0, 0.0),              // 16
        Vector.new(0.309017, 0.809017, -0.5),   // 17
        Vector.new(-0.309017, 0.809017, -0.5),  // 18
        Vector.new(-0.5, 0.309017, -0.809017),  // 19
        Vector.new(-0.809017, 0.5, -0.309017),  // 20
        Vector.new(-1.0, 0.0, 0.0),             // 21
        Vector.new(0.5, 0.309017, 0.809017),    // 22
        Vector.new(0.809017, 0.5, 0.309017),    // 23
        Vector.new(-0.5, -0.309017, 0.809017),  // 24
        Vector.new(0.0, 0.0, 1.0),              // 25
        Vector.new(-0.809017, -0.5, -0.309017), // 26
        Vector.new(-0.809017, -0.5, 0.309017),  // 27
        Vector.new(0.0, 0.0, -1.0),             // 28
        Vector.new(-0.5, -0.309017, -0.809017), // 29
        Vector.new(0.809017, 0.5, -0.309017),   // 30
        Vector.new(0.5, 0.309017, -0.809017),   // 31
        Vector.new(0.809017, -0.5, 0.309017),   // 32
        Vector.new(0.5, -0.309017, 0.809017),   // 33
        Vector.new(0.309017, -0.809017, 0.5),   // 34
        Vector.new(-0.309017, -0.809017, 0.5),  // 35
        Vector.new(0.0, -1.0, 0.0),             // 36
        Vector.new(-0.309017, -0.809017, -0.5), // 37
        Vector.new(0.309017, -0.809017, -0.5),  // 38
        Vector.new(0.5, -0.309017, -0.809017),  // 39
        Vector.new(0.809017, -0.5, -0.309017),  // 40
        Vector.new(1.0, 0.0, 0.0)               // 41
    ],

    triangles: [
        [0, 12, 14], [11, 13, 12], [5, 14, 13], [12, 13, 14],
        [0, 14, 16], [5, 15, 14], [1, 16, 15], [14, 15, 16],
        [0, 16, 18], [1, 17, 16], [7, 18, 17], [16, 17, 18],
        [0, 18, 20], [7, 19, 18], [10, 20, 19], [18, 19, 20],
        [0, 20, 12], [10, 21, 20], [11, 12, 21], [20, 21, 12],
        [1, 15, 23], [5, 22, 15], [9, 23, 22], [15, 22, 23],
        [5, 13, 25], [11, 24, 13], [4, 25, 24], [13, 24, 25],
        [11, 21, 27], [10, 26, 21], [2, 27, 26], [21, 26, 27],
        [10, 19, 29], [7, 28, 19], [6, 29, 28], [19, 28, 29],
        [7, 17, 31], [1, 30, 17], [8, 31, 30], [17, 30, 31],
        [3, 32, 34], [9, 33, 32], [4, 34, 33], [32, 33, 34],
        [3, 34, 36], [4, 35, 34], [2, 36, 35], [34, 35, 36],
        [3, 36, 38], [2, 37, 36], [6, 38, 37], [36, 37, 38],
        [3, 38, 40], [6, 39, 38], [8, 40, 39], [38, 39, 40],
        [3, 40, 32], [8, 41, 40], [9, 32, 41], [40, 41, 32],
        [4, 33, 25], [9, 22, 33], [5, 25, 22], [33, 22, 25],
        [2, 35, 27], [4, 24, 35], [11, 27, 24], [35, 24, 27],
        [6, 37, 29], [2, 26, 37], [10, 29, 26], [37, 26, 29],
        [8, 39, 31], [6, 28, 39], [7, 31, 28], [39, 28, 31],
        [9, 41, 23], [8, 30, 41], [1, 23, 30], [41, 30, 23]
    ],
    r: 1
}

const models = {cube, pyramid, isosphere, icosphere}

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

            let s = Math.max(scale.x, scale.y, scale.z);

            newObj.r *= s;
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

    skipped_triangles = 0;

    let scale = 0.5;
    let scaleV = Vector.new(scale, scale, scale)

    let instances = [
        createObject('cube', Vector.new(0, -2, 5.1), null, Vector.new(10, 1, 10)),
        createObject('icosphere', Vector.new(0.1, -1, 3), Vector.new(0, timestamp * 0.001, 0), scaleV),
        createObject('icosphere', Vector.new(2, 0, 4), Vector.new(timestamp * 0.001, timestamp * 0.001, timestamp * 0.002), scaleV),
        createObject('icosphere', Vector.new(Math.sin(timestamp * 0.001), 0, Math.cos(timestamp * 0.001) + 4), Vector.new(0, timestamp * 0.002, 0), scaleV),

    ]

    instances[0].r = 10;

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
    ctx.fillText(skipped_triangles + ' triangles skipped', 100, CANVAS.y - 50)
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