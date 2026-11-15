# Investigation report

**Question:** What does the front-end of xbjiaoyu.com and aifunengjiaoyu.com call, and what must a local server answer so both sites stay usable offline with the original code?

**Purpose:** Interoperability: serve the mirrored front-end byte-for-byte and shim only the APIs it actually calls, so the local copy behaves like the live one.

**Done when:** Every literal endpoint the bundles call is answered locally with the same status the live site gives, the 53 小白教育 courseware files and the 12 图灵智赋 programme pages open, and no page requests anything off this machine.

## What we looked at

- app.17e3fb394175.min.js (script)
- app.js (script)
- assets (js-app)
- https://xbjiaoyu.com/#catalog
- https://aifunengjiaoyu.com/
- C:\kaifa\xiaobai-class\mirror\xbjiaoyu\assets
- C:\kaifa\xiaobai-class\mirror\aifunengjiaoyu\assets

## What we found

### 小白教育's front-end calls only four literal API paths, and the only one the classroom itself needs is POST /api/classroom/release; everything else is static. The 550-course catalogue and the 53 playable courseware documents are therefore front-end data, not server data.

- **Confidence:** Seen it (observed)
- **Evidence:**
  - `ev_fa8b639f9ca87a1da2505fb3ecbbc9f63d2fb970b2e2b46efe6f890e58694f64` — JavaScript code app.js: 1 source files, 0 IPC channel(s) (0 paired), 0 window(s), 4 endpoint(s), 0 route(s). (path=C:\kaifa\xiaobai-class\mirror\xbjiaoyu\assets\app.js)
  - `ev_7db1cb3f09bc8ef83eaf4ef0d81d70700fa260455b464e9d62bb2b22435e9d01` — Web app assets: 31 source files, 0 IPC channel(s) (0 paired), 0 window(s), 5 endpoint(s), 0 route(s). (path=C:\kaifa\xiaobai-class\mirror\xbjiaoyu\assets)
  - `ev_d0bc8c725d47e731ded50ecaa5877e12a79d04bca695440e5bd6137121f8f30a` — app.js is a script or web page.

### 图灵智赋's front-end is far more talkative: 61 literal API paths covering the programme catalogue (/api/programs and friends), ratings, trials, inquiries, 长征 playback (/api/programs/{id}/long-march-playback/{action}), 图小灵 materials (/tuxiaoling/api/materials) and creator uploads. Those are exactly the endpoints the local server has to answer.

- **Confidence:** Seen it (observed)
- **Evidence:**
  - `ev_8ea2b996627f62bd56eec75fb229657158ec5f49289258619f651d454988503e` — JavaScript code app.17e3fb394175.min.js: 1 source files, 0 IPC channel(s) (0 paired), 0 window(s), 54 endpoint(s), 0 route(s). (path=C:\kaifa\xiaobai-class\mirror\aifunengjiaoyu\assets\assets\app.17e3fb394175.min.js)
  - `ev_325181d1a08ff1cb45891f34b7a5a08092441860d0610ac2c779779ed3e2b9aa` — Web app assets: 27 source files, 0 IPC channel(s) (0 paired), 0 window(s), 77 endpoint(s), 0 route(s). (path=C:\kaifa\xiaobai-class\mirror\aifunengjiaoyu\assets)
  - `ev_2ff969dd2b83c5765e903321aadc19f1aff7de260255b0ec9d3f9493c3018f7c` — app.17e3fb394175.min.js is a script or web page.

### The mirror is faithful: hashing the bytes the browser actually received in a REA browser capture gives the same digest as craft-anything's static module for all 30 小白教育 modules and all 21 图灵智赋 modules that the browse page loads, so the files served locally are the files the live site publishes.

- **Confidence:** Worked it out (derived)
- **Evidence:**
  - `ev_c9b2d4bf9cf1c30e41ce95da2ab2faed484dedbd1eabd670d5deb35ec3a8ec22` — Reconciled 1 static layer(s) with 62 runtime script(s): 30 loaded.
  - `ev_d5d26bb9c6cd608f62cf5bef28e808ad57cae0bc168244e80ec93c31081b09da` — Reconciled 1 static layer(s) with 21 runtime script(s): 21 loaded, 4 not-seen-running.
  - `ev_7db1cb3f09bc8ef83eaf4ef0d81d70700fa260455b464e9d62bb2b22435e9d01` — Web app assets: 31 source files, 0 IPC channel(s) (0 paired), 0 window(s), 5 endpoint(s), 0 route(s). (path=C:\kaifa\xiaobai-class\mirror\xbjiaoyu\assets)
  - `ev_325181d1a08ff1cb45891f34b7a5a08092441860d0610ac2c779779ed3e2b9aa` — Web app assets: 27 source files, 0 IPC channel(s) (0 paired), 0 window(s), 77 endpoint(s), 0 route(s). (path=C:\kaifa\xiaobai-class\mirror\aifunengjiaoyu\assets)

### Four 图灵智赋 modules were not seen running on the browse page (admin-large/runtime/public-lease.mjs, the two long-march host shims and vendor/html2canvas.min.js); html2canvas is loaded on demand when a user exports an image, and the other three belong to admin and playback paths the guest page never opens.

- **Confidence:** Seen it (observed)
- **Evidence:**
  - `ev_d5d26bb9c6cd608f62cf5bef28e808ad57cae0bc168244e80ec93c31081b09da` — Reconciled 1 static layer(s) with 21 runtime script(s): 21 loaded, 4 not-seen-running.

### The 小白教育 shell signs every POST with X-Requested-With: studio (the string sits next to the classroom endpoints in app.js), and the live server refuses a POST that arrives without a matching Origin — that guard is why a POST answered by the live site is 403 请求来源不匹配 rather than a route result.

- **Confidence:** Seen it (observed)
- **Evidence:**
  - `ev_7db1cb3f09bc8ef83eaf4ef0d81d70700fa260455b464e9d62bb2b22435e9d01` — Web app assets: 31 source files, 0 IPC channel(s) (0 paired), 0 window(s), 5 endpoint(s), 0 route(s). (path=C:\kaifa\xiaobai-class\mirror\xbjiaoyu\assets)

### The live 图灵智赋 server answers any path it does not know — including a known route called with the wrong method — with Express's own "Cannot GET /path" HTML page rather than JSON, so the front-end's response.json() throws online exactly as it does on the local replica.

- **Confidence:** Seen it (observed)
- **Evidence:**
  - `ev_325181d1a08ff1cb45891f34b7a5a08092441860d0610ac2c779779ed3e2b9aa` — Web app assets: 27 source files, 0 IPC channel(s) (0 paired), 0 window(s), 77 endpoint(s), 0 route(s). (path=C:\kaifa\xiaobai-class\mirror\aifunengjiaoyu\assets)
  - `ev_d5d26bb9c6cd608f62cf5bef28e808ad57cae0bc168244e80ec93c31081b09da` — Reconciled 1 static layer(s) with 21 runtime script(s): 21 loaded, 4 not-seen-running.

## Open questions

_None outstanding._

## How this was done

- **Mode:** Deep (the original's code and files could be read)
- **Engines:** builtin
- **Limitations:**
  - 'not observed' means the capture didn't see it load, not that it never runs.
  - Static reading only: code built at run time (eval, computed requires, remote content) is invisible; IPC pairs need literal channel names.
  - the kind is detected from the first bytes and, to break ties, the file name

## Evidence ledger

- `ev_2ff969dd2b83c5765e903321aadc19f1aff7de260255b0ec9d3f9493c3018f7c` **core_target_triage** — app.17e3fb394175.min.js is a script or web page. (Best guess)
- `ev_8ea2b996627f62bd56eec75fb229657158ec5f49289258619f651d454988503e` **js_app_map** — JavaScript code app.17e3fb394175.min.js: 1 source files, 0 IPC channel(s) (0 paired), 0 window(s), 54 endpoint(s), 0 route(s). (Worked it out)
- `ev_d0bc8c725d47e731ded50ecaa5877e12a79d04bca695440e5bd6137121f8f30a` **core_target_triage** — app.js is a script or web page. (Best guess)
- `ev_fa8b639f9ca87a1da2505fb3ecbbc9f63d2fb970b2e2b46efe6f890e58694f64` **js_app_map** — JavaScript code app.js: 1 source files, 0 IPC channel(s) (0 paired), 0 window(s), 4 endpoint(s), 0 route(s). (Worked it out)
- `ev_aec891578414e8ac11bd84a488d26274dbe338b0faffca657b173695339bcf77` **js_runtime_code_match** — Reconciled 1 static layer(s) with 62 runtime script(s): 1 loaded. (Worked it out)
- `ev_10dd88306f910bc4d7942db6b3d30497efb3a0271592eeb453bbf166049cdfb4` **js_runtime_code_match** — Reconciled 1 static layer(s) with 21 runtime script(s): 1 loaded. (Worked it out)
- `ev_7db1cb3f09bc8ef83eaf4ef0d81d70700fa260455b464e9d62bb2b22435e9d01` **js_app_map** — Web app assets: 31 source files, 0 IPC channel(s) (0 paired), 0 window(s), 5 endpoint(s), 0 route(s). (Worked it out)
- `ev_325181d1a08ff1cb45891f34b7a5a08092441860d0610ac2c779779ed3e2b9aa` **js_app_map** — Web app assets: 27 source files, 0 IPC channel(s) (0 paired), 0 window(s), 77 endpoint(s), 0 route(s). (Worked it out)
- `ev_c9b2d4bf9cf1c30e41ce95da2ab2faed484dedbd1eabd670d5deb35ec3a8ec22` **js_runtime_code_match** — Reconciled 1 static layer(s) with 62 runtime script(s): 30 loaded. (Worked it out)
- `ev_d5d26bb9c6cd608f62cf5bef28e808ad57cae0bc168244e80ec93c31081b09da` **js_runtime_code_match** — Reconciled 1 static layer(s) with 21 runtime script(s): 21 loaded, 4 not-seen-running. (Worked it out)

