#!/usr/bin/env node
/*
 * 《简爱》这门课里缺掉的那些插画，在���里画出来。
 *
 * 原站上这批画已经取不回来了，课件里却还留着地址，浏览器里只会裂开。
 * 这里按课件原有的画风重新画一批：深色的油彩、十九世纪的英国、
 * 暖炉火和冷雨光，人物是全身立像，场景是宽幅横图。
 *
 * 画好的一张，两边镜像里都放一份。
 *
 *   node tools/make-jane-assets.mjs            只画还没有的
 *   node tools/make-jane-assets.mjs --force    重画
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const FORCE = process.argv.includes('--force');
const ONLY = (() => {
  const at = process.argv.indexOf('--only');
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1].split(',') : null;
})();
const PARALLEL = Number((process.argv.find((a) => a.startsWith('--jobs=')) || '--jobs=3').split('=')[1]);

const ROOTS = [
  'mirror/leqixiang/courseware/afe-842.assets/assets',
  'mirror/aifunengjiaoyu/courseware/842.assets/assets'
];

const GEN =
  process.env.USERPROFILE +
  '\\.codex\\skills\\aixj-image-generator\\scripts\\image_gen.py';
const FFMPEG =
  process.env.LOCALAPPDATA + '\\Programs\\Python\\Python312\\Scripts\\ffmpeg.exe';

const SCENE_STYLE =
  ', 19th-century English literary oil painting, cinematic chiaroscuro lighting, ' +
  'muted earthy palette of brown ochre deep green and cold grey, visible canvas texture, ' +
  '16:9 cinematic wide composition, no text, no watermark, no lettering, no modern objects';

const PORTRAIT_STYLE =
  ', full body, standing straight facing the viewer, hands visible, ' +
  'dark vignetted background fading to black, 19th-century English novel character portrait ' +
  'in oil painting style, muted earthy palette, soft rim light, no text, no watermark, ' +
  'no scenery, isolated figure';

const GIRL =
  'a young English girl about twelve years old with dark brown hair in two low braids, ' +
  'wearing a plain black high-collared cotton dress with a white collar and small buttons, ' +
  'a narrow dark belt, black stockings and worn black lace-up boots';

const IMAGES = [
  /* ---- 背景：没有人物，只有屋子 ---- */
  {
    rel: 'backgrounds/bg_001_gateshead_exterior.png',
    size: [1672, 941],
    prompt:
      'The exterior of a large English country manor house at dusk in 1830s England, ' +
      'grey stone walls, bare elm trees, an iron gate, a gravel drive, cold overcast sky' +
      SCENE_STYLE
  },
  {
    rel: 'backgrounds/bg_004_red_room.png',
    size: [1672, 941],
    prompt:
      "A small child's bedroom in an old English manor, deep red papered walls, " +
      'a narrow bed covered with a red counterpane, cold moonlight through a mullioned window, ' +
      'a wooden chair, an empty room with no people' +
      SCENE_STYLE
  },
  {
    rel: 'backgrounds/bg_005_red_room_hallway.png',
    size: [1672, 941],
    prompt:
      'A narrow panelled hallway inside an old English manor, deep red wallpaper, ' +
      'a faded runner carpet on the floor, closed doors on both sides, one guttering wall candle, ' +
      'empty corridor with no people' +
      SCENE_STYLE
  },

  /* ---- 人物：全身立像 ---- */
  {
    rel: 'characters/char_jane_reading.png',
    size: [944, 1666],
    prompt: GIRL + ', holding an open book in both hands, absorbed in reading' + PORTRAIT_STYLE
  },
  {
    rel: 'characters/char_jane_defiant.png',
    size: [944, 1666],
    prompt:
      GIRL + ', chin lifted, hands clasped in front of her, proud and defiant expression, ' +
      'steady gaze' +
      PORTRAIT_STYLE
  },
  {
    rel: 'characters/char_jane_afraid.png',
    size: [944, 1666],
    prompt:
      GIRL + ', shoulders drawn in, arms crossed protectively, wide startled frightened eyes, ' +
      'pale face' +
      PORTRAIT_STYLE
  },
  {
    rel: 'characters/char_jane_departure.png',
    size: [944, 1666],
    prompt:
      GIRL + ', seen from behind, turning away to leave, a small bundle in one hand and a worn ' +
      'shawl over her shoulder, walking toward a doorway' +
      PORTRAIT_STYLE
  },
  {
    rel: 'characters/char_john_reed.png',
    size: [944, 1666],
    prompt:
      'A stern middle-aged English gentleman of the 1830s, tall and broad, dark frock coat, ' +
      'high white collar, severe cold expression, clean shaven, short dark hair' +
      PORTRAIT_STYLE
  },
  {
    rel: 'characters/char_lloyd.png',
    size: [944, 1666],
    prompt:
      'A young English gentleman of the 1830s, plain dark working coat with an open collar, ' +
      'dark hair, calm steady face, gentle bearing' +
      PORTRAIT_STYLE
  },
  {
    rel: 'characters/char_eliza.png',
    size: [944, 1666],
    prompt:
      'A middle-aged English housekeeper, plain dark servant dress with a white apron and white cap, ' +
      'round face, stern watchful eyes' +
      PORTRAIT_STYLE
  },

  /* ---- 第二章：洛伍德 ---- */
  {
    rel: 'chapter02/lowood_exterior.png',
    size: [1672, 941],
    prompt:
      'A bleak charity school for orphan girls on a windswept moor in 1830s England, ' +
      'grey stone building, low leaden sky, bare heather, wet path, no people' +
      SCENE_STYLE
  },
  {
    rel: 'chapter02/lowood_garden.png',
    size: [1672, 941],
    prompt:
      'The small walled garden of a charity school, overgrown shrubs, a wooden bench, ' +
      'grey sky, damp grass, no people' +
      SCENE_STYLE
  },
  {
    rel: 'chapter02/lowood_classroom.png',
    size: [1672, 941],
    prompt:
      'A bare charity school classroom, long worn wooden desks and benches, a plain slate, ' +
      'cold daylight from a high window, bleak empty room, no people' +
      SCENE_STYLE
  },
  {
    rel: 'chapter02/lowood_dining_room.png',
    size: [1672, 941],
    prompt:
      'A long refectory table in a charity school dining hall, plain tin plates and bowls, ' +
      'a long table with benches, a stern teacher standing at the far end, no children' +
      SCENE_STYLE
  },
  {
    rel: 'chapter02/lowood_winter_life.png',
    size: [1672, 941],
    prompt:
      'Orphan schoolgirls in thin worn coats and bare feet trudging through sleet and snow ' +
      'across a moor, breath visible in the cold air, hunched against the weather' +
      SCENE_STYLE
  },
  {
    rel: 'chapter02/lowood_students.png',
    size: [1672, 941],
    prompt:
      'Poor orphan schoolgirls in plain grey uniforms standing in a line in a cold stone courtyard, ' +
      'a tall stern teacher beside them, all with bare feet and thin shawls' +
      SCENE_STYLE
  },
  {
    rel: 'chapter02/jane_lowood_child.png',
    size: [1672, 941],
    prompt:
      'A small girl of about eight with dark hair in pigtails, wearing a plain grey pinafore dress, ' +
      'sitting on the bare floor of a dormitory, knees pulled to her chest' +
      SCENE_STYLE
  },
  {
    rel: 'chapter02/helen_illness.png',
    size: [1672, 941],
    prompt:
      'A thin pale sick girl of about eight lying in a plain bed, a basin and a small lamp on the ' +
      'bedside stool, a kind nurse sitting beside her, dim room' +
      SCENE_STYLE
  },
  {
    rel: 'chapter02/mr_brocklehurst.png',
    size: [1672, 941],
    prompt:
      'A severe clergyman in black robes with a white collar, standing in a doorway with a stern ' +
      'expression, a book in his hand, cold light behind him' +
      SCENE_STYLE
  },

  /* ---- 第三章：桑菲尔德 ---- */
  {
    rel: 'chapter03/thornfield_exterior.png',
    size: [1672, 941],
    prompt:
      'The exterior of a great English country house at dusk, grey stone and ivy, ' +
      'warm lit windows, a carriage drive, wet lawn, no people' +
      SCENE_STYLE
  },
  {
    rel: 'chapter03/hay_lane.png',
    size: [1672, 941],
    prompt:
      'A narrow country lane between high stone walls with a hay cart, low hedges, ' +
      'evening light, no people' +
      SCENE_STYLE
  },
  {
    rel: 'chapter03/jane_meets_rochester.png',
    size: [1672, 941],
    prompt:
      'A young English governess in plain black dress meeting a tall stern middle-aged man in a ' +
      'dark coat in the doorway of a country house, an awkward first encounter, she looks down, ' +
      'he looks at her sharply' +
      SCENE_STYLE
  },
  {
    rel: 'chapter03/jane_room.png',
    size: [1672, 941],
    prompt:
      'A small attic bedroom under a sloping roof in an English country house, a narrow bed, ' +
      'plain deal furniture, frost on the window pane, cold grey light' +
      SCENE_STYLE
  },
  {
    rel: 'chapter03/mr_rochester.png',
    size: [1672, 941],
    prompt:
      'A tall broad-shouldered middle-aged English gentleman of the 1830s with a stern weathered ' +
      'face and dark hair, black coat, standing in a dim panelled hall by a fireplace' +
      SCENE_STYLE
  },
  {
    rel: 'chapter03/mrs_fairfax.png',
    size: [1672, 941],
    prompt:
      'A stout elderly English housekeeper in a plain dark dress with a white cap and apron, ' +
      'kind round face, holding a ring of keys, standing in a hall' +
      SCENE_STYLE
  },
  {
    rel: 'chapter03/adele_varens.png',
    size: [1672, 941],
    prompt:
      'A lively eight-year-old French girl in a rich childrens dress, dark curls, bright eyes, ' +
      'running down a staircase in a grand house' +
      SCENE_STYLE
  },
  {
    rel: 'chapter03/thornfield_drawing_room.png',
    size: [1672, 941],
    prompt:
      'A grand drawing room of an English country house, deep red and gold upholstery, ' +
      'a marble fireplace with a low fire, tall windows with winter light, no people' +
      SCENE_STYLE
  },

  /* ---- 第四章：火 ---- */
  {
    rel: 'chapter04/bedroom_fire_rescue.png',
    size: [1672, 941],
    prompt:
      'A bedroom at night with a curtain of fire in the doorway, a young woman throwing a rug ' +
      'over a fallen man on the floor, flame and smoke, orange light against the dark' +
      SCENE_STYLE
  },
  {
    rel: 'chapter04/jane_drawings_conversation.png',
    size: [1672, 941],
    prompt:
      'A young English governess showing pencil sketches to a stern middle-aged gentleman ' +
      'beside a fire in a dim room, he leans forward to look, she holds the drawings' +
      SCENE_STYLE
  },
  {
    rel: 'chapter04/thornfield_corridor_smoke.png',
    size: [1672, 941],
    prompt:
      'A long dim corridor of an English country house filled with smoke, a red burning curtain ' +
      'at the far end, orange glow through the haze, no people' +
      SCENE_STYLE
  },
  {
    rel: 'chapter04/thornfield_entrance_night.png',
    size: [1672, 941],
    prompt:
      'The front door of a great English house standing open at night, cold moonlit stone steps, ' +
      'a dark figure entering, deep blue night, no people in the foreground' +
      SCENE_STYLE
  },

  /* ---- 第五章：客人 ---- */
  {
    rel: 'chapter05/gypsy_fortune_telling.png',
    size: [1672, 941],
    prompt:
      'A dark-haired gypsy woman in a bright shawl reading a travellers palm by candlelight ' +
      'inside a gypsy tent, patterned cloth, the traveller watches her hand' +
      SCENE_STYLE
  },
  {
    rel: 'chapter05/richard_mason.png',
    size: [1672, 941],
    prompt:
      'A pale wild-eyed young man in old-fashioned Elizabethan dress with a dark cloak and ' +
      'ruffled shirt, standing before a heavy curtain in a decaying great house, thin and feverish' +
      SCENE_STYLE
  },
  {
    rel: 'chapter05/thornfield_house_party_arrival.png',
    size: [1672, 941],
    prompt:
      'The front of a great English country house on the night of a party, carriages waiting on ' +
      'the drive, a lantern burning over the door, guests in evening dress arriving' +
      SCENE_STYLE
  },
  {
    rel: 'chapter05/thornfield_party_evening.png',
    size: [1672, 941],
    prompt:
      'A masked ball in the ballroom of an English country house, candlelight, gowns and masks, ' +
      'a small raised orchestra at one end, a crowded glittering room' +
      SCENE_STYLE
  },

  /* ---- 第六章：盖茨海德 ---- */
  {
    rel: 'chapter06/gateshead_mrs_reed_sickroom.png',
    size: [1672, 941],
    prompt:
      'A stern elderly English lady in mourning black lying ill in a curtained four-poster bed, ' +
      'a nurse beside her, cold daylight through the window, gloomy room' +
      SCENE_STYLE
  }
];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.stdout.on('data', () => {});
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(cmd + ' 退出码 ' + code + '\n' + err.slice(-400)))
    );
  });
}

const tmp = path.join('recon', 'art', 'jane');
fs.mkdirSync(tmp, { recursive: true });

const todo = IMAGES.filter((im) => {
  if (ONLY && !ONLY.some((k) => im.rel.includes(k))) return false;
  if (FORCE) return true;
  return !fs.existsSync(path.join(ROOTS[0], im.rel));
});

console.log('要画 ' + todo.length + ' 张（总共 ' + IMAGES.length + ' 张）');

let index = 0;
let done = 0;
const worker = async () => {
  for (;;) {
    const im = todo[index++];
    if (!im) return;
    const raw = path.join(tmp, im.rel.replace(/[\/\\]/g, '__') + '.raw.png');
    const sized = path.join(tmp, im.rel.replace(/[\/\\]/g, '__') + '.png');
    const promptFile = raw.replace(/\.raw\.png$/, '.txt');
    fs.writeFileSync(promptFile, im.prompt, 'utf8');
    try {
      await run('python', [
        GEN,
        'generate',
        '--prompt-file',
        promptFile,
        '--out',
        raw,
        '--size',
        im.size[1] > im.size[0] ? '1024x1536' : '1536x1024',
        '--quality',
        'high',
        '--timeout',
        '300'
      ]);
      await run(FFMPEG, [
        '-loglevel',
        'error',
        '-y',
        '-i',
        raw,
        '-vf',
        `scale=${im.size[0]}:${im.size[1]}:force_original_aspect_ratio=increase,crop=${im.size[0]}:${im.size[1]}`,
        '-frames:v',
        '1',
        sized
      ]);
      for (const root of ROOTS) {
        const dest = path.join(root, im.rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(sized, dest);
      }
      done++;
      console.log('画了 ' + im.rel + '  (' + done + '/' + todo.length + ')');
    } catch (e) {
      console.log('没画成 ' + im.rel + '：' + String(e.message).slice(0, 200));
    }
  }
};

await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length || 1) }, worker));
console.log('一共画好 ' + done + ' 张');
