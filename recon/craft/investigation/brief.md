# Brief

**Question:** What does the front-end of xbjiaoyu.com and aifunengjiaoyu.com call, and what must a local server answer so both sites stay usable offline with the original code?

**Purpose:** Interoperability: serve the mirrored front-end byte-for-byte and shim only the APIs it actually calls, so the local copy behaves like the live one.

**Targets:**
- https://xbjiaoyu.com/#catalog
- https://aifunengjiaoyu.com/
- C:\kaifa\xiaobai-class\mirror\xbjiaoyu\assets
- C:\kaifa\xiaobai-class\mirror\aifunengjiaoyu\assets

**Constraints:**
- No payment or unlock path: paid courseware stays unavailable locally.
- Front-end code is reused byte-for-byte; only the API layer is written from scratch.
- Everything must work with the network disconnected.

**Done when:** Every literal endpoint the bundles call is answered locally with the same status the live site gives, the 53 小白教育 courseware files and the 12 图灵智赋 programme pages open, and no page requests anything off this machine.
