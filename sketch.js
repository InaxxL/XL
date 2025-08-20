// =======================================================
//        交互式数字雪景球
// =======================================================

const recipientName = "Pear";

// 1. 定义一个固定的设计尺寸，所有元素都将基于这个尺寸进行定位和绘制。
const designWidth = 1600;
const designHeight = 900;
let globalScale; // 全局缩放比例
let offsetX, offsetY; // 用于将场景居中的偏移量

// 全局变量定义
let snow = [];
let treeParticles = [];
let lightParticles = [];
let stardust = [];
let textParticles = []; 
let treeTopperStar; 

let customFont; 
let song;       
let musicStarted = false; 

const snowCount = 500;

function preload() {
  try {
    customFont = loadFont('GreatVibes-Regular.ttf');
    soundFormats('mp3');
    song = loadSound('clair-de-lune.mp3');
  } catch (e) {
    console.error("加载资源文件失败，请检查文件名和路径:", e);
    customFont = "serif"; 
    song = null;
  }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    // 2. 计算初始的缩放和偏移量
    calculateLayout();

    for (let i = 0; i < snowCount; i++) {
        snow.push(new Snowflake());
    }
    snow.sort((a, b) => a.posZ - b.posZ);

    createArtisticTree();
}

// --- 新增：计算布局的函数 ---
function calculateLayout() {
  // 计算能保持设计宽高比的最大缩放比例
  const scaleX = windowWidth / designWidth;
  const scaleY = windowHeight / designHeight;
  globalScale = min(scaleX, scaleY);

  // 计算偏移量，使得场景在窗口中居中显示
  offsetX = (windowWidth - designWidth * globalScale) / 2;
  offsetY = (windowHeight - designHeight * globalScale) / 2;
}

// --- 新增：当窗口大小改变时，重新计算布局 ---
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateLayout();
}

function draw() {
    background(10, 25, 60);

    // 3. 在绘制所有内容之前，应用缩放和位移
    push();
    translate(offsetX, offsetY);
    scale(globalScale);
    
    // --- 从这里开始，所有的绘制代码都将在缩放后的“虚拟画布”上进行 ---

    for (let flake of snow) {
        flake.update();
        flake.display();
    }
    
    drawSnowDrift();

    noStroke();
    for (let p of treeParticles) {
        fill(p.color);
        ellipse(p.pos.x, p.pos.y, 2, 2);
    }
    
    if (treeTopperStar) {
        treeTopperStar.update();
        treeTopperStar.display();
    }
    
    for (let light of lightParticles) {
        light.update();
        light.display();
    }

    for (let i = stardust.length - 1; i >= 0; i--) {
        stardust[i].update();
        stardust[i].display();
        if (stardust[i].isDead()) {
            stardust.splice(i, 1);
        }
    }
    
    for (let p of textParticles) {
        p.update();
        p.display();
    }
    
    // 4. 绘制结束后，恢复变换矩阵
    pop();
}

// 4. 修改交互函数，将屏幕坐标转换为场景坐标
function getScaledMouseCoords() {
    // 将实际的鼠标坐标转换为缩放后场景内的坐标
    const scaledMouseX = (mouseX - offsetX) / globalScale;
    const scaledMouseY = (mouseY - offsetY) / globalScale;
    return { x: scaledMouseX, y: scaledMouseY };
}

function mouseMoved() {
    const { x, y } = getScaledMouseCoords();
    for (let i = 0; i < 2; i++) {
        stardust.push(new Stardust(x, y));
    }
}

function mousePressed() {
  if (song && !musicStarted) {
    song.loop();
    musicStarted = true;
  }
  
  const { x, y } = getScaledMouseCoords();

  const treeHeight = designHeight / 1.8;
  const topY = designHeight / 2 - treeHeight / 2;
  // 使用 designWidth 替代 width 来判断点击区域
  if (x > designWidth/4 && x < designWidth*3/4 && y > topY && y < topY + treeHeight + 40) {
    triggerTextAnimation(x, y);
    if (treeTopperStar) {
        treeTopperStar.trigger();
    }
  }
}

function triggerTextAnimation(x, y) {
  textParticles = [];
  
  const line1 = "Merry Christmas";
  const line2 = recipientName;
  
  // 字体大小现在基于 designWidth
  const fontSize = min(designWidth / 25, 50);
  
  const points1 = customFont.textToPoints(line1, 0, 0, fontSize, {
    sampleFactor: 0.25,
  });
  const points2 = customFont.textToPoints(line2, 0, 0, fontSize, {
    sampleFactor: 0.25,
  });

  const bounds1 = customFont.textBounds(line1, 0, 0, fontSize);
  const bounds2 = customFont.textBounds(line2, 0, 0, fontSize);

  const maxWidth = max(bounds1.w, bounds2.w);

  // 文本位置现在基于 designWidth 和 designHeight
  const treeRightEdge = (designWidth / 2) + (designWidth / 6) * 0.5;
  const blockX = treeRightEdge + 30;
  const blockY = designHeight / 2.5;

  const line1X = blockX + (maxWidth - bounds1.w) / 2;
  const line1Y = blockY;

  const line2X = blockX + (maxWidth - bounds2.w) / 2;
  const line2Y = line1Y + bounds1.h + 15;

  for (let pt of points1) {
    let textParticle = new TextParticle(x, y, line1X + pt.x, line1Y + pt.y);
    textParticles.push(textParticle);
  }

  for (let pt of points2) {
    let textParticle = new TextParticle(x, y, line2X + pt.x, line2Y + pt.y);
    textParticles.push(textParticle);
  }
}


function createArtisticTree() {
    treeParticles = [];
    lightParticles = [];

    // 5. 所有布局计算都基于 designWidth 和 designHeight
    const centerX = designWidth / 2;
    const treeHeight = designHeight / 1.8;
    
    const topY = designHeight / 2 - treeHeight / 2;
    const bottomY = topY + treeHeight;
    
    treeTopperStar = new ParticleStar(centerX, topY - 20);

    const maxRadius = designWidth / 6; 
    const spirals = 4;

    for (let y = topY; y < bottomY; y += 2) {
        let progress = map(y, topY, bottomY, 0, 1);
        let angle = progress * TWO_PI * spirals;

        let radiusNoise = map(noise(progress * 5), 0, 1, 0.8, 1.2);
        let radius = progress * maxRadius * radiusNoise;
        
        let x = centerX + radius * cos(angle);
        
        let brushNoise = map(noise(progress * 15 + 100), 0, 1, 0.7, 1.3);
        let brushSize = (1 + progress * 35) * brushNoise;
        
        let particlesToSpray = brushSize * 2;
        for (let i = 0; i < particlesToSpray; i++) {
            let particleX = x + random(-brushSize, brushSize);
            let particleY = y + random(-brushSize / 2, brushSize / 2);
            let greenShade = color(random(100, 200), random(200, 255), random(50, 100), random(150, 200));
            treeParticles.push({
                pos: createVector(particleX, particleY),
                color: greenShade,
            });
        }
    }
    
    const garlandSpirals = 5;
    const weaveAmount = 15;
    for (let y = topY; y < bottomY; y += 3) {
        let progress = map(y, topY, bottomY, 0, 1);
        
        let baseRadius = progress * maxRadius * map(noise(progress * 5), 0, 1, 0.8, 1.2);
        
        let garlandAngle = progress * TWO_PI * garlandSpirals;
        let garlandRadius = baseRadius + sin(garlandAngle * 2) * weaveAmount;
        
        let x = centerX + garlandRadius * cos(garlandAngle);
        
        let brushSize = 2 + progress * 8;
        
        let particlesToSpray = brushSize;
        for (let i = 0; i < particlesToSpray; i++) {
            let particleX = x + random(-brushSize, brushSize);
            let particleY = y + random(-brushSize, brushSize);
            let tinselColor = random(1) > 0.5 ? 
                color(255, 215, 0, 200) : 
                color(192, 192, 192, 200);
            treeParticles.push({
                pos: createVector(particleX, particleY),
                color: tinselColor,
            });
        }
    }

    const trunkHeight = 40;
    const trunkWidth = 10;
    const trunkY = bottomY;
    for (let i = 0; i < 100; i++) {
        let brownShade = color(random(80, 120), random(40, 60), 20);
        treeParticles.push({
            pos: createVector(centerX + random(-trunkWidth, trunkWidth), trunkY + random(trunkHeight)),
            color: brownShade
        });
    }

    const lightCount = 15;
    for (let i = 0; i < lightCount; i++) {
        let p = random(treeParticles);
        if (p && p.pos.y < trunkY && p.color.levels[1] > 150) {
            lightParticles.push(new Light(p.pos.x, p.pos.y));
        }
    }
}


function drawSnowDrift() {
    fill(245, 245, 255);
    noStroke();
    beginShape();
    // 使用 designHeight
    vertex(0, designHeight);
    const snowDriftHeight = 80;
    // 循环到 designWidth
    for (let x = 0; x <= designWidth; x += 10) {
        let y = designHeight - snowDriftHeight + noise(x * 0.01 + frameCount * 0.005) * 40;
        vertex(x, y);
    }
    vertex(designWidth, designHeight);
    endShape(CLOSE);
}

// --- 类定义 (Classes) ---
// 6. 修改类内部的边界判断
class Snowflake {
    constructor() {
        // 使用 designWidth 和 designHeight 来初始化位置
        this.posX = random(designWidth);
        this.posY = random(-designHeight, 0);
        this.posZ = random(0, 1);
        this.size = map(this.posZ, 0, 1, 1, 5);
        this.velY = map(this.posZ, 0, 1, 0.5, 2);
        this.alpha = map(this.posZ, 0, 1, 50, 255);
    }
    update() {
        this.posY += this.velY;
        let wind = noise(this.posX * 0.01, this.posY * 0.01) - 0.5;
        this.posX += wind * 0.5;
        // 使用 designHeight 和 designWidth 进行边界检查
        if (this.posY > designHeight) {
            this.posY = random(-50, 0);
            this.posX = random(designWidth);
        }
        if (this.posX > designWidth) this.posX = 0;
        if (this.posX < 0) this.posX = designWidth;
    }
    display() {
        noStroke();
        fill(255, this.alpha);
        ellipse(this.posX, this.posY, this.size);
    }
}

class Light {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.baseSize = random(5, 12);
        this.pulseSpeed = random(0.02, 0.05);
        this.color = random([color(255, 50, 50), color(255, 255, 100), color(100, 180, 255), color(255, 180, 50)]);
        this.angle = random(TWO_PI);
    }
    update() {
        this.angle += this.pulseSpeed;
        this.currentSize = this.baseSize + sin(this.angle) * 3;
    }
    display() {
        noStroke();
        let c = this.color;
        fill(c.levels[0], c.levels[1], c.levels[2], 50);
        ellipse(this.pos.x, this.pos.y, this.currentSize * 2);
        fill(c.levels[0], c.levels[1], c.levels[2], 100);
        ellipse(this.pos.x, this.pos.y, this.currentSize * 1.5);
        fill(255, 255, 240, 200);
        ellipse(this.pos.x, this.pos.y, this.currentSize * 0.7);
    }
}

class Stardust {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(random(1, 3));
        this.lifespan = 255;
        this.size = random(2, 4);
        this.color = color(255, 220, 100);
    }
    update() {
        this.pos.add(this.vel);
        this.lifespan -= 4;
    }
    isDead() {
        return this.lifespan < 0;
    }
    display() {
        noStroke();
        this.color.setAlpha(this.lifespan);
        fill(this.color);
        ellipse(this.pos.x, this.pos.y, this.size);
    }
}

class TextParticle {
  constructor(startX, startY, targetX, targetY) {
    this.pos = createVector(startX, startY);
    this.target = createVector(targetX, targetY);
    this.vel = p5.Vector.random2D().mult(random(5,10));
    this.acc = createVector();
    this.maxSpeed = 10;
    this.maxForce = 1;
    this.color = color(220, 230, 180); 
  }

  update() {
    let force = p5.Vector.sub(this.target, this.pos);
    let distance = force.mag();

    if (distance < 5) {
        this.pos = this.target.copy();
        this.vel.mult(0);
    } else {
        if (distance < 50) {
            let m = map(distance, 0, 50, 0, this.maxSpeed);
            force.setMag(m);
        } else {
            force.setMag(this.maxSpeed);
        }
        
        let steer = p5.Vector.sub(force, this.vel);
        steer.limit(this.maxForce);
        
        this.acc.add(steer);
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);

        this.vel.mult(0.95); 
    }
  }

  display() {
    stroke(this.color);
    strokeWeight(2);
    point(this.pos.x, this.pos.y);
  }
}

class ParticleStar {
    constructor(x, y) {
        this.startPos = createVector(x, y);
        this.particles = [];
        this.state = 'dormant';
    }

    trigger() {
        if (this.state !== 'dormant') return;
        this.state = 'shining';

        const radius = 25;
        const rotation = -PI / 2;

        let vertices = [];
        let angle = TWO_PI / 5;
        let halfAngle = angle / 2.0;
        for (let a = 0; a < TWO_PI; a += angle) {
            vertices.push(p5.Vector.fromAngle(a + rotation, radius));
            vertices.push(p5.Vector.fromAngle(a + halfAngle + rotation, radius * 0.4));
        }

        for (let i = 0; i < vertices.length; i++) {
            let start = vertices[i];
            let end = vertices[(i + 1) % vertices.length];
            let distance = p5.Vector.dist(start, end);
            let numPointsOnLine = floor(distance / 2);

            for (let j = 0; j < numPointsOnLine; j++) {
                let t = j / numPointsOnLine;
                let targetPos = p5.Vector.lerp(start, end, t);
                targetPos.add(this.startPos);
                this.particles.push(new StarParticle(this.startPos.x, this.startPos.y, targetPos.x, targetPos.y, true));
            }
        }
        
        const fillParticleCount = 100;
        for (let i = 0; i < fillParticleCount; i++) {
            let vA = random(vertices);
            let vB = random(vertices);
            let vC = random(vertices);

            let r1 = random();
            let r2 = random();
            let pX = (1 - sqrt(r1)) * vA.x + (sqrt(r1) * (1 - r2)) * vB.x + (sqrt(r1) * r2) * vC.x;
            let pY = (1 - sqrt(r1)) * vA.y + (sqrt(r1) * (1 - r2)) * vB.y + (sqrt(r1) * r2) * vC.y;
            
            let targetPos = createVector(pX, pY);
            targetPos.add(this.startPos);
            this.particles.push(new StarParticle(this.startPos.x, this.startPos.y, targetPos.x, targetPos.y, false));
        }
    }

    update() {
        for (let p of this.particles) {
            p.update();
        }
    }

    display() {
        for (let p of this.particles) {
            p.display();
        }
    }
}

class StarParticle extends TextParticle {
    constructor(startX, startY, targetX, targetY, isOutline) {
        super(startX, startY, targetX, targetY);
        this.isOutline = isOutline;
        
        if (this.isOutline) {
            this.color = color(255, 230, 100, random(200, 255));
            this.maxSpeed = random(10, 14);
        } else {
            this.color = color(255, 215, 0, random(100, 200));
            this.maxSpeed = random(6, 10);
        }
    }
    display() {
        stroke(this.color);
        strokeWeight(this.isOutline ? random(2, 3.5) : random(1, 2.5));
        point(this.pos.x, this.pos.y);
    }
}