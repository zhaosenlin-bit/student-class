"""List the DLLs a PE executable imports (no external tooling needed)."""

import struct
import sys


def imports(path):
    data = open(path, "rb").read()
    pe = struct.unpack_from("<I", data, 0x3C)[0]
    assert data[pe:pe + 4] == b"PE\0\0", "not a PE file"
    coff = pe + 4
    n_sections = struct.unpack_from("<H", data, coff + 2)[0]
    opt_size = struct.unpack_from("<H", data, coff + 16)[0]
    opt = coff + 20
    magic = struct.unpack_from("<H", data, opt)[0]
    dd = opt + (112 if magic == 0x20B else 96)
    imp_rva, imp_size = struct.unpack_from("<II", data, dd + 8)

    sections = []
    sec = opt + opt_size
    for i in range(n_sections):
        off = sec + i * 40
        va = struct.unpack_from("<I", data, off + 12)[0]
        raw = struct.unpack_from("<I", data, off + 20)[0]
        vsize = struct.unpack_from("<I", data, off + 8)[0]
        sections.append((va, vsize, raw))

    def rva2off(rva):
        for va, vsize, raw in sections:
            if va <= rva < va + max(vsize, 1) + 0x1000:
                return raw + (rva - va)
        return None

    names = []
    off = rva2off(imp_rva)
    if off is None:
        return names
    while True:
        entry = data[off:off + 20]
        if len(entry) < 20 or entry == b"\0" * 20:
            break
        name_rva = struct.unpack_from("<I", entry, 12)[0]
        if name_rva == 0:
            break
        no = rva2off(name_rva)
        end = data.index(b"\0", no)
        names.append(data[no:end].decode("ascii", "replace"))
        off += 20
    return names


for target in sys.argv[1:]:
    print(target)
    for dll in imports(target):
        print("   ", dll)
