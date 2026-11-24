#!/usr/bin/env node
/*
 * Give the English a reader still sees in a lesson its Chinese.
 *
 * A few lessons explain themselves with a box that opens when the
 * button is pressed.  Those boxes were left in English, so a
 * Chinese lesson still spoke English when it was read.
 *
 * The English is written down here together with the Chinese that
 * replaces it, and each one is looked for in the lessons.  A box
 * that is not found is reported, so nothing is changed by accident.
 *
 *   node tools/lq-english-alerts.mjs --check --roots mirror
 *   node tools/lq-english-alerts.mjs --fix   --roots mirror
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes('--' + name);

const ROOTS = arg('roots', 'mirror').split(',').filter(Boolean);

/*
 * The boxes that still speak English.  Each entry is the name of a
 * lesson and the English box together with the Chinese that stands
 * in its place.
 */
const BOXES = [
  {
    lesson: 'lab-course-phyc140-graph-xva',
    from: `alert('How the graphs relate (x, v, a)\\n\\n1) Slope: dx/dt = v(t)\\n   v > 0 -> x increases\\n   v < 0 -> x decreases\\n   steeper x => larger |v|\\n\\n2) Extrema of x occur where v(t) = 0\\n   v crosses + to - : x has a maximum\\n   v crosses - to + : x has a minimum\\n\\n3) Curvature: d^2x/dt^2 = a(t) = dv/dt\\n   v increasing -> a > 0 -> x bends up (concave up)\\n   v decreasing -> a < 0 -> x bends down (concave down)\\n   v constant -> a = 0 -> x is a straight line\\n\\n4) Area rule:\\n   x(t2) - x(t1) = integral of v(t) dt from t1 to t2\\n   (area under the v vs t graph equals the displacement)\\n\\n5) Dragging green points:\\n   Up/Down: change v value -> changes x slope and a level\\n   Left/Right: change duration -> more/less area -> larger/smaller change in x')`,
    to: `alert('三张图之间的关系（x、v、a）\\n\\n1) 斜率：dx/dt = v(t)\\n   v > 0 -> x 增大\\n   v < 0 -> x 减小\\n   x 越陡 -> |v| 越大\\n\\n2) x 的极值出现在 v(t) = 0 处\\n   v 由正变负：x 取最大值\\n   v 由负变正：x 取最小值\\n\\n3) 曲率：d^2x/dt^2 = a(t) = dv/dt\\n   v 增大 -> a > 0 -> x 向上弯曲（上凹）\\n   v 减小 -> a < 0 -> x 向下弯曲（下凹）\\n   v 不变 -> a = 0 -> x 为一条直线\\n\\n4) 面积法则：\\n   x(t2) - x(t1) = v(t) 从 t1 到 t2 的积分\\n   （v-t 图下的面积等于位移）\\n\\n5) 拖动绿色控制点：\\n   上/下：改变 v 的值 -> 改变 x 的斜率和 a 的高低\\n   左/右：改变时间长度 -> 面积变大/变小 -> x 的变化更大/更小')`
  },
  {
    lesson: 'lab-course-phyc240-dia-para-magnetism',
    from: `'Diamagnetism & Paramagnetism\\n\\n' +
				'Two strong electromagnets create a magnetic field mainly along the x-axis.\\n\\n' +
				'• Paramagnet (e.g., Platinum): χ > 0. The induced moment m aligns with B, so\\n' +
				'  the torque τ = m × B turns the sample to align with the field (rod along x).\\n\\n' +
				'• Diamagnet (e.g., Gold): χ < 0. Induced currents oppose B; for a slender rod,\\n' +
				'  magnetic energy is minimized when its length is perpendicular to B.\\n\\n' +
				'Effect of Size & Mass\\n' +
				'• Magnetic torque scales with susceptibility and volume: k ∝ χ · Volume.\\n' +
				'  Bigger volume or larger χ → stronger pull toward the target angle.\\n' +
				'• Rotation resists change via moment of inertia about y:\\n' +
				'  I_y ≈ (1/12) · m · (w² + d²). Heavier or thicker (larger w or d) → larger I_y → slower turning.\\n' +
				'• In this demo, the Mass slider changes height/depth, increasing both Volume (more torque)\\n' +
				'  and I_y (more inertia). Net result: heavier pieces respond more slowly and settle more gently;\\n' +
				'  smaller pieces react faster.\\n\\n' +
				'Try it: choose Platinum → it rotates toward +x. Switch to Gold → it turns back perpendicular.'`,
    to: `'抗磁性与顺磁性\\n\\n' +
				'两个强电磁铁产生的磁场主要沿 x 轴方向。\\n\\n' +
				'• 顺磁体（如铂）：χ > 0。感生磁矩 m 与 B 同向，因此\\n' +
				'  力矩 τ = m × B 使样品转向与磁场对齐（棒体沿 x 轴）。\\n\\n' +
				'• 抗磁体（如金）：χ < 0。感生电流与 B 相反；对于细长棒，\\n' +
				'  当其长度与 B 垂直时磁能最小。\\n\\n' +
				'尺寸与质量的影响\\n' +
				'• 磁力矩随磁化率与体积变化：k ∝ χ · 体积。\\n' +
				'  体积更大或 χ 更大 → 越强烈地被拉向目标角度。\\n' +
				'• 转动通过绕 y 轴的转动惯量抵抗改变：\\n' +
				'  I_y ≈ (1/12) · m · (w² + d²)。更重或更厚（w 或 d 更大）→ I_y 更大 → 转动更慢。\\n' +
				'• 在本演示中，质量滑块改变高度/厚度，同时增大体积（力矩更大）\\n' +
				'  与 I_y（惯量更大）。综合结果：较重的部件响应更慢、落定更平缓；\\n' +
				'  较小的部件反应更快。\\n\\n' +
				'试一试：选择铂 → 它转向 +x 方向。换成金 → 它转回垂直方向。'`
  },
  {
    lesson: 'lab-course-phyc240-doppler-effect',
    from: `'DOPPLER EFFECT\\n\\n' +
		'The Doppler effect is the apparent change in frequency or wavelength of a wave due to relative motion between the source and observer.\\n\\n' +
		'WHAT YOU CAN DO WITH THIS SIMULATION:\\n\\n' +
		'1. Stationary Source: Observe spherical waves expanding uniformly in all directions.\\n\\n' +
		'2. Source speed < Wave speed: Observe compressed wavefronts in front of the moving source and stretched wavefronts behind it.\\n\\n' +
		'3. S speed = W speed: Observe wavefronts accumulating in front of the source (Mach 1).\\n\\n' +
		'4. S speed > W speed: Observe the formation of a Mach cone when the source travels faster than the waves. The wavefronts overlap and form a shock wave. When this shock wave reaches an observer, the sudden change in air pressure produces a loud sound called a sonic boom, commonly heard when a supersonic aircraft flies overhead.\\n\\n' +
		'5. Pause/Resume: Pause or continue the animation.\\n\\n' +
		'6. Use your mouse to rotate, zoom, and explore the 3D wave patterns.\\n\\n' +
		'Compare the different source speeds to understand the Doppler effect and shock waves.'`,
    to: `'多普勒效应\\n\\n' +
		'多普勒效应是指波源与观察者之间存在相对运动时，波的频率或波长出现的表观变化。\\n\\n' +
		'这个模拟可以做什么：\\n\\n' +
		'1. 静止波源：观察球面波向各个方向均匀扩散。\\n\\n' +
		'2. 波源速度 < 波速：观察运动波源前方的波面被压缩，后方的波面被拉伸。\\n\\n' +
		'3. S 速度 = W 速度：观察波面在波源前方堆积（马赫数为 1）。\\n\\n' +
		'4. S 速度 > W 速度：当波源运动快于波时，观察马赫锥的形成。波面相互重叠形成激波。当激波传到观察者时，空气压力的骤变会产生巨大的声响，即音爆，在超音速飞机从头顶飞过时经常听到。\\n\\n' +
		'5. 暂停/继续：暂停或继续动画。\\n\\n' +
		'6. 用鼠标旋转、缩放，观察三维波形。\\n\\n' +
		'比较不同的波源速度，理解多普勒效应与激波。'`
  },
  {
    lesson: 'lab-course-simulation-woods-saxon',
    from: `Finite Well Potential
            
            V(r) = ∞ for r = 0
            V(r) = -V₀ for r < R
            V(r) = 0 for r > R
            
            Meaning:
            
            • V₀ is the depth of the potential well.
            • R is the radius of the well.
            
            Physical interpretation:
            
            Inside the nucleus the particle feels a constant attractive potential.
            Outside the nucleus the potential becomes zero.
            
            This simple model approximates nucleons bound in a nucleus.`,
    to: `有限深势阱
            
            V(r) = ∞ 当 r = 0
            V(r) = -V₀ 当 r < R
            V(r) = 0 当 r > R
            
            含义：
            
            • V₀ 是势阱的深度。
            • R 是势阱的半径。
            
            物理意义：
            
            在原子核内部，粒子感受到一个恒定的吸引势。
            在原子核外部，势变为零。
            
            这个简单的模型近似了束缚在原子核内的核子。`
  },
  {
    lesson: 'lab-course-simulation-woods-saxon',
    from: `Woods–Saxon Potential
            
            V(r) = -V₀ / (1 + e^((r - R)/a))
            
            Parameters:
            
            • V₀ = depth of the well
            • R = nuclear radius
            • a = surface thickness (diffuseness)
            
            Physical meaning:
            
            Real nuclei do not have a sharp edge.
            
            The Woods–Saxon potential models the gradual transition
            from the nuclear interior to the outside region.
            
            It is one of the most widely used nuclear potentials
            in nuclear physics.`,
    to: `Woods–Saxon 势
            
            V(r) = -V₀ / (1 + e^((r - R)/a))
            
            参数：
            
            • V₀ = 势阱的深度
            • R = 原子核半径
            • a = 表面厚度（弥散度）
            
            物理意义：
            
            真实的原子核没有锐利的边界。
            
            Woods–Saxon 势描述了从原子核内部到外部区域的渐变过渡。
            
            它是核物理中使用最广泛的核势之一。`
  },
  {
    lesson: 'lab-course-simulation-woods-saxon',
    from: `How to Use This Simulation
                
                1. Pick Finite Well or Woods-Saxon.
                2. Change the well parameters:
                   • Depth V₀
                   • Radius R
                   • Diffuseness a (Woods-Saxon only)
                
                3. Choose the angular momentum quantum number l.
                
                4. Click any bound-state button below the plots.
                
                5. The selected state will appear in:
                   • The energy level column on the left
                   • The wave function u(r) graph
                   • The effective potential Veff(r) graph.
                
                Physics tip:
                More negative energy means a more tightly bound state.`,
    to: `如何使用本模拟
                
                1. 选择有限深势阱或 Woods-Saxon 势。
                2. 修改势阱参数：
                   • 深度 V₀
                   • 半径 R
                   • 弥散度 a（仅 Woods-Saxon）
                
                3. 选择角动量量子数 l。
                
                4. 点击图下方任意一个束缚态按钮。
                
                5. 选中的状态会出现在：
                   • 左侧的能级一栏
                   • 波函数 u(r) 图
                   • 有效势 Veff(r) 图。
                
                物理提示：
                能量越负，束缚越紧。`
  },
  {
    lesson: 'lab-course-simulation-woods-saxon',
    from: `Simple Nuclear Models: Finite and Woods-Saxon Wells
          
          In describing nuclear material with quantum-mechanical models, there are two standard descriptions for the radial potential:
          
          1. The Finite Well
          V(r) = ∞ for r = 0,
          V(r) = -V0 for r < R,
          V(r) = 0 for r > R.
          
          The potential depth V0 describes the depth of the well, and R describes its extent.
          
          2. The Woods-Saxon Potential
          V(r) = ∞ for r = 0 and
          V(r) = -V0 / (1 + e^((r - R)/a)) for r > 0.
          
          Here:
          • V0 describes the depth of the well
          • R describes its extent
          • a describes the thickness or diffuseness of the surface
          
          The Woods-Saxon shape comes from the gradual change in nuclear charge density from a nearly constant value inside the nucleus to zero outside, over an associated distance.
          
          For radial eigenfunctions, the time-independent Schrödinger equation may be written as
          
          [-(ħ²/2μ) d²/dr² + l(l+1)ħ²/(2μr²) + V(r)] u(r) = E u(r)
          
          where:
          • μ is the mass
          • u(r) = rR(r)
          • Veff(r) = V(r) + l(l+1)ħ²/(2μr²)
          
          How to use this simulation:
          • Choose Finite Well or Woods-Saxon
          • Adjust V0, R, and a
          • Choose angular momentum l
          • Click a bound-state button to view that state
          • The selected energy level is highlighted
          • The top graph shows u(r)
          • The bottom graph shows E and Veff(r)
          
          Physics meaning:
          • More negative energy means a more tightly bound state
          • Increasing l raises the effective potential through the centrifugal term
          • A deeper or wider well usually supports more bound states`,
    to: `简单核模型：有限深势阱与 Woods-Saxon 势
          
          用量子力学模型描述核物质时，径向势有两种标准描述：
          
          1. 有限深势阱
          V(r) = ∞ 当 r = 0，
          V(r) = -V0 当 r < R，
          V(r) = 0 当 r > R。
          
          势深 V0 描述势阱的深度，R 描述它的范围。
          
          2. Woods-Saxon 势
          V(r) = ∞ 当 r = 0 且
          V(r) = -V0 / (1 + e^((r - R)/a)) 当 r > 0。
          
          其中：
          • V0 描述势阱的深度
          • R 描述它的范围
          • a 描述表面的厚度（弥散度）
          
          Woods-Saxon 形状来源于核电荷密度在一定距离内由核内近似恒定到核外为零的渐变。
          
          对于径向本征函数，定态薛定谔方程可以写成
          
          [-(ħ²/2μ) d²/dr² + l(l+1)ħ²/(2μr²) + V(r)] u(r) = E u(r)
          
          其中：
          • μ 是质量
          • u(r) = rR(r)
          • Veff(r) = V(r) + l(l+1)ħ²/(2μr²)
          
          如何使用本模拟：
          • 选择有限深势阱或 Woods-Saxon
          • 调整 V0、R 和 a
          • 选择角动量 l
          • 点击束缚态按钮查看该状态
          • 选中的能级会高亮显示
          • 上面的图显示 u(r)
          • 下面的图显示 E 和 Veff(r)
          
          物理含义：
          • 能量越负，束缚越紧
          • 增大 l 会通过离心项抬高有效势
          • 更深或更宽的势阱通常能支持更多束缚态`
  },
  {
    lesson: 'lab-reaction-cell_biology-neuron',
    from: `<div id="hud">drag to orbit · scroll to zoom · impulse fires dendrites → soma → terminals · mitochondria re-boost the signal</div>`,
    to: `<div id="hud">拖动可旋转 · 滚轮可缩放 · 冲动沿树突 → 胞体 → 末梢传递 · 线粒体为信号补充能量</div>`
  },
  {
    lesson: 'lab-reaction-cell_biology-neuron',
    from: `['SOMA'],`,
    to: `['胞体'],`
  },
  {
    lesson: 'lab-reaction-cell_biology-neuron',
    from: `['AXON'],`,
    to: `['轴突'],`
  },
  {
    lesson: 'lab-reaction-cell_biology-neuron',
    from: `['MISC'],`,
    to: `['其他'],`
  }
];

/* Every page of the given folders. */
const pages = (roots) => {
  const out = [];
  for (const root of roots) {
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let names = [];
      try {
        names = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const n of names) {
        const full = path.join(dir, n.name);
        if (n.isDirectory()) stack.push(full);
        else if (n.name.endsWith('.html')) out.push(full.split(path.sep).join('/'));
      }
    }
  }
  return out;
};

const files = pages(ROOTS);

/* The page of a lesson, in every tree it stands in. */
const pagesOf = (lesson) =>
  files.filter((f) => path.basename(f, '.html') === lesson || f.endsWith(`/${lesson}.html`));

let mended = 0;
const missing = [];

for (const box of BOXES) {
  const targets = pagesOf(box.lesson);
  if (!targets.length) {
    missing.push(`${box.lesson}  (no page of this lesson)`);
    continue;
  }
  for (const file of targets) {
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes(box.from)) {
      missing.push(`${file}  (the English is not there)`);
      continue;
    }
    if (has('fix')) {
      fs.writeFileSync(file, text.split(box.from).join(box.to), 'utf8');
    }
    mended++;
    console.log(`${file}\n  ${box.lesson}`);
  }
}

console.log(
  `\n${has('fix') ? 'put into Chinese' : 'would put into Chinese'} ${mended} boxes`
);
for (const m of missing) console.log(`  not found: ${m}`);
