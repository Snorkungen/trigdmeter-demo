
const CONTAINER = document.getElementById("container")
const FOV = 160;
const GRID_SIZE = 35;
const CANVAS_SIZE = 400;
const CELL_COLOR_1 = "#f7aa34";
const CELL_COLOR_2 = "#232323";

/**
 * 
 * @param {HTMLCanvasElement} canvas 
 * @param {boolean[][]} canvas 
 */
function get_canvas_information(canvas, grid) {
    let grid_height = grid.length;
    let grid_width = (grid[0] && grid[0].length) ?? 0

    let canvas_width = canvas.width;
    let canvas_height = canvas.height;

    // prevent floats
    canvas_width -= canvas_width % grid_width
    canvas_height -= canvas_height % grid_height;

    let cell_width = (canvas_width / grid_width);
    let cell_height = (canvas_height / grid_height);

    return {
        grid_height,
        grid_width,
        canvas_width,
        canvas_height,
        cell_width,
        cell_height
    }
}

/**
 * @param {HTMLCanvasElement} canvas 
 * @param {boolean[][]} grid 
 */
function render_grid(canvas, grid, c1 = CELL_COLOR_2, c2 = CELL_COLOR_1) {
    const {
        grid_height,
        grid_width,
        canvas_width,
        canvas_height,
        cell_width,
        cell_height
    } = get_canvas_information(canvas, grid)

    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas_width, canvas_height);

    for (let y = 0; y < grid_height; y++) {
        for (let x = 0; x < grid_width; x++) {
            let xoffset = x * cell_width, yoffset = y * cell_height;
            if (!!grid[y][x]) {
                ctx.fillStyle = c1
            } else {
                ctx.fillStyle = c2
            }
            ctx.beginPath()
            ctx.rect(xoffset, yoffset, cell_width, cell_height)
            ctx.fill()
            ctx.stroke()
        }
    }
}

function degrees2radians(angle) {
    return angle / 180 * Math.PI;
}
function radians2degrees(radians) {
    return radians / Math.PI * 180;
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


    let values = new Array(gwidth).fill(0).map(() => false);
    let midpoint = Math.floor(values.length / 2)
    // values are evenly sized buckets where the angle angles are something
    let angle_chunk_size = (fov / (values.length - 1));



    for (let x = 0; x < gwidth; x++) {
        for (let y = 0; y < gheight; y++) {
            if (!cell_in_fov(position, fov, x, y)) {
                continue
            }

            if (!!grid[y][x]) {
                let real_angle = 90 - Math.abs(
                    radians2degrees(
                        Math.atan(y / (position - x))
                    )
                );

                if (x < position) real_angle *= -1;
                
                let value_pos = midpoint + Math.round(real_angle / angle_chunk_size);
                values[value_pos] = true
            }
        }
    }

    return values
}

function make_grid(h, w = h) {
    return (new Array(h)).fill(0).map(() => new Array(w).fill(0))
}

let grid = make_grid(GRID_SIZE)

let camera1_container = CONTAINER.appendChild(document.createElement("div")); camera1_container.style.display = "flex"; camera1_container.style.flexFlow = "column"
let canvas1 = camera1_container.appendChild(document.createElement("canvas")); canvas1.width = CANVAS_SIZE; canvas1.height = CANVAS_SIZE;

let camera2_container = CONTAINER.appendChild(document.createElement("div")); camera2_container.style.display = "flex"; camera2_container.style.flexFlow = "column"
let canvas2 = camera2_container.appendChild(document.createElement("canvas")); canvas2.width = CANVAS_SIZE; canvas2.height = CANVAS_SIZE;

let canvas_camera1 = camera1_container.appendChild(document.createElement("canvas")); canvas_camera1.width = CANVAS_SIZE; canvas_camera1.height = 30;
let canvas_camera2 = camera2_container.appendChild(document.createElement("canvas")); canvas_camera2.width = CANVAS_SIZE; canvas_camera2.height = 30;


let camera1_pos = 0
let camera2_pos = grid[0].length - 1

function update() {
    render_grid(canvas1, grid)
    render_grid(canvas2, grid)

    render_grid(canvas_camera1, [get_camera_cells(grid, camera1_pos, FOV)])
    render_grid(canvas_camera2, [get_camera_cells(grid, camera2_pos, FOV)])
}

function handle_canvas_click(ev) {
    let target = ev.currentTarget
    if (!target || !(target instanceof HTMLCanvasElement)) {
        return;
    }

    const {
        grid_height,
        grid_width,
        cell_width,
        cell_height
    } = get_canvas_information(target, grid)

    let rect = target.getBoundingClientRect();
    let x = Math.floor((ev.clientX - rect.x) / cell_width)
    let y = Math.floor((ev.clientY - rect.y) / cell_height)

    if (x >= grid_width || y >= grid_height) {
        return
    }

    grid[y][x] = !grid[y][x]

    update()

    console.log(`(${x}, ${y})`)

    fov_toggled = false
    garbage = undefined
}

canvas1.addEventListener("click", handle_canvas_click)
canvas2.addEventListener("click", handle_canvas_click)

update()

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

    // let angle = 0; Faster conversion onto the real angle
    let angle = Math.floor(FOV / values.length * (x - midpoint) * 0.85);

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
            // TODO: check if there are other angles that could be better
            // i.e find the next angle that does not contain the object, and then return the median

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
        if (found) {
            return angle
        }
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
    let base_length = camera2_pos - camera1_pos - 1

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

