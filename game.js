let gl, program;
let blocks = [];
let projectiles = [];
let shooter = { x: 0, width: 0.25, height: 0.25, speed: 0.02, health: 3, texture: null };
let bulletTexture, blockTexture;
let score = 0;
let isGameRunning = false;  
let gameLoopId;  

const BLOCK_WIDTH = 0.2;
const BLOCK_HEIGHT = 0.2;
const PROJECTILE_WIDTH = 0.03;
const PROJECTILE_HEIGHT = 0.06;
const PROJECTILE_SPEED = 0.02;
const SHOOTER_Y = -0.9;

function init() {
    const canvas = document.getElementById('gameCanvas');
    gl = canvas.getContext('webgl');
    if (!gl) {
        alert('WebGL not supported');
        return;
    }

    
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0, 1);
            v_texCoord = a_texCoord;
        }
    `);
    
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform sampler2D u_texture;
        void main() {
            gl_FragColor = texture2D(u_texture, v_texCoord);
        }
    `);
    
    program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    loadTexture('arcade.png', (texture) => {
        shooter.texture = texture;
        render();  
    });

    loadTexture('bullet.png', (texture) => {
        bulletTexture = texture;
    });
    loadTexture('block.png', (texture) => {
        blockTexture = texture;
    });

    setInterval(spawnBlock, 1000); 

  
    canvas.addEventListener('click', (event) => {
        const clickPos = getMousePosition(event, canvas);
        shootProjectile(clickPos);
    });

    
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('pauseButton').addEventListener('click', pauseGame);
}


function startGame() {
    if (!isGameRunning) {
        isGameRunning = true;
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}


function pauseGame() {
    if (isGameRunning) {
        isGameRunning = false;
        cancelAnimationFrame(gameLoopId);
    }
}


function gameLoop() {
    updateBlocks();
    updateProjectiles();
    checkCollisions();
    render();  

    if (shooter.health <= 0) {
        alert('Game Over! Final Score: ' + score);
        document.location.reload();
    } else if (isGameRunning) {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

function updateBlocks() {
    blocks = blocks.filter(block => block.y > -1.0 && block.x > -1.0 && block.x < 1.0);
    blocks.forEach(block => {
        let directionX = shooter.x - block.x;
        let directionY = SHOOTER_Y - block.y;
        let magnitude = Math.sqrt(directionX * directionX + directionY * directionY);

        let velocityX = (directionX / magnitude) * 0.005;
        let velocityY = (directionY / magnitude) * 0.005;

        block.x += velocityX;
        block.y += velocityY;
    });
}


function updateProjectiles() {
    projectiles = projectiles.filter(p => p.y < 1.0 && p.y > -1.0 && p.x < 1.0 && p.x > -1.0);
    projectiles.forEach(p => {
        p.x += p.velocityX;
        p.y += p.velocityY;
    });
}


function checkCollisions() {
    projectiles.forEach((p, pi) => {
        blocks.forEach((b, bi) => {
            if (p.x < b.x + BLOCK_WIDTH && p.x + PROJECTILE_WIDTH > b.x &&
                p.y < b.y + BLOCK_HEIGHT && p.y + PROJECTILE_HEIGHT > b.y) {
                blocks.splice(bi, 1);
                projectiles.splice(pi, 1);
                score++;
                document.getElementById('scoreDisplay').innerText = score;
            }
        });
    });

    blocks.forEach((b, bi) => {
        if (b.x < shooter.x + shooter.width && b.x + BLOCK_WIDTH > shooter.x &&
            b.y < SHOOTER_Y + shooter.height && b.y + BLOCK_HEIGHT > SHOOTER_Y) {
            shooter.health--;
            blocks.splice(bi, 1);
            document.getElementById('healthDisplay').innerText = shooter.health;
        }
    });
}


function spawnBlock() {
    if (isGameRunning) {
        let x = Math.random() * 2 - 1;
        let y = 1;
        blocks.push({ x: x, y: y });
    }
}


function shootProjectile(target) {
  
    let velocityX = 0;  
    let velocityY = PROJECTILE_SPEED; 

   
    projectiles.push({ x: shooter.x, y: SHOOTER_Y, velocityX: velocityX, velocityY: velocityY });
}


function getMousePosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / canvas.width * 2 - 1;
    const y = (rect.bottom - event.clientY) / canvas.height * 2 - 1;
    return { x: x, y: y };
}


document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
        shooter.x -= shooter.speed;
    } else if (event.key === 'ArrowRight') {
        shooter.x += shooter.speed;
    }
});


function loadTexture(url, callback) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const placeholderPixel = new Uint8Array([255, 255, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholderPixel);

    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }

        callback(texture);
    };

    image.src = url;
}


function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}


function render() {
    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT);

   
    drawTexture(shooter.texture, shooter.x, SHOOTER_Y, shooter.width, shooter.height);

   
    projectiles.forEach(p => {
        drawTexture(bulletTexture, p.x, p.y, PROJECTILE_WIDTH, PROJECTILE_HEIGHT);
    });

  
    blocks.forEach(b => {
        drawTexture(blockTexture, b.x, b.y, BLOCK_WIDTH, BLOCK_HEIGHT);
    });
}

function drawTexture(texture, x, y, width, height) {
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const positions = new Float32Array([
        x, y,
        x + width, y,
        x, y + height,
        x + width, y + height
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    const texCoords = new Float32Array([
        0, 0,
        1, 0,
        0, 1,
        1, 1
    ]);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}


init();
