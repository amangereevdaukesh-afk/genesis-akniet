// Museum of Days — shared physical materials (Claude art direction).
// Every surface texture here is generated procedurally at runtime from seeded noise:
// no third-party image files, no licensing obligations, nothing to download.
// All architectural geometry uses UVs measured in metres, so each texture repeat
// below is expressed as "metres per tile" and stays at architectural scale.
import * as THREE from 'three';

export type StoneKind = 'limestone' | 'ashlar' | 'plaster' | 'floor' | 'travertine';
interface SurfaceSet { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture }

const TILE: Record<StoneKind, number> = { limestone: 2.2, ashlar: 2.4, plaster: 3.2, floor: 3, travertine: 1.8 };
const sets = new Map<StoneKind, SurfaceSet>();
const materials = new Map<string, THREE.Material>();
const geometries = new Map<string, THREE.BufferGeometry>();

function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

/** Tileable value noise: lattice of `period` cells wrapping across `size` pixels. */
function valueNoise(size: number, period: number, seed: number) {
    const r = rng(seed), lattice = new Float32Array(period * period).map(() => r());
    const out = new Float32Array(size * size), cell = size / period;
    for (let y = 0; y < size; y++) {
        const gy = y / cell, y0 = Math.floor(gy) % period, y1 = (y0 + 1) % period; let fy = gy - Math.floor(gy); fy = fy * fy * (3 - 2 * fy);
        for (let x = 0; x < size; x++) {
            const gx = x / cell, x0 = Math.floor(gx) % period, x1 = (x0 + 1) % period; let fx = gx - Math.floor(gx); fx = fx * fx * (3 - 2 * fx);
            const a = lattice[y0 * period + x0], b = lattice[y0 * period + x1], c = lattice[y1 * period + x0], d = lattice[y1 * period + x1];
            out[y * size + x] = (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
        }
    }
    return out;
}
function fbm(size: number, seed: number, base: number, octaves: number, gain = .5) {
    const out = new Float32Array(size * size); let amp = 1, total = 0;
    for (let o = 0; o < octaves; o++) {
        const n = valueNoise(size, base << o, seed + o * 97);
        for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
        total += amp; amp *= gain;
    }
    for (let i = 0; i < out.length; i++) out[i] /= total;
    return out;
}
function canvas(size: number) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
function finish(c: HTMLCanvasElement, repeat: number, srgb: boolean) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / repeat, 1 / repeat);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
}
/** Converts a height field into a tangent-space normal map (Sobel, wrapping). */
function normalMap(h: Float32Array, size: number, strength: number, repeat: number) {
    const c = canvas(size), ctx = c.getContext('2d')!, img = ctx.createImageData(size, size);
    const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
        const len = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
        img.data[i] = (-dx / len * .5 + .5) * 255; img.data[i + 1] = (dy / len * .5 + .5) * 255; img.data[i + 2] = (1 / len * .5 + .5) * 255; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return finish(c, repeat, false);
}
/** Writes albedo (grey-scale tone multiplied later by the material colour) and roughness. */
function paint(size: number, tone: (i: number) => [number, number, number], rough: (i: number) => number, repeat: number) {
    const a = canvas(size), r = canvas(size), actx = a.getContext('2d')!, rctx = r.getContext('2d')!;
    const ai = actx.createImageData(size, size), ri = rctx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
        const [cr, cg, cb] = tone(i), k = i * 4, ro = Math.max(0, Math.min(1, rough(i))) * 255;
        ai.data[k] = cr * 255; ai.data[k + 1] = cg * 255; ai.data[k + 2] = cb * 255; ai.data[k + 3] = 255;
        ri.data[k] = ro; ri.data[k + 1] = ro; ri.data[k + 2] = ro; ri.data[k + 3] = 255;
    }
    actx.putImageData(ai, 0, 0); rctx.putImageData(ri, 0, 0);
    return { map: finish(a, repeat, true), roughnessMap: finish(r, repeat, false) };
}

function limestone(size = 512, seed = 31, repeat = TILE.limestone): SurfaceSet {
    const broad = fbm(size, seed, 3, 4, .55), grain = fbm(size, seed + 7, 48, 3, .6), cloud = fbm(size, seed + 3, 6, 3);
    const r = rng(seed), pits = new Float32Array(size * size);
    for (let i = 0; i < size * 7; i++) { const p = Math.floor(r() * size * size); pits[p] = .35 + r() * .5; if (r() > .6) pits[(p + 1) % pits.length] = pits[p] * .6; }
    const h = new Float32Array(size * size);
    for (let i = 0; i < h.length; i++) h[i] = broad[i] * .55 + grain[i] * .45 - pits[i];
    // Natural limestone: cream body, faint warm/cool clouding, fine grain and fossil pitting.
    const tone = (i: number): [number, number, number] => { const v = .86 + (broad[i] - .5) * .16 + (grain[i] - .5) * .1 - pits[i] * .2, w = (cloud[i] - .5) * .05; return [v + w, v + w * .4, v - w * .6]; };
    return { ...paint(size, tone, i => .78 + grain[i] * .16 + pits[i] * .1, repeat), normalMap: normalMap(h, size, 1.3, repeat) };
}
function travertine(): SurfaceSet {
    const size = 512, seed = 57, repeat = TILE.travertine, band = fbm(size, seed, 4, 4, .6), grain = fbm(size, seed + 1, 64, 2);
    const h = new Float32Array(size * size), voids = new Float32Array(size * size), r = rng(seed);
    // Travertine's horizontal bedding and elongated voids.
    for (let n = 0; n < 420; n++) { const x = Math.floor(r() * size), y = Math.floor(r() * size), len = 4 + r() * 26; for (let k = 0; k < len; k++) voids[y * size + (x + k) % size] = .5 + r() * .3; }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const i = y * size + x; h[i] = Math.sin((y / size) * Math.PI * 18 + band[i] * 9) * .25 + grain[i] * .3 - voids[i]; }
    const tone = (i: number): [number, number, number] => { const v = .84 + h[i] * .1; return [v + .02, v, v - .04]; };
    return { ...paint(size, tone, i => .7 + grain[i] * .2 + voids[i] * .1, repeat), normalMap: normalMap(h, size, 2.6, repeat) };
}
function ashlar(): SurfaceSet {
    // 2.4 m tile: four 0.6 m courses, staggered blocks with recessed lime-mortar joints.
    const size = 512, repeat = TILE.ashlar, seed = 83, base = limestone(size, seed, repeat);
    const grain = fbm(size, seed + 9, 32, 3), broad = fbm(size, seed + 2, 4, 3), r = rng(seed);
    const course = size / 4, joint = 1.6, chamfer = 5;
    const blockTone = new Float32Array(size * size), h = new Float32Array(size * size), mortar = new Float32Array(size * size);
    for (let c = 0; c < 4; c++) {
        const cuts: number[] = []; let x = Math.floor(r() * size);
        while (cuts.length < 3) { cuts.push(x % size); x += 140 + Math.floor(r() * 60); }
        cuts.sort((a, b) => a - b);
        const tones = cuts.map(() => (r() - .5) * .09);
        for (let y = c * course; y < (c + 1) * course; y++) for (let px = 0; px < size; px++) {
            let k = cuts.length - 1; for (let j = 0; j < cuts.length; j++) if (px >= cuts[j]) k = j;
            const dx = Math.min(...cuts.map(cx => Math.min(Math.abs(px - cx), size - Math.abs(px - cx)))), dy = Math.min(y - c * course, (c + 1) * course - 1 - y);
            const d = Math.min(dx, dy), i = y * size + px;
            mortar[i] = d < joint ? 1 : 0;
            h[i] = d < joint ? -.6 : d < chamfer ? -.6 + (d - joint) / (chamfer - joint) * .6 + grain[i] * .08 : grain[i] * .18 + broad[i] * .1;
            blockTone[i] = tones[k];
        }
    }
    const tone = (i: number): [number, number, number] => { const v = .9 + blockTone[i] * .6 + (broad[i] - .5) * .1 + (grain[i] - .5) * .07 - mortar[i] * .07; return [v, v - .005, v - .018]; };
    return { map: paint(size, tone, i => .82 + grain[i] * .12 + mortar[i] * .06, repeat).map, roughnessMap: base.roughnessMap, normalMap: normalMap(h, size, 1.8, repeat) };
}
function plaster(): SurfaceSet {
    const size = 256, repeat = TILE.plaster, broad = fbm(size, 5, 3, 4, .6), trowel = fbm(size, 9, 12, 2);
    const h = new Float32Array(size * size); for (let i = 0; i < h.length; i++) h[i] = broad[i] * .6 + trowel[i] * .4;
    const tone = (i: number): [number, number, number] => { const v = .92 + (broad[i] - .5) * .1 + (trowel[i] - .5) * .05; return [v, v, v]; };
    return { ...paint(size, tone, i => .9 + trowel[i] * .1, repeat), normalMap: normalMap(h, size, .9, repeat) };
}
function floor(): SurfaceSet {
    // 3 m tile: four honed 1.5 m slabs with veining and a dark stone diamond inlaid at each crossing.
    const size = 1024, repeat = TILE.floor, vein = fbm(size, 211, 4, 5, .55), grain = fbm(size, 17, 96, 2), cloud = fbm(size, 41, 6, 3);
    const slab = size / 2, h = new Float32Array(size * size), r = rng(3), slabTone = [0, 0, 0, 0].map(() => (r() - .5) * .06);
    const inlay = .11 * size; // half-diagonal of the diamond inlay
    const toneArr = new Float32Array(size * size * 3), roughArr = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const i = y * size + x, sx = x % slab, sy = y % slab, jd = Math.min(sx, slab - sx, sy, slab - sy);
        const cx = Math.min(x, size - x), cy = Math.min(y, size - y), diamond = cx + cy < inlay, cd = Math.abs(cx - slab) + Math.abs(cy - slab) < inlay * .55;
        const veinLine = Math.pow(1 - Math.abs(Math.sin((x + y * .35) / size * Math.PI * 3 + vein[i] * 11)), 18);
        let v = .9 + slabTone[(x < slab ? 0 : 1) + (y < slab ? 0 : 2)] + (cloud[i] - .5) * .08 + (grain[i] - .5) * .04 - veinLine * .16;
        let rr = .34 + grain[i] * .12 + veinLine * .08, hh = grain[i] * .05;
        let cr = v, cg = v - .005, cb = v - .02;
        if (jd < 1.6) { v = .62; cr = cg = cb = v; rr = .85; hh = -.5; }
        if (diamond || cd) { const d = .34 + (grain[i] - .5) * .08 + veinLine * .12; cr = d * .92; cg = d; cb = d * .94; rr = .3; hh = 0; if ((diamond && cx + cy > inlay - 3) || (cd && Math.abs(cx - slab) + Math.abs(cy - slab) > inlay * .55 - 3)) { cr = .76; cg = .62; cb = .38; rr = .3; } }
        toneArr[i * 3] = cr; toneArr[i * 3 + 1] = cg; toneArr[i * 3 + 2] = cb; roughArr[i] = rr; h[i] = hh;
    }
    const p = paint(size, i => [toneArr[i * 3], toneArr[i * 3 + 1], toneArr[i * 3 + 2]], i => roughArr[i], repeat);
    return { ...p, normalMap: normalMap(h, size, 1.5, repeat) };
}
function surface(kind: StoneKind) {
    let s = sets.get(kind);
    if (!s) { s = kind === 'limestone' ? limestone() : kind === 'ashlar' ? ashlar() : kind === 'plaster' ? plaster() : kind === 'travertine' ? travertine() : floor(); sets.set(kind, s); }
    return s;
}

/** Shared physically based stone/plaster material, tinted by colour (cached, never mutate). */
export function stone(kind: StoneKind, color: string, opts: { rough?: number; normal?: number; env?: number } = {}) {
    const key = `${kind}|${color}|${opts.rough ?? 1}|${opts.normal ?? 1}|${opts.env ?? 1}`;
    let m = materials.get(key) as THREE.MeshStandardMaterial | undefined;
    if (!m) {
        const s = surface(kind), n = opts.normal ?? 1;
        m = new THREE.MeshStandardMaterial({ color, map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: opts.rough ?? 1, metalness: 0, envMapIntensity: opts.env ?? 1 });
        m.normalScale.set(n, n);
        materials.set(key, m);
    }
    return m;
}
/** Plain shared material for metals, woods and painted surfaces. */
export function finishMaterial(color: string, rough = .7, metal = 0, emissive?: string, emissiveIntensity = 1) {
    const key = `plain|${color}|${rough}|${metal}|${emissive ?? ''}|${emissiveIntensity}`;
    let m = materials.get(key);
    if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...(emissive ? { emissive, emissiveIntensity } : {}) }); materials.set(key, m); }
    return m;
}
export const brass = (color = '#b8955a') => finishMaterial(color, .32, .9);

/** Multiplies UVs so a geometry's texture coordinates are in metres. */
export function meterUV(geo: THREE.BufferGeometry, su: number, sv: number) {
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    uv.needsUpdate = true;
    return geo;
}
/** Box geometry whose every face carries metre-scaled UVs (cached by size). */
export function meterBox(w: number, h: number, d: number) {
    const key = `box|${w}|${h}|${d}`;
    let g = geometries.get(key);
    if (!g) {
        g = new THREE.BoxGeometry(w, h, d);
        const uv = g.attributes.uv as THREE.BufferAttribute;
        // BoxGeometry faces: +x, -x, +y, -y, +z, -z — four vertices each.
        const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
        for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
        geometries.set(key, g);
    }
    return g;
}
export function cachedGeometry<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
    let g = geometries.get(key) as T | undefined;
    if (!g) { g = make(); geometries.set(key, g); }
    return g;
}

/** Soft gradient used for baked contact shadows and light pools (one tiny texture). */
let softTexture: THREE.CanvasTexture | undefined, stripTexture: THREE.CanvasTexture | undefined;
export function softSpot() {
    if (!softTexture) {
        const c = canvas(128), ctx = c.getContext('2d')!, g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); softTexture = new THREE.CanvasTexture(c);
    }
    return softTexture;
}
/** Grey-scale alpha falloff: white (opaque) at v=1, black at v=0 — baked ambient occlusion at wall bases. */
export function softStrip() {
    if (!stripTexture) {
        const c = canvas(64), ctx = c.getContext('2d')!, g = ctx.createLinearGradient(0, 0, 0, 64);
        g.addColorStop(0, '#fff'); g.addColorStop(.3, '#6b6b6b'); g.addColorStop(1, '#000');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); stripTexture = new THREE.CanvasTexture(c);
    }
    return stripTexture;
}

/** Incised, gilded lettering for friezes; reads as carved stone in light from above. */
const engraved = new Map<string, THREE.CanvasTexture>();
export function engravedTexture(text: string, size = 64, color = '#a9864a', spacing = .28) {
    const key = `${text}|${size}|${color}|${spacing}`;
    let t = engraved.get(key);
    if (!t) {
        const c = document.createElement('canvas'); c.width = 1024; c.height = 192;
        const ctx = c.getContext('2d')!;
        ctx.font = `500 ${size}px "Cormorant Garamond", Georgia, serif`; ctx.textBaseline = 'middle';
        const letters = [...text], widths = letters.map(l => ctx.measureText(l).width), glyphs = widths.reduce((a, b) => a + b, 0);
        const gap = Math.max(0, Math.min(size * spacing, (960 - glyphs) / Math.max(1, letters.length - 1))), total = glyphs + gap * (letters.length - 1);
        const draw = (dx: number, dy: number, fill: string) => { ctx.fillStyle = fill; let x = 512 - total / 2; letters.forEach((l, i) => { ctx.fillText(l, x + dx, 96 + dy); x += widths[i] + gap; }); };
        draw(0, -2, 'rgba(46,34,20,.55)');   // shadowed upper lip of the incision
        draw(0, 2, 'rgba(255,248,230,.55)'); // lit lower lip
        draw(0, 0, color);                   // gilded infill
        t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
        engraved.set(key, t);
    }
    return t;
}

/** Blurred rectangle (alpha) used for the soft drop shadow a framed work casts on its wall. */
let rectTexture: THREE.CanvasTexture | undefined;
export function softRect() {
    if (!rectTexture) {
        const c = canvas(128), ctx = c.getContext('2d')!;
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 18; ctx.shadowOffsetX = 400;
        ctx.fillStyle = '#fff'; ctx.fillRect(24 - 400, 24, 80, 80);
        rectTexture = new THREE.CanvasTexture(c);
    }
    return rectTexture;
}
