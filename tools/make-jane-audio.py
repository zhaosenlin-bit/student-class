#!/usr/bin/env python
"""《简爱》这门课里缺掉的那几段声音，在这里合成出来。

原站上的音频已经取不回来了，课件里却还留着地址，浏览器里只会报 404。
这里按每段声音该有的样子，把波形直接算出来：柴门的吱呀、壁炉的
噼啪、窗外的雨、屋里的回声，还有走廊上的脚步。

先算成 wav，再让 ffmpeg 压成 mp3，两边镜像里各放一份。

    python tools/make-jane-audio.py
"""

import math
import os
import random
import struct
import subprocess
import sys
import wave

SR = 44100

# Windows 的默认控制台是 GBK，中文进度直接打印会变成乱码，这里改成 UTF-8。
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOTS = [
    "mirror/leqixiang/courseware/afe-842.assets/assets",
    "mirror/aifunengjiaoyu/courseware/842.assets/assets",
]


def ffmpeg_path():
    local = os.environ.get("LOCALAPPDATA", "")
    for p in [
        local
        + r"\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin\ffmpeg.exe",
        local
        + r"\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe",
    ]:
        if os.path.exists(p):
            return p
    return None


def blank(seconds):
    return [0.0] * int(SR * seconds)


def white(buf, gain=1.0):
    for i in range(len(buf)):
        buf[i] += random.uniform(-1.0, 1.0) * gain


def brown(buf, gain=1.0):
    last = 0.0
    for i in range(len(buf)):
        last = (last + random.uniform(-1.0, 1.0) * 0.06) * 0.998
        buf[i] += last * gain * 8.0


def pink(buf, gain=1.0):
    b0 = b1 = b2 = 0.0
    for i in range(len(buf)):
        w = random.uniform(-1.0, 1.0)
        b0 = 0.99765 * b0 + w * 0.0990460
        b1 = 0.96300 * b1 + w * 0.2965164
        b2 = 0.57000 * b2 + w * 1.0526913
        buf[i] += (b0 + b1 + b2 + w * 0.1848) * gain * 0.22


def lowpass(buf, cutoff):
    a = 1.0 - math.exp(-2.0 * math.pi * cutoff / SR)
    y = 0.0
    for i in range(len(buf)):
        y += a * (buf[i] - y)
        buf[i] = y


def highpass(buf, cutoff):
    a = 1.0 - math.exp(-2.0 * math.pi * cutoff / SR)
    y = 0.0
    prev = 0.0
    for i in range(len(buf)):
        y = a * (y + buf[i] - prev)
        prev = buf[i]
        buf[i] = y


def band(buf, low, high):
    lowpass(buf, high)
    highpass(buf, low)


def tone(buf, freq, gain=1.0, start=0.0, decay=None, lfo=0.0, lfo_depth=0.0):
    """一个正弦。lfo 是它的强弱起伏，decay 是自然衰减。"""
    n0 = int(start * SR)
    phase = 0.0
    for i in range(n0, len(buf)):
        t = (i - n0) / SR
        f = freq
        if decay:
            f = freq
        phase += 2.0 * math.pi * f / SR
        v = math.sin(phase)
        if decay:
            v *= math.exp(-decay * t)
        if lfo:
            v *= 1.0 - lfo_depth + lfo_depth * math.sin(2.0 * math.pi * lfo * t)
        buf[i] += v * gain


def swell(buf, freq, gain, at, width, decay=0.0):
    """一个慢慢涨起来又落下去的单音。"""
    n0 = int(at * SR)
    n = int(width * SR)
    phase = 0.0
    for i in range(n):
        if n0 + i >= len(buf):
            break
        t = i / SR
        env = math.sin(math.pi * min(1.0, t / width)) ** 1.5
        if decay:
            env *= math.exp(-decay * t)
        phase += 2.0 * math.pi * freq / SR
        buf[n0 + i] += math.sin(phase) * gain * env


def pops(buf, count, gain, low, high, at, span, decay=60.0, floor=0.004):
    """一串短促的爆响：柴火的噼啪、雨点、脚步的咔哒。"""
    for _ in range(count):
        pos = int((at + random.uniform(0, span)) * SR)
        length = int(random.uniform(0.006, 0.03) * SR)
        g = gain * random.uniform(0.35, 1.0)
        for i in range(length):
            if pos + i >= len(buf):
                break
            env = math.exp(-decay * (i / SR))
            buf[pos + i] += random.uniform(-1.0, 1.0) * g * env
    band(buf, low, high)


def echo(buf, taps):
    """几个回声叠上去，房子就有深度了。"""
    out = buf[:]
    for delay, gain in taps:
        n = int(delay * SR)
        for i in range(n, len(out)):
            out[i] += out[i - n] * gain
    return out


def fade(buf, attack=0.0, release=0.0):
    n = len(buf)
    a = int(attack * SR)
    r = int(release * SR)
    for i in range(min(a, n)):
        buf[i] *= i / max(1, a)
    for i in range(min(r, n)):
        buf[n - 1 - i] *= i / max(1, r)


def save(buf, path):
    peak = max(0.0001, max(abs(v) for v in buf))
    scale = 0.82 / peak if peak > 0.82 else 1.0
    frames = bytearray()
    for v in buf:
        s = int(max(-1.0, min(1.0, v * scale)) * 32767)
        frames += struct.pack("<h", s)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(frames))


def clip_gate():
    buf = blank(7.0)
    phase = 0.0
    for i in range(len(buf)):
        t = i / SR
        f = 112.0 + 78.0 * math.sin(2.0 * math.pi * 0.17 * t)
        phase += 2.0 * math.pi * f / SR
        env = 0.35 + 0.65 * max(0.0, math.sin(2.0 * math.pi * 0.52 * t))
        buf[i] += math.sin(phase) * 0.22 * env
        buf[i] += math.sin(phase * 2.01) * 0.07 * env
    tone(buf, 470.0, 0.05, 0.4, lfo=0.6, lfo_depth=0.9)
    pops(buf, 3, 0.3, 400, 2600, 1.1, 2.0, decay=40.0)
    lowpass(buf, 2400)
    buf = echo(buf, [(0.19, 0.28), (0.34, 0.16)])
    fade(buf, 0.5, 1.0)
    return buf


def clip_fire():
    buf = blank(9.0)
    brown(buf, 0.16)
    lowpass(buf, 420)
    pops(buf, 190, 0.55, 1700, 9000, 0.0, 9.0, decay=70.0)
    fade(buf, 0.4, 1.0)
    return buf


def clip_friendship():
    buf = blank(8.0)
    for f, g in ((220.0, 0.15), (277.18, 0.11), (329.63, 0.08), (440.0, 0.04)):
        tone(buf, f, g, lfo=0.13, lfo_depth=0.28)
    tone(buf, 660.0, 0.035, lfo=0.31, lfo_depth=0.7)
    lowpass(buf, 2500)
    buf = echo(buf, [(0.32, 0.24)])
    fade(buf, 1.2, 1.5)
    return buf


def clip_lowood():
    buf = blank(12.0)
    wind = blank(12.0)
    brown(wind, 0.24)
    lowpass(wind, 950)
    for i in range(len(wind)):
        t = i / SR
        wind[i] *= 0.45 + 0.55 * (0.5 + 0.5 * math.sin(2.0 * math.pi * 0.13 * t))
    for i in range(len(buf)):
        buf[i] += wind[i]
    for k in range(2):
        swell(buf, 392.0, 0.16, 2.0 + k * 6.0, 1.3, decay=2.2)
        swell(buf, 587.0, 0.05, 2.0 + k * 6.0, 1.3, decay=2.6)
    buf = echo(buf, [(0.6, 0.4), (1.1, 0.24)])
    fade(buf, 1.5, 2.0)
    return buf


def clip_night():
    buf = blank(10.0)
    wind = blank(10.0)
    brown(wind, 0.18)
    lowpass(wind, 520)
    for i in range(len(wind)):
        t = i / SR
        wind[i] *= 0.5 + 0.5 * (0.5 + 0.5 * math.sin(2.0 * math.pi * 0.09 * t))
    for i in range(len(buf)):
        buf[i] += wind[i]
    for k in range(int(10.0 / 0.72)):
        at = k * 0.72 + random.uniform(0.0, 0.08)
        for rep in range(3):
            swell(buf, 4380.0, 0.05, at + rep * 0.045, 0.03, decay=40.0)
    highpass(buf, 3000)
    fade(buf, 1.0, 1.5)
    return buf


def clip_rain():
    buf = blank(10.0)
    pink(buf, 1.0)
    highpass(buf, 650)
    lowpass(buf, 7500)
    drops = blank(10.0)
    pops(drops, 110, 0.4, 2100, 11000, 0.0, 10.0, decay=90.0)
    for i in range(len(buf)):
        buf[i] += drops[i]
    fade(buf, 0.8, 1.0)
    return buf


def clip_redroom():
    buf = blank(10.0)
    tone(buf, 55.0, 0.28, lfo=0.09, lfo_depth=0.3)
    tone(buf, 82.41, 0.12, lfo=0.09, lfo_depth=0.3)
    lowpass(buf, 1300)
    buf = echo(buf, [(0.42, 0.55), (0.93, 0.4), (1.6, 0.26)])
    fade(buf, 1.5, 2.0)
    return buf


def clip_steps():
    buf = blank(9.0)
    k = 0
    while k * 0.64 < 9.0:
        at = k * 0.64 + random.uniform(0.0, 0.03)
        thud = blank(0.3)
        tone(thud, 95.0, 0.55, decay=26.0)
        pops(thud, 1, 0.5, 200, 1500, 0.0, 0.01, decay=55.0)
        n0 = int(at * SR)
        for i in range(len(thud)):
            if n0 + i < len(buf):
                buf[n0 + i] += thud[i]
        k += 1
    lowpass(buf, 1600)
    buf = echo(buf, [(0.18, 0.26)])
    fade(buf, 0.4, 1.0)
    return buf


def clip_encounter():
    buf = blank(8.0)
    phase = 0.0
    for i in range(len(buf)):
        t = i / SR
        f = 68.0 + 22.0 * t
        phase += 2.0 * math.pi * f / SR
        buf[i] += math.sin(phase) * 0.2
    for k in range(8):
        pops(buf, 1, 0.4, 1600, 3000, k * 1.0, 0.01, decay=60.0)
    lowpass(buf, 900)
    buf = echo(buf, [(0.38, 0.42), (0.82, 0.26)])
    fade(buf, 1.0, 1.5)
    return buf


def clip_thornfield():
    buf = blank(10.0)
    for f, g in ((146.83, 0.13), (220.0, 0.11), (293.66, 0.08), (349.23, 0.05)):
        tone(buf, f, g, lfo=0.11, lfo_depth=0.35)
    pulse = blank(10.0)
    tone(pulse, 73.42, 0.12, decay=0.15)
    for i in range(len(buf)):
        buf[i] += pulse[i]
    lowpass(buf, 2200)
    buf = echo(buf, [(0.45, 0.38), (0.98, 0.24)])
    fade(buf, 1.5, 2.0)
    return buf


CLIPS = [
    ("audio/bracken-gate.mp3", clip_gate),
    ("audio/fireplace.mp3", clip_fire),
    ("audio/jane_helen_friendship.mp3", clip_friendship),
    ("audio/lowood_theme.mp3", clip_lowood),
    ("audio/night-ambience.mp3", clip_night),
    ("audio/rain-on-thornfield.mp3", clip_rain),
    ("audio/red-room-echo.mp3", clip_redroom),
    ("audio/wooden-footsteps.mp3", clip_steps),
    ("chapter03/rochester_encounter.mp3", clip_encounter),
    ("chapter03/thornfield_theme.mp3", clip_thornfield),
]


def main():
    force = "--force" in sys.argv
    ff = ffmpeg_path()
    if not ff:
        print("没找到 ffmpeg")
        return 1
    tmp = os.path.join("recon", "art", "jane-audio")
    os.makedirs(tmp, exist_ok=True)
    random.seed(20261118)
    made = 0
    for rel, fn in CLIPS:
        dest = os.path.join(ROOTS[0], rel)
        if not force and os.path.exists(dest):
            print("已经有了 " + rel)
            continue
        wav = os.path.join(tmp, rel.replace("/", "_").replace("\\", "_") + ".wav")
        mp3 = os.path.join(tmp, rel.replace("/", "_").replace("\\", "_") + ".mp3")
        save(fn(), wav)
        r = subprocess.run(
            [
                ff,
                "-loglevel",
                "error",
                "-y",
                "-i",
                wav,
                "-c:a",
                "libmp3lame",
                "-ar",
                "44100",
                "-ac",
                "1",
                "-b:a",
                "96k",
                mp3,
            ],
            capture_output=True,
        )
        if r.returncode != 0:
            print("没做成 " + rel + "：" + r.stderr.decode("utf8", "ignore")[-200:])
            continue
        for root in ROOTS:
            d = os.path.join(root, rel)
            os.makedirs(os.path.dirname(d), exist_ok=True)
            with open(mp3, "rb") as a, open(d, "wb") as b:
                b.write(a.read())
        made += 1
        print("做好 " + rel + "  " + str(round(os.path.getsize(mp3) / 1024)) + "KB")
    print("一共做好 " + str(made) + " 段")
    return 0


if __name__ == "__main__":
    sys.exit(main())
