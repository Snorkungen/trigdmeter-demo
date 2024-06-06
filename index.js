
const CONTAINER = document.getElementById("container")
const FOV = 160;
const CELL_COLOR_1 = "#554455";
const CELL_COLOR_2 = "#ffeeff";

/**
 * @param {HTMLCanvasElement} canvas 
 * @param {boolean[][]} grid 
 */
function render_grid(canvas, grid, c1 = CELL_COLOR_2, c2 = CELL_COLOR_1) {
    let gheight = grid.length;
    let gwidth = (grid[0] && grid[0].length) ?? 0;
    let cheight = canvas.height;
    let cwidth = canvas.width;

    let cell_width = Math.floor(cwidth / gwidth);
    let cell_height = Math.floor(cheight / gheight);

    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, cwidth, cheight);

    for (let y = 0; y < gheight; y++) {
        for (let x = 0; x < gwidth; x++) {
            let xoffset = x * cell_width, yoffset = y * cell_height;
            if (!!grid[y][x]) {
                ctx.fillStyle = c1
            } else {
                ctx.fillStyle = c2
            }
            ctx.strokeRect(xoffset, yoffset, cell_width, cell_height)
            ctx.fillRect(xoffset, yoffset, cell_width, cell_height)
        }
    }
}

function degrees2radians(angle) {
    return angle / 180 * Math.PI;
}

function _get_base(y, fov = FOV) {
    let angle
    if (fov < 1) {
        angle = 0
    } else {
        angle = Math.max(90 - (fov / 2), 0.00000001);
    }

    let base = Math.abs(
        y / Math.tan(degrees2radians(angle))
    );

    base = Math.floor(base)

    return base
}

function cell_in_fov(xposition, fov, x, y) {
    if (xposition === x) return true;

    let base = _get_base(y, fov)

    return Math.abs(x - xposition) < base
}

/**
 * @param {boolean[][]} grid 
 * @param {number} position 
 * @param {number} fov 0 - 180
 * 
 * determine out which cells are within the scopes field of view
 */
function fill_grid_based_on_fov(grid, position, fov) {
    let gheight = grid.length;
    let gwidth = (grid[0] && grid[0].length) ?? 0;
    if (gheight < 1) {
        throw "grid is invalid"
    }
    if (position < 0 || position > gwidth) {
        throw "position is invalid"
    }

    // go through rows
    for (let y = 0; y < gheight; y++) {
        for (let x = 0; x < gwidth; x++) {
            if (cell_in_fov(position, fov, x, y)) {
                grid[y][x] = true
            }
        }
    }

    return grid
}

function get_camera_cells(grid, position, fov) {
    let gheight = grid.length;
    let gwidth = (grid[0] && grid[0].length) ?? 0;


    let values = new Array(gwidth).fill(0).map(() => false)

    column_loop: for (let x = 0; x < gwidth; x++) {
        for (let y = 0; y < gheight; y++) {
            if (!cell_in_fov(position, fov, x, y)) {
                continue
            }

            if (!!grid[y][x]) {
                // interplate the distance from the edge
                let base = _get_base(y, fov)
                let ratio = (x - position) / base
                let value_pos = Math.floor(
                    Math.floor(values.length / 2) + ratio * values.length
                )
                values[value_pos] = true
                continue column_loop;
            }
        }
    }

    return values
}

function make_grid(h, w = h) {
    return (new Array(h)).fill(0).map(() => new Array(w).fill(0))
}

let grid = make_grid(50)
let canvas_size = 350;
let canvas1 = CONTAINER.appendChild(document.createElement("canvas"))
canvas1.width = canvas_size;
canvas1.height = canvas_size;
let canvas2 = CONTAINER.appendChild(document.createElement("canvas"))
canvas2.width = canvas_size;
canvas2.height = canvas_size;

function handle_canvas_click(ev) {

    let rect = canvas1.getBoundingClientRect();
    // get cell based upon coordinates

    let gheight = grid.length;
    let gwidth = (grid[0] && grid[0].length) ?? 0;

    let x;
    let y;
    // TODO: fix the math it can be know if the object is within range beforehand
    x = Math.floor((ev.clientX - rect.x) / (canvas1.width / gwidth))
    y = Math.floor((ev.clientY - rect.y) / (canvas1.height / gheight))

    grid[y][x] = !grid[y][x]
    render_grid(canvas1, grid)
    render_grid(canvas2, grid)

    console.log(`(${x}, ${y})`)

    fov_toggled = false
    garbage = undefined
}

canvas1.addEventListener("click", handle_canvas_click)
canvas2.addEventListener("click", handle_canvas_click)

render_grid(canvas1, grid)
render_grid(canvas2, grid)

let camera1_pos = 0
let camera2_pos = grid[0].length -1

function calculate_angle(grid, position) {
    let values = get_camera_cells(grid, position, FOV)

    let x = 0
    for (; x < values.length; x++) {
        if (values[x]) {
            break
        }
    }
    if (x >= values.length) {
        return false
    }

    let midpoint = Math.floor(values.length / 2);

    // find if target is to the left or right
    let eps = 0.02;
    let angle = 0;

    if (x < midpoint) {
        eps *= -1
    }

    let start_y_offset = 0;
    let start_x_offset = position;

    for (; angle > -90 && angle < 90; angle += eps) {
        // check if the target is on the line i.e if a single element on the line is true
        // assume the starting position is 0,0
        // line y = m*x + b => x = (y - b) / m
        // slope m = tan(θ) => tan (90 - angle)

        let found = false
        let prev_x = start_x_offset;
        for (let y = start_y_offset; y < grid.length; y++) {

            let x = start_x_offset + (y - start_y_offset) / Math.tan(degrees2radians(90 - angle))
            x = Math.round(x)

            if (x > prev_x + 1) {
                console.log(angle, x, prev_x)
                throw "the angle is so obtuse that the thing is skipping cells"
            }

            if (x < grid[y].length) {
                if (grid[y][x]) {
                    found = true
                    break
                }
            } else break
            prev_x = x
        }
        if (found) return angle
    }

    throw "could not find a aproximate angle"
}

let fov_toggled = false;
function toggle_fov() {
    if (fov_toggled) {
        fov_toggled = false;
        render_grid(canvas1, grid)
        render_grid(canvas2, grid)
        return
    }


    render_grid(canvas1,
        fill_grid_based_on_fov(make_grid(grid.length), camera1_pos, FOV)
    )
    render_grid(canvas2, fill_grid_based_on_fov(make_grid(grid.length), camera2_pos, FOV))

    fov_toggled = true
}

let garbage = undefined
function handle_button1() {
    if (garbage) {
        garbage = undefined
        render_grid(canvas1, grid)
        render_grid(canvas2, grid)
        return
    }

    let a = 90 - (calculate_angle(grid, camera1_pos))
    let b = 90 + (calculate_angle(grid, camera2_pos))
    let base_length = camera2_pos - camera1_pos -1

    // c·sin(B)/sin(C)
    let a_hyp = base_length * Math.sin(degrees2radians(b)) / Math.sin(degrees2radians(180 - a - b))
    let distance = Math.sin(degrees2radians(a)) * a_hyp
    let x_pos = Math.cos(degrees2radians(a)) * a_hyp + camera1_pos
    console.log(x_pos, distance)
    

    // let g1 = get_camera_cells(grid, camera1_pos, FOV)
    // let g2 = get_camera_cells(grid, camera2_pos, FOV)
    // render_grid(canvas1, [g1])
    // render_grid(canvas2, [g2])
    // garbage = grid
}

