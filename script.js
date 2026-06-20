import { Vector } from "./vector3.js";

const CANVAS_EL = document.getElementById('canvas');

CANVAS_EL.width = innerWidth;
CANVAS_EL.height = innerHeight;

const CANVAS = Vector.new(innerWidth, innerHeight, 0);

const CENTRE = Vector.mult2(CANVAS, 0.5);

const CAMERA = Vector.new(0, 0, 0);

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

const PIXEL_SIZE = 2;

ctx.translate(0, CANVAS.y);
ctx.scale(1, -1);

ctx.font = '30px Arial';

function viewportToCanvas(x, y) {
    return {x: x * CONVERSION.x, y: y * CONVERSION.y}
}

function projectVertex(v) {
    let mult = VIEWPORT_DISTANCE / v.z;
    return viewportToCanvas(v.x * mult, v.y * mult);
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
            let y = y_values[x - p0.x];
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
            let x = x_values[y - p0.y];
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
        let index = y - p0.y;
        x_left = Math.min(x_0_2[index], x_0_1_2[index]);
        x_right = Math.max(x_0_2[index], x_0_1_2[index]);
        for (let x = x_left; x <= x_right; x++) {
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

        drawTriangleWireframe(projected[index0], projected[index1], projected[index2], colour);
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
    ]
}

const models = {cube}

function createObject(type, position = null, rotation = null, scale = null) {
    let template = models[type];
    
    let newObj = {vertices: [], triangles: []};

    for (let v of template.vertices) {
        let realV = Vector.clone(v);

        if (rotation) {
            Vector.rotate(realV, rotation)
        }

        if (scale) {
            Vector.multElements(realV, scale);
        }

        if (position) {
            Vector.add(realV, position);
        }

        newObj.vertices.push(realV);
    }

    for (let t of template.triangles) {
        newObj.triangles.push(t);
    }

    return newObj;
}

function animate(timestamp) {
    requestAnimationFrame(animate)

    ctx.clearRect(0, 0, CANVAS.x, CANVAS.y)

    let cube1 = createObject('cube', Vector.new(1.5 * Math.sin(timestamp / 500), -0.5, 5 + Math.cos(timestamp / 500)));

    render3D(cube1.vertices, cube1.triangles);

    let cube2 = createObject('cube', Vector.new(0, 0, 5), Vector.new(timestamp / 1000, timestamp / 1000, 0))

    render3D(cube2.vertices, cube2.triangles);
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