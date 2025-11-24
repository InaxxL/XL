// =======================================================
//        艺术感升级版：交互式数字雪景球
// =======================================================

const recipientName = "";

// 1. 定义设计尺寸
const designWidth = 1600;
const designHeight = 900;
let globalScale;
let offsetX, offsetY;

// 全局变量
let snow = [];
let treeParticles = [];
let lightParticles = [];
let stardust = [];
let textParticles = [];
let stars = []; // 背景星星
let treeTopperStar;

// 树的边界，用于计算摇曳
let treeTopY, treeBottomY;

// 动态变量
let windForce = 0; // 全局风力
let timeOffset = 0; // 时间偏移，用于极光动画

let customFont;
let song;
let musicStarted = false;

const snowCount = 600; // 稍微增加雪花数量

function preload() {
  try {
    // 请确保文件名大小写与上传的一致
    customFont = loadFont("GreatVibes-Regular.ttf");
    soundFormats("mp3");
    song = loadSound("clair-de-lune.mp3");
  } catch (e) {
    console.error("资源加载失败:", e);
    customFont = "serif";
    song = null;
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  calculateLayout();

  // 初始化雪花
  for (let i = 0; i < snowCount; i++) {
    snow.push(new Snowflake());
  }
  // 根据Z轴排序，产生景深遮挡关系
  snow.sort((a, b) => a.posZ - b.posZ);

  // 初始化背景星星
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: random(designWidth),
      y: random(designHeight / 1.5), // 星星主要在天空
      size: random(1, 3),
      twinkleSpeed: random(0.02, 0.05),
      alphaOffset: random(TWO_PI),
    });
  }

  createArtisticTree();
}

function calculateLayout() {
  const scaleX = windowWidth / designWidth;
  const scaleY = windowHeight / designHeight;
  globalScale = min(scaleX, scaleY);
  offsetX = (windowWidth - designWidth * globalScale) / 2;
  offsetY = (windowHeight - designHeight * globalScale) / 2;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateLayout();
}

function draw() {
  // --- 1. 绘制背景天空 (渐变) ---
  drawGradientSky();

  push();
  translate(offsetX, offsetY);
  scale(globalScale);

  // --- 2. 绘制背景元素 ---
  drawStars(); // 星星
  drawAurora(); // 极光

  // --- 3. 计算全局动态参数 ---
  // 风力随时间变化 (Perlin Noise)
  let windNoise = noise(frameCount * 0.005);
  // 将 0-1 的 noise 映射到 -2 到 2 的风力，大部分时间微风，偶尔阵风
  windForce = map(windNoise, 0, 1, -0.5, 1.5);
  if (windNoise > 0.7) windForce *= 2; // 阵风

  // 树的摇曳系数 (正弦波)
  let treeSway = sin(frameCount * 0.02) * (5 + windForce * 5);

  // --- 4. 绘制场景 ---

  // 地面雪堆
  drawSnowDrift();

  // 树的倒影 (在树之前绘制)
  drawTreeReflection(treeSway);

  // 绘制树叶 (带摇曳)
  noStroke();
  for (let p of treeParticles) {
    // 计算粒子高度比例 (0 = 树底, 1 = 树顶)
    // 树底摇动小，树顶摇动大
    // 防止除以0
    let h = max(treeBottomY - treeTopY, 1);
    let level = constrain((treeBottomY - p.pos.y) / h, 0, 1);

    // 摇曳幅度随高度指数增长
    let swayOffset = treeSway * pow(level, 2);

    let drawX = p.pos.x + swayOffset;
    let drawY = p.pos.y;

    fill(p.color);
    // 偶尔闪烁的“霜”效果
    if (random(1) < 0.005) fill(255, 200);
    ellipse(drawX, drawY, 2.5, 2.5);
  }

  // 顶部星星
  if (treeTopperStar) {
    // 星星也跟着树顶摇曳
    let topSway = treeSway * 1.0; // 树顶摇动最大
    push();
    translate(topSway, 0);
    treeTopperStar.update();
    treeTopperStar.display();
    pop();
  }

  // 绘制灯光 (带摇曳和辉光)
  for (let light of lightParticles) {
    // 计算同样的摇曳
    let h = max(treeBottomY - treeTopY, 1);
    let level = constrain((treeBottomY - light.pos.y) / h, 0, 1);
    let swayOffset = treeSway * pow(level, 2);

    light.update();
    light.display(swayOffset);
  }

  // 绘制点击产生的星尘
  for (let i = stardust.length - 1; i >= 0; i--) {
    stardust[i].update();
    stardust[i].display();
    if (stardust[i].isDead()) stardust.splice(i, 1);
  }

  // 绘制文字粒子
  for (let p of textParticles) {
    p.update();
    p.display();
  }

  // 绘制雪花 (最后绘制，作为前景)
  for (let flake of snow) {
    flake.update(windForce);
    flake.display();
  }

  pop();

  // --- 5. 后期处理滤镜 ---
  drawVignette();
}

// --- 辅助绘制函数 ---

function drawGradientSky() {
  // 从深午夜蓝到暮光紫/蓝的渐变
  let c1 = color(5, 10, 30); // 顶部：极深蓝
  let c2 = color(30, 40, 80); // 底部：稍亮蓝

  // 利用 drawingContext 的原生 Canvas API 来做高性能渐变
  let ctx = drawingContext;
  let gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, c1.toString());
  gradient.addColorStop(1, c2.toString());

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawStars() {
  noStroke();
  for (let s of stars) {
    // 闪烁计算
    let alpha = 150 + 100 * sin(frameCount * s.twinkleSpeed + s.alphaOffset);
    fill(255, alpha);
    ellipse(s.x, s.y, s.size);
  }
}

function drawAurora() {
  // 极光效果：多层流动的噪点波浪
  noStroke();
  timeOffset += 0.005;

  // 极光颜色
  let cAurora1 = color(0, 255, 150, 10); // 绿松石
  let cAurora2 = color(150, 50, 255, 10); // 紫色

  // 绘制几条带子
  for (let i = 0; i < 2; i++) {
    fill(i === 0 ? cAurora1 : cAurora2);
    beginShape();
    let xoff = 0;
    // 沿着宽度遍历
    for (let x = 0; x <= designWidth; x += 20) {
      // y 值由噪声决定
      let n = noise(xoff, timeOffset + i * 10);
      let y = map(n, 0, 1, designHeight * 0.1, designHeight * 0.5);
      vertex(x, y);
      xoff += 0.05;
    }
    // 闭合到底部再回来，形成一个带状区域
    vertex(designWidth, designHeight * 0.6);
    vertex(0, designHeight * 0.6);
    endShape(CLOSE);
  }
}

function drawTreeReflection(sway) {
  // 简单的倒影
  push();
  noStroke();

  for (let p of treeParticles) {
    if (random(1) > 0.4) continue;

    let distFromBottom = treeBottomY - p.pos.y;
    let reflectY = treeBottomY + distFromBottom * 0.3;

    let h = max(treeBottomY - treeTopY, 1);
    let level = constrain(distFromBottom / h, 0, 1);
    let swayOffset = sway * pow(level, 2);

    let reflectX = p.pos.x + swayOffset + random(-2, 2);

    let c = p.color;
    fill(red(c), green(c), blue(c), 15);

    ellipse(reflectX, reflectY, 4, 2);
  }
  pop();
}

function drawSnowDrift() {
  fill(230, 235, 250);
  noStroke();

  beginShape();
  vertex(0, designHeight);
  for (let x = 0; x <= designWidth; x += 10) {
    let driftHeight = 80 + noise(x * 0.005, frameCount * 0.001) * 30;
    vertex(x, designHeight - driftHeight);
  }
  vertex(designWidth, designHeight);
  endShape(CLOSE);
}

function drawVignette() {
  let ctx = drawingContext;
  let cx = width / 2;
  let cy = height / 2;
  let radius = max(width, height) * 0.8;

  let gradient = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.6)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// --- 类定义 ---

class Snowflake {
  constructor() {
    this.reset();
    this.posY = random(-50, designHeight);
  }

  reset() {
    this.posX = random(designWidth);
    this.posY = random(-50, -10);
    this.posZ = random(0, 1);
    this.size = map(this.posZ, 0, 1, 1.5, 6);
    this.baseSpeed = map(this.posZ, 0, 1, 0.8, 2.5);
    this.alpha = map(this.posZ, 0, 1, 80, 255);
  }

  update(globalWind) {
    this.posY += this.baseSpeed;
    let wiggle =
      noise(this.posX * 0.01, this.posY * 0.01, frameCount * 0.01) - 0.5;
    let windEffect = globalWind * map(this.posZ, 0, 1, 0.5, 1.5);
    this.posX += wiggle + windEffect;

    if (this.posY > designHeight) {
      this.reset();
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
    this.baseSize = random(6, 10);
    this.pulseOffset = random(TWO_PI);
    this.pulseSpeed = random(0.03, 0.08);

    let rand = random(1);
    if (rand < 0.6) this.color = color(255, 220, 150);
    else if (rand < 0.8) this.color = color(255, 80, 80);
    else this.color = color(80, 180, 255);
  }

  update() {
    this.pulseOffset += this.pulseSpeed;
  }

  display(swayX) {
    let drawX = this.pos.x + swayX;
    let drawY = this.pos.y;

    let scale = 1 + sin(this.pulseOffset) * 0.2;
    let r = this.baseSize * scale;

    noStroke();
    let c = this.color;
    fill(red(c), green(c), blue(c), 30);
    ellipse(drawX, drawY, r * 3.5);

    fill(red(c), green(c), blue(c), 80);
    ellipse(drawX, drawY, r * 1.5);

    fill(255, 255, 200, 230);
    ellipse(drawX, drawY, r * 0.5);
  }
}

class Stardust {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(0.5, 2));
    this.lifespan = 255;
    this.size = random(2, 5);
    this.color = color(255, 250, 150);
  }
  update() {
    this.pos.add(this.vel);
    this.lifespan -= 5;
    this.size *= 0.95;
  }
  isDead() {
    return this.lifespan < 0;
  }
  display() {
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), this.lifespan);
    ellipse(this.pos.x, this.pos.y, this.size);
  }
}

class TextParticle {
  constructor(startX, startY, targetX, targetY) {
    this.pos = createVector(startX, startY);
    this.target = createVector(targetX, targetY);
    this.vel = p5.Vector.random2D().mult(random(5, 10));
    this.acc = createVector();
    this.maxSpeed = 12;
    this.maxForce = 0.8;
    this.color = color(255, 230, 150);
  }

  update() {
    let force = p5.Vector.sub(this.target, this.pos);
    let distance = force.mag();

    if (distance < 2) {
      this.pos = this.target.copy();
      this.vel.mult(0);
    } else {
      if (distance < 80) {
        let m = map(distance, 0, 80, 0, this.maxSpeed);
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
      this.vel.mult(0.92);
    }
  }

  display() {
    stroke(this.color);
    strokeWeight(2.5);
    point(this.pos.x, this.pos.y);
  }
}

class ParticleStar {
  constructor(x, y) {
    this.startPos = createVector(x, y);
    this.particles = [];
    this.state = "dormant";
  }

  trigger() {
    if (this.state !== "dormant") return;
    this.state = "shining";

    const radius = 35; // 五角星外径
    const rotation = -PI / 2;

    let vertices = [];
    let angle = TWO_PI / 5;
    let halfAngle = angle / 2.0;

    // 1. 计算五角星的所有顶点 (5个外点，5个内点)
    for (let a = 0; a < TWO_PI; a += angle) {
      // 外顶点
      vertices.push(p5.Vector.fromAngle(a + rotation, radius));
      // 内顶点 (半径缩小为0.4)
      vertices.push(
        p5.Vector.fromAngle(a + halfAngle + rotation, radius * 0.4)
      );
    }

    // 2. 边缘描边粒子 (保持不变)
    for (let i = 0; i < vertices.length; i++) {
      let start = vertices[i];
      let end = vertices[(i + 1) % vertices.length];
      let d = p5.Vector.dist(start, end);
      let steps = floor(d / 2);

      for (let j = 0; j < steps; j++) {
        let t = j / steps;
        let tx = lerp(start.x, end.x, t) + this.startPos.x;
        let ty = lerp(start.y, end.y, t) + this.startPos.y;
        this.particles.push(
          new StarParticle(this.startPos.x, this.startPos.y, tx, ty, true)
        );
      }
    }

    // 3. 内部填充粒子 (完全重写)
    // 使用三角形剖分法：五角星由10个小三角形组成 (中心点到每两个相邻顶点)
    // 这样可以确保粒子均匀分布在整个五角星内，不只集中在中心
    const fillParticleCount = 150;
    for (let i = 0; i < fillParticleCount; i++) {
      // 随机选择一个三角形扇区 (0-9)
      let triIndex = floor(random(10));

      // 获取该三角形的三个顶点 (局部坐标)
      let p0 = createVector(0, 0); // 中心
      let p1 = vertices[triIndex];
      let p2 = vertices[(triIndex + 1) % 10];

      // 在三角形内生成随机点 (重心坐标法)
      let r1 = random();
      let r2 = random();

      // 保证点在三角形内 (sqrt分布保证均匀性)
      let sqrtR1 = sqrt(r1);
      let w0 = 1 - sqrtR1;
      let w1 = sqrtR1 * (1 - r2);
      let w2 = sqrtR1 * r2;

      let px = p0.x * w0 + p1.x * w1 + p2.x * w2;
      let py = p0.y * w0 + p1.y * w1 + p2.y * w2;

      // 转换回全局坐标
      let tx = this.startPos.x + px;
      let ty = this.startPos.y + py;

      this.particles.push(
        new StarParticle(this.startPos.x, this.startPos.y, tx, ty, false)
      );
    }
  }

  update() {
    for (let p of this.particles) {
      p.update();
    }
  }

  display() {
    // 待机状态：发光占位符
    if (this.state === "dormant") {
      noStroke();
      // fill(255, 255, 100, 50 + 30 * sin(frameCount * 0.1));
      // ellipse(this.startPos.x, this.startPos.y, 60);
      fill(215, 215, 100);
      ellipse(this.startPos.x, this.startPos.y, 15);
    } else {
      for (let p of this.particles) {
        p.display();
      }
    }
  }
}

class StarParticle extends TextParticle {
  constructor(startX, startY, targetX, targetY, isOutline) {
    super(startX, startY, targetX, targetY);
    this.isOutline = isOutline;
    if (this.isOutline) {
      this.color = color(255, 240, 100);
      this.maxSpeed = random(8, 12);
    } else {
      // 填充粒子颜色稍微淡一点
      this.color = color(255, 215, 50, 220);
      this.maxSpeed = random(4, 8);
    }
  }
}

// 坐标转换工具
function getScaledMouseCoords() {
  const scaledMouseX = (mouseX - offsetX) / globalScale;
  const scaledMouseY = (mouseY - offsetY) / globalScale;
  return { x: scaledMouseX, y: scaledMouseY };
}

function mouseMoved() {
  const { x, y } = getScaledMouseCoords();
  if (random(1) < 0.3) {
    stardust.push(new Stardust(x, y));
  }
}

function mousePressed() {
  if (song && !musicStarted) {
    song.setVolume(0.5);
    song.loop();
    musicStarted = true;
  }

  const { x, y } = getScaledMouseCoords();

  const treeW = designWidth / 3;
  const treeTop = treeTopY - 50;
  const treeBottom = treeBottomY + 50;

  if (
    x > designWidth / 2 - treeW / 2 &&
    x < designWidth / 2 + treeW / 2 &&
    y > treeTop &&
    y < treeBottom
  ) {
    triggerTextAnimation(x, y);
    if (treeTopperStar) treeTopperStar.trigger();
  }
}

function triggerTextAnimation(x, y) {
  textParticles = [];
  const line1 = "Merry Christmas";
  const line2 = recipientName;
  const fontSize = 45;

  let bounds1 = customFont.textBounds(line1, 0, 0, fontSize);
  let bounds2 = customFont.textBounds(line2, 0, 0, fontSize);

  let targetX = designWidth / 2 + 250;
  let targetY = designHeight / 2 - 50;

  let pts1 = customFont.textToPoints(line1, targetX, targetY, fontSize, {
    sampleFactor: 0.2,
  });
  for (let pt of pts1) {
    textParticles.push(new TextParticle(x, y, pt.x - bounds1.w / 2, pt.y));
  }

  let pts2 = customFont.textToPoints(line2, targetX, targetY + 80, fontSize, {
    sampleFactor: 0.2,
  });
  for (let pt of pts2) {
    textParticles.push(new TextParticle(x, y, pt.x - bounds2.w / 2, pt.y));
  }
}

function createArtisticTree() {
  treeParticles = [];
  lightParticles = [];

  const centerX = designWidth / 2;
  const treeH = designHeight / 1.6;

  treeTopY = designHeight / 2 - treeH / 2 + 50;
  treeBottomY = treeTopY + treeH;

  treeTopperStar = new ParticleStar(centerX, treeTopY - 15);

  const maxRadius = designWidth / 5.5;

  // 1. 构建树的主体
  for (let y = treeTopY; y < treeBottomY; y += 1.5) {
    let progress = map(y, treeTopY, treeBottomY, 0, 1);
    let r = progress * maxRadius * map(noise(y * 0.02), 0, 1, 0.8, 1.1);

    let angle = progress * 40;
    let x = centerX + cos(angle) * r;

    let brush = (1 - progress) * 5 + 15;

    let count = 3;
    for (let i = 0; i < count; i++) {
      let px = x + random(-brush, brush);
      let py = y + random(-brush / 2, brush / 2);

      let g = random(100, 220);
      let col = color(random(20, 60), g, random(40, 90), 220);

      treeParticles.push({ pos: createVector(px, py), color: col });
    }
  }

  // 2. 填充内部
  for (let i = 0; i < 2000; i++) {
    let y = random(treeTopY, treeBottomY);
    let progress = map(y, treeTopY, treeBottomY, 0, 1);
    let maxR = progress * maxRadius * 0.9;
    let x = centerX + random(-maxR, maxR);
    if (dist(x, 0, centerX, 0) < maxR) {
      let col = color(random(30, 70), random(80, 180), random(30, 80), 200);
      treeParticles.push({ pos: createVector(x, y), color: col });
    }
  }

  // 3. 装饰灯光
  const lightCount = 50;
  for (let i = 0; i < lightCount; i++) {
    let y = random(treeTopY + 30, treeBottomY - 20);
    let progress = map(y, treeTopY, treeBottomY, 0, 1);
    let r = progress * maxRadius * 0.9;
    let angle = random(TWO_PI);
    let x = centerX + cos(angle) * r;

    lightParticles.push(new Light(x, y));
  }

  // 4. 树干
  let trunkW = 30;
  let trunkH = 50;
  for (let x = centerX - trunkW / 2; x < centerX + trunkW / 2; x += 2) {
    for (let y = treeBottomY; y < treeBottomY + trunkH; y += 2) {
      if (random(1) < 0.8) {
        treeParticles.push({
          pos: createVector(x, y),
          color: color(60, 40, 20),
        });
      }
    }
  }
}
