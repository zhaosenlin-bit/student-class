/*
 * 《简爱》那几幅缺掉的插图，在浏览器里画。
 *
 * 浏览器有真的字体和真的曲线，所以这里的画面是拿 canvas 画的：
 * 一层暗底子、一束光、几个剪影，再压上题名。画的是我们自己的东西。
 */
(function () {
  const W = 1672;
  const H = 941;
  const SERIF =
    '"Source Han Serif SC","Noto Serif SC","Songti SC","SimSun","STSong",serif';

  const rand = (seed) => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };

  /* 暗底子：上暖下冷，中间留一点亮。 */
  function base(g, top, bottom, glow) {
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, top);
    grd.addColorStop(1, bottom);
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    if (glow) {
      const r = g.createRadialGradient(glow[0], glow[1], 0, glow[0], glow[1], glow[2]);
      r.addColorStop(0, glow[3]);
      r.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, W, H);
    }
  }

  /* 画布纹：许多很淡的小笔画。 */
  function texture(g, seed, count, alpha) {
    const r = rand(seed);
    g.save();
    for (let i = 0; i < count; i++) {
      const x = r() * W;
      const y = r() * H;
      const w = 8 + r() * 44;
      const h = 2 + r() * 4;
      g.globalAlpha = alpha * (0.2 + r() * 0.8);
      g.fillStyle = r() > 0.5 ? '#ffffff' : '#000000';
      g.beginPath();
      g.ellipse(x, y, w, h, (r() - 0.5) * 0.6, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  /*
   * 一个人：头、颈、肩、身子。身子先按着光的方向偏一点画一遍，
   * 亮的那一边就留下细细一条轮廓光。
   */
  function bodyPath(g, x, ground, h, lean, seated) {
    const headR = h * 0.062;
    const headY = ground - h * 0.84;
    g.beginPath();
    if (seated) {
      /* 坐着：上身直，两条腿往前伸 */
      g.moveTo(x - h * 0.075 + lean, ground - h * 0.36);
      g.bezierCurveTo(
        x - h * 0.09 + lean,
        ground - h * 0.52,
        x - h * 0.06 + lean,
        ground - h * 0.58,
        x - h * 0.045 + lean,
        ground - h * 0.6
      );
      g.lineTo(x + h * 0.045 + lean, ground - h * 0.6);
      g.bezierCurveTo(
        x + h * 0.065 + lean,
        ground - h * 0.57,
        x + h * 0.08 + lean,
        ground - h * 0.5,
        x + h * 0.075 + lean,
        ground - h * 0.36
      );
      g.lineTo(x + h * 0.2 + lean, ground - h * 0.34);
      g.lineTo(x + h * 0.21 + lean, ground - h * 0.26);
      g.lineTo(x + h * 0.085 + lean, ground - h * 0.26);
      g.lineTo(x + h * 0.085 + lean, ground);
      g.lineTo(x - h * 0.085 + lean, ground);
      g.lineTo(x - h * 0.085 + lean, ground - h * 0.26);
      g.lineTo(x + h * 0.02 + lean, ground - h * 0.28);
      g.lineTo(x - h * 0.075 + lean, ground - h * 0.3);
    } else {
      /* 站着：颈、肩、腰细，下摆散开 */
      const neckY = headY + headR * 1.15;
      g.moveTo(x - h * 0.022 + lean, neckY);
      g.bezierCurveTo(
        x - h * 0.062 + lean,
        neckY + h * 0.02,
        x - h * 0.072 + lean,
        neckY + h * 0.045,
        x - h * 0.07 + lean,
        neckY + h * 0.075
      );
      g.bezierCurveTo(
        x - h * 0.062 + lean,
        neckY + h * 0.09,
        x - h * 0.078 + lean,
        ground - h * 0.52,
        x - h * 0.125 + lean,
        ground
      );
      g.lineTo(x + h * 0.132 + lean, ground);
      g.bezierCurveTo(
        x + h * 0.082 + lean,
        ground - h * 0.52,
        x + h * 0.074 + lean,
        neckY + h * 0.045,
        x + h * 0.062 + lean,
        neckY + h * 0.02
      );
      g.bezierCurveTo(
        x + h * 0.04 + lean,
        neckY + h * 0.01,
        x + h * 0.022 + lean,
        neckY,
        x + h * 0.022 + lean,
        neckY
      );
      g.closePath();
      /* 脖子 */
      g.moveTo(x + lean + h * 0.022, neckY + h * 0.01);
      g.lineTo(x + lean + h * 0.022, neckY - h * 0.02);
      g.lineTo(x + lean - h * 0.022, neckY - h * 0.02);
      g.lineTo(x + lean - h * 0.022, neckY + h * 0.01);
      g.closePath();
    }
    g.closePath();
    /* 头 */
    g.moveTo(x + lean + headR * 1.02, headY);
    g.ellipse(x + lean, headY, headR, headR * 1.14, 0, 0, Math.PI * 2);
    /* 头发 */
    g.moveTo(x + lean + headR * 0.95, headY - headR * 0.3);
    g.ellipse(x + lean - headR * 0.12, headY - headR * 0.66, headR * 0.95, headR * 0.66, 0, 0, Math.PI * 2);
  }

  function person(g, x, ground, h, opts) {
    const o = opts || {};
    const body = o.body || '#0c0a08';
    const rim = o.rim || 'rgba(226,196,140,0.5)';
    const lean = o.lean || 0;
    const headY = ground - h * 0.84;
    g.save();
    /* 先偏一点画一遍，当作轮廓光 */
    if (rim && rim !== 'rgba(0,0,0,0)') {
      g.fillStyle = rim;
      bodyPath(g, x + h * 0.008, ground, h, lean, o.seated);
      g.fill();
    }
    g.fillStyle = body;
    bodyPath(g, x, ground, h, lean, o.seated);
    g.fill();
    /* 手臂 */
    if (o.arm) {
      g.strokeStyle = body;
      g.lineWidth = h * 0.028;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x + lean + h * 0.05, headY + h * 0.13);
      g.quadraticCurveTo(x + lean + h * 0.14, headY + h * 0.16, x + lean + h * 0.17, headY + h * 0.24);
      g.stroke();
    }
    g.restore();
  }

  /* 一扇窗，冷光斜进来。 */
  function windowLight(g, x, y, w, h) {
    const grd = g.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, 'rgba(168,196,222,0.92)');
    grd.addColorStop(1, 'rgba(118,150,180,0.72)');
    g.fillStyle = grd;
    g.fillRect(x, y, w, h);
    /* 窗棂 */
    g.strokeStyle = 'rgba(26,20,16,0.92)';
    g.lineWidth = w * 0.035;
    g.beginPath();
    g.moveTo(x + w * 0.5, y);
    g.lineTo(x + w * 0.5, y + h);
    g.moveTo(x, y + h * 0.44);
    g.lineTo(x + w, y + h * 0.44);
    g.stroke();
    /* 框 */
    g.strokeStyle = 'rgba(20,15,12,0.95)';
    g.lineWidth = w * 0.07;
    g.strokeRect(x, y, w, h);
    /* 落在地上的光 */
    g.save();
    g.globalCompositeOperation = 'lighter';
    const sh = g.createLinearGradient(x, y + h, x + w * 1.6, H);
    sh.addColorStop(0, 'rgba(150,182,214,0.2)');
    sh.addColorStop(1, 'rgba(150,182,214,0)');
    g.fillStyle = sh;
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(x + w, y + h);
    g.lineTo(x + w * 1.85, H);
    g.lineTo(x + w * 0.2, H);
    g.closePath();
    g.fill();
    g.restore();
  }

  /* 一盏灯。 */
  function lamp(g, x, y, r) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,224,166,0.62)');
    grd.addColorStop(0.25, 'rgba(236,182,104,0.24)');
    grd.addColorStop(1, 'rgba(210,150,80,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,238,198,0.95)';
    g.beginPath();
    g.ellipse(x, y, r * 0.035, r * 0.055, 0, 0, Math.PI * 2);
    g.fill();
  }

  /* 地面。 */
  function floor(g, y, color) {
    const grd = g.createLinearGradient(0, y, 0, H);
    grd.addColorStop(0, color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, y, W, H - y);
  }

  /* 暗角。 */
  function vignette(g, strength) {
    const grd = g.createRadialGradient(W / 2, H * 0.46, W * 0.18, W / 2, H * 0.5, W * 0.78);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,' + strength + ')');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
  }

  /* 题名。 */
  function caption(g, title, chapter, seed) {
    g.save();
    g.textAlign = 'center';
    /* 上面一条细线 */
    g.strokeStyle = 'rgba(214,186,140,0.45)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(W / 2 - 150, H * 0.795 - 76);
    g.lineTo(W / 2 + 150, H * 0.795 - 76);
    g.stroke();
    g.fillStyle = 'rgba(238,222,190,0.94)';
    g.font = '600 74px ' + SERIF;
    g.fillText(title, W / 2, H * 0.795 + 6);
    g.fillStyle = 'rgba(198,176,140,0.72)';
    g.font = '400 26px ' + SERIF;
    g.fillText(chapter, W / 2, H * 0.795 + 58);
    g.restore();
  }

  /* 一圈细边框，像书里的插页。 */
  function frame(g, alpha) {
    g.save();
    g.strokeStyle = 'rgba(206,178,132,' + alpha + ')';
    g.lineWidth = 2;
    g.strokeRect(38, 38, W - 76, H - 76);
    g.strokeStyle = 'rgba(206,178,132,' + alpha * 0.5 + ')';
    g.lineWidth = 1;
    g.strokeRect(52, 52, W - 104, H - 104);
    g.restore();
  }

  const PLATES = {
    /* 遗产来信 */
    inheritanceLetter(g) {
      base(g, '#2c241d', '#120e0b', [W * 0.72, H * 0.3, W * 0.62, 'rgba(150,176,206,0.16)']);
      floor(g, H * 0.66, 'rgba(58,42,30,0.9)');
      windowLight(g, W * 0.68, H * 0.12, W * 0.18, H * 0.36);
      /* 桌子 */
      g.fillStyle = 'rgba(52,36,25,0.95)';
      g.fillRect(W * 0.1, H * 0.7, W * 0.4, H * 0.028);
      g.fillRect(W * 0.12, H * 0.728, W * 0.016, H * 0.2);
      g.fillRect(W * 0.465, H * 0.728, W * 0.016, H * 0.2);
      /* 桌上的信 */
      g.save();
      g.translate(W * 0.27, H * 0.685);
      g.rotate(-0.06);
      g.fillStyle = 'rgba(228,216,186,0.9)';
      g.fillRect(-58, -26, 118, 44);
      g.restore();
      lamp(g, W * 0.17, H * 0.6, W * 0.13);
      person(g, W * 0.32, H * 0.99, H * 0.66, { seated: true, arm: true });
      caption(g, '遗产来信', '第六章 · 桑菲尔德的清晨', 1);
    },
    /* 园中 */
    proposalGarden(g) {
      base(g, '#232838', '#0d0b0b', [W * 0.3, H * 0.24, W * 0.7, 'rgba(240,214,166,0.16)']);
      /* 树 */
      g.fillStyle = 'rgba(14,16,15,0.92)';
      for (let i = 0; i < 9; i++) {
        const x = (i / 8) * W + (i % 2 ? 60 : -40);
        const top = H * (0.3 + ((i * 13) % 7) / 26);
        g.beginPath();
        g.moveTo(x - 26, H * 0.76);
        g.bezierCurveTo(x - 12, H * 0.58, x - 34, top + 40, x, top);
        g.bezierCurveTo(x + 34, top + 40, x + 12, H * 0.58, x + 26, H * 0.76);
        g.closePath();
        g.fill();
      }
      /* 草坡 */
      const grd = g.createLinearGradient(0, H * 0.66, 0, H);
      grd.addColorStop(0, 'rgba(28,32,24,0.9)');
      grd.addColorStop(1, 'rgba(10,10,9,0.98)');
      g.fillStyle = grd;
      g.fillRect(0, H * 0.66, W, H * 0.34);
      lamp(g, W * 0.12, H * 0.5, W * 0.12);
      lamp(g, W * 0.88, H * 0.55, W * 0.1);
      person(g, W * 0.43, H * 0.9, H * 0.66, { rim: 'rgba(240,206,150,0.42)' });
      person(g, W * 0.56, H * 0.9, H * 0.68, { rim: 'rgba(240,206,150,0.42)', lean: -6 });
      caption(g, '园中夜谈', '第六章 · 桑菲尔德的花园', 2);
    },
    /* 阁楼 */
    atticRevelation(g) {
      base(g, '#241d18', '#0a0908', [W * 0.76, H * 0.42, W * 0.5, 'rgba(232,178,104,0.22)']);
      /* 梁 */
      g.strokeStyle = 'rgba(28,22,18,0.95)';
      g.lineWidth = H * 0.032;
      for (let i = 0; i < 5; i++) {
        const x = W * (0.05 + i * 0.23);
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + W * 0.1, H * 0.44);
        g.stroke();
      }
      g.fillStyle = 'rgba(32,25,20,0.95)';
      g.fillRect(0, H * 0.4, W, H * 0.035);
      /* 斜光 */
      g.save();
      g.globalCompositeOperation = 'lighter';
      const sh = g.createLinearGradient(W * 0.06, H * 0.16, W * 0.4, H);
      sh.addColorStop(0, 'rgba(140,166,196,0.2)');
      sh.addColorStop(1, 'rgba(140,166,196,0)');
      g.fillStyle = sh;
      g.beginPath();
      g.moveTo(W * 0.06, H * 0.16);
      g.lineTo(W * 0.2, H * 0.14);
      g.lineTo(W * 0.46, H);
      g.lineTo(W * 0.12, H);
      g.closePath();
      g.fill();
      g.restore();
      lamp(g, W * 0.74, H * 0.44, W * 0.16);
      person(g, W * 0.36, H * 0.99, H * 0.5, { seated: true });
      person(g, W * 0.66, H * 0.99, H * 0.74, { rim: 'rgba(236,190,124,0.45)' });
      caption(g, '阁楼真相', '第七章 · 三十年前的那个夏天', 3);
    },
    /* 帘后 */
    berthaMason(g) {
      base(g, '#2b221c', '#0b0908', [W * 0.5, H * 0.44, W * 0.42, 'rgba(220,158,96,0.18)']);
      /* 帘子 */
      for (let i = 0; i < 11; i++) {
        const x = W * 0.04 + i * W * 0.085;
        const grd = g.createLinearGradient(x, 0, x + W * 0.05, 0);
        grd.addColorStop(0, 'rgba(62,42,34,0.95)');
        grd.addColorStop(0.5, 'rgba(38,26,21,0.95)');
        grd.addColorStop(1, 'rgba(58,39,32,0.95)');
        g.fillStyle = grd;
        g.fillRect(x, 0, W * 0.05, H * 0.8);
      }
      /* 帘后的人 */
      g.save();
      g.globalAlpha = 0.92;
      person(g, W * 0.5, H * 0.98, H * 0.66, { body: 'rgba(12,9,8,0.95)', seated: true });
      g.restore();
      lamp(g, W * 0.5, H * 0.5, W * 0.15);
      caption(g, '帘后的人', '第七章 · 疯女人', 4);
    },
    /* 重逢 */
    ferndeanReunion(g) {
      base(g, '#2f2620', '#0d0b09', [W * 0.56, H * 0.44, W * 0.6, 'rgba(240,190,120,0.26)']);
      /* 门洞 */
      g.fillStyle = 'rgba(18,14,11,0.95)';
      g.fillRect(W * 0.5, H * 0.08, W * 0.24, H * 0.86);
      const dg = g.createLinearGradient(0, H * 0.08, 0, H * 0.94);
      dg.addColorStop(0, 'rgba(236,198,140,0.95)');
      dg.addColorStop(0.6, 'rgba(206,158,96,0.9)');
      dg.addColorStop(1, 'rgba(150,110,64,0.85)');
      g.fillStyle = dg;
      g.fillRect(W * 0.52, H * 0.1, W * 0.2, H * 0.84);
      /* 门槛上的光 */
      g.save();
      g.globalCompositeOperation = 'lighter';
      const fl = g.createRadialGradient(W * 0.62, H * 0.94, 0, W * 0.62, H * 0.94, W * 0.4);
      fl.addColorStop(0, 'rgba(238,196,132,0.3)');
      fl.addColorStop(1, 'rgba(238,196,132,0)');
      g.fillStyle = fl;
      g.fillRect(0, H * 0.6, W, H * 0.4);
      g.restore();
      person(g, W * 0.28, H * 0.98, H * 0.76, { rim: 'rgba(238,198,138,0.4)' });
      person(g, W * 0.7, H * 0.98, H * 0.74, { rim: 'rgba(238,198,138,0.55)' });
      lamp(g, W * 0.15, H * 0.3, W * 0.1);
      caption(g, '重逢', '第七章 · 芬德尔庄园的门前', 5);
    },
    /* 婚礼 */
    weddingInterruption(g) {
      base(g, '#241f1e', '#0a0909', [W * 0.5, H * 0.2, W * 0.5, 'rgba(226,200,150,0.2)']);
      /* 拱 */
      g.strokeStyle = 'rgba(78,66,56,0.55)';
      g.lineWidth = H * 0.022;
      for (let i = 0; i < 4; i++) {
        const x = W * (0.09 + i * 0.26);
        g.beginPath();
        g.arc(x, H * 0.36, H * 0.2, Math.PI, 0);
        g.stroke();
        g.beginPath();
        g.moveTo(x - H * 0.011, H * 0.36);
        g.lineTo(x - H * 0.011, H * 0.92);
        g.moveTo(x + H * 0.011, H * 0.36);
        g.lineTo(x + H * 0.011, H * 0.92);
        g.stroke();
      }
      /* 人群 */
      for (let i = 0; i < 10; i++) {
        person(g, W * (0.05 + i * 0.1), H * 0.995, H * 0.52, {
          body: 'rgba(9,8,8,0.95)',
          rim: 'rgba(0,0,0,0)',
        });
      }
      /* 前面转身的那个人 */
      person(g, W * 0.5, H * 0.995, H * 0.82, {
        body: 'rgba(16,12,10,0.97)',
        rim: 'rgba(238,206,150,0.6)',
      });
      lamp(g, W * 0.5, H * 0.22, W * 0.18);
      caption(g, '婚礼惊变', '第七章 · 圣坛前的一句话', 6);
    },
  };

  window.__drawPlate = function (name, seed) {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d');
    PLATES[name](g);
    texture(g, seed || 7, 3200, 0.014);
    vignette(g, 0.58);
    frame(g, 0.4);
    return cv.toDataURL('image/png');
  };
  return 'ready';
})();
