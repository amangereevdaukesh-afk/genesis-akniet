// Museum of Days — the four monumental portals of the main hall (Claude art direction).
// Static architecture (wall, mouldings, the lit room behind each arch) renders with the
// hall in every view; the interactive threshold (hover, click, "Step inside") is mounted
// by <Doorways/> only while the visitor stands in the hall.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rooms, type RoomId } from './data';
import { paintingTexture } from './textures';
import { brass, cachedGeometry, engravedTexture, finishMaterial, meterBox, softSpot, softStrip, stone, type StoneKind } from './materials';

/** Centre line of each portal. Navigation, touch snapping and camera paths depend on these. */
export const doorX: Record<RoomId, number> = { glow: -7.5, hush: -2.5, echo: 2.5, pulse: 7.5 };
/** Shared proportions: a 3 m opening rising to 5.7 m, set in a 1.5 m deep masonry wall. */
export const PORTAL = { halfWidth: 1.5, spring: 4.2, wallZ: -12, depth: 1.5, wallTop: 11.2, hallHalf: 11 } as const;
const BACK = PORTAL.wallZ - PORTAL.depth;
const order: RoomId[] = ['glow', 'hush', 'echo', 'pulse'];
const movement: Record<RoomId, string> = { glow: 'IMPRESSIONISM', hush: 'TONALISM', echo: 'ROMANTICISM', pulse: 'ABSTRACTION' };

type V3 = [number, number, number];
function Block({ p, s, kind, c, rough, shadow = true, rot }: { p: V3; s: V3; kind?: StoneKind; c: string; rough?: number; shadow?: boolean; rot?: V3 }) {
    return <mesh position={p} rotation={rot} geometry={meterBox(...s)} material={kind ? stone(kind, c, { rough }) : finishMaterial(c, rough ?? .7)} castShadow={shadow} receiveShadow/>;
}

/* ---------- geometry ---------- */
function archBandShape(r0: number, r1: number, spring: number) {
    const s = new THREE.Shape();
    s.moveTo(-r1, 0); s.lineTo(-r1, spring); s.absarc(0, spring, r1, Math.PI, 0, true); s.lineTo(r1, 0);
    s.lineTo(r0, 0); s.lineTo(r0, spring); s.absarc(0, spring, r0, 0, Math.PI, false); s.lineTo(-r0, 0); s.closePath();
    return s;
}
const bandGeometry = (r0: number, r1: number, spring: number, depth: number, bevel: number) => cachedGeometry(`band|${r0}|${r1}|${spring}|${depth}|${bevel}`, () =>
    new THREE.ExtrudeGeometry(archBandShape(r0, r1, spring), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 48 }));
const openingShape = () => { const { halfWidth: r, spring } = PORTAL, s = new THREE.Shape(); s.moveTo(-r, 0); s.lineTo(-r, spring); s.absarc(0, spring, r, Math.PI, 0, true); s.lineTo(r, 0); s.closePath(); return s; };

/** The whole portal wall as one draw call: piers plus an arcaded upper wall, 1.5 m deep. */
function portalWallGeometry() {
    return cachedGeometry('portal-wall', () => {
        const { halfWidth: r, spring, wallTop, hallHalf: H, depth } = PORTAL;
        const upper = new THREE.Shape();
        upper.moveTo(-H, spring);
        for (const id of order) { const x = doorX[id]; upper.lineTo(x - r, spring); upper.absarc(x, spring, r, Math.PI, 0, true); }
        upper.lineTo(H, spring); upper.lineTo(H, wallTop); upper.lineTo(-H, wallTop); upper.closePath();
        const parts: THREE.BufferGeometry[] = [new THREE.ExtrudeGeometry(upper, { depth, bevelEnabled: false, curveSegments: 40 })];
        const edges = [-H, ...order.flatMap(id => [doorX[id] - r, doorX[id] + r]), H];
        for (let i = 0; i < edges.length; i += 2) {
            const w = edges[i + 1] - edges[i], box = meterBox(w, spring, depth).clone().toNonIndexed();
            box.translate(edges[i] + w / 2, spring / 2, depth / 2);
            parts.push(box);
        }
        const merged = mergeGeometries(parts.map(g => { g.clearGroups(); return g; }), false)!;
        merged.translate(0, 0, PORTAL.wallZ - depth);
        return merged;
    });
}

/* ---------- shared hover/open light registry (demand-rendered scene) ---------- */
interface Glow { light?: THREE.PointLight; pool?: THREE.MeshBasicMaterial; base: number }
const glows: Record<RoomId, Glow> = { glow: { base: 0 }, hush: { base: 0 }, echo: { base: 0 }, pulse: { base: 0 } };
const glowLevel: Record<RoomId, { v: number }> = { glow: { v: 0 }, hush: { v: 0 }, echo: { v: 0 }, pulse: { v: 0 } };
function applyGlow(id: RoomId) {
    const g = glows[id], v = glowLevel[id].v;
    if (g.light) g.light.intensity = g.base * (1 + v * 1.25);
    if (g.pool) g.pool.opacity = .16 + v * .22;
}

/* ---------- the rooms seen through each arch ---------- */
const interior: Record<RoomId, { wall: string; wallKind: StoneKind; floor: string; light: string; intensity: number; depth: number }> = {
    glow: { wall: '#e6c99b', wallKind: 'limestone', floor: '#d7c09b', light: '#ffd49a', intensity: 46, depth: 7.5 },
    hush: { wall: '#a9b6a6', wallKind: 'plaster', floor: '#b4b9ab', light: '#e4eee0', intensity: 30, depth: 7.5 },
    echo: { wall: '#8495a6', wallKind: 'ashlar', floor: '#80878d', light: '#c9d9f2', intensity: 40, depth: 11 },
    pulse: { wall: '#56242a', wallKind: 'plaster', floor: '#3d3637', light: '#ff9f7c', intensity: 32, depth: 7.5 },
};
function Painting({ room, seed, p, w, h, frame }: { room: RoomId; seed: number; p: V3; w: number; h: number; frame: string }) {
    return <group position={p}>
        <mesh geometry={meterBox(w + .22, h + .22, .1)} material={finishMaterial(frame, .45, .55)} castShadow/>
        <mesh position={[0, 0, .056]} geometry={meterBox(w + .02, h + .02, .01)} material={finishMaterial('#ece4d2', .9)}/>
        <mesh position={[0, 0, .065]}><planeGeometry args={[w - .18, h - .18]}/><meshStandardMaterial map={paintingTexture(room, seed)} roughness={.95}/></mesh>
    </group>;
}
function Haze({ p, s, color, opacity }: { p: V3; s: [number, number]; color: string; opacity: number }) {
    return <mesh position={p} renderOrder={2}><planeGeometry args={s}/><meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false}/></mesh>;
}
function Vestibule({ id }: { id: RoomId }) {
    const v = interior[id], W = 4.4, H = 7.4, L = v.depth, z0 = BACK, zc = z0 - L / 2, zb = z0 - L;
    const light = useRef<THREE.PointLight>(null), pool = useRef<THREE.MeshBasicMaterial>(null);
    useEffect(() => { glows[id].light = light.current ?? undefined; glows[id].pool = pool.current ?? undefined; glows[id].base = v.intensity; applyGlow(id); return () => { glows[id].light = undefined; glows[id].pool = undefined; }; }, [id, v.intensity]);
    return <group position={[doorX[id], 0, 0]}>
        <Block p={[0, -.15, zc]} s={[W, .3, L]} kind={id === 'hush' ? 'plaster' : 'floor'} c={v.floor} rough={id === 'pulse' ? .55 : 1}/>
        <Block p={[-W / 2 - .15, H / 2, zc]} s={[.3, H, L]} kind={v.wallKind} c={v.wall}/>
        <Block p={[W / 2 + .15, H / 2, zc]} s={[.3, H, L]} kind={v.wallKind} c={v.wall}/>
        <Block p={[0, H + .15, zc]} s={[W + .6, .3, L]} kind="plaster" c={v.wall} shadow={false}/>
        <Block p={[0, H / 2, zb - .15]} s={[W + .6, H, .3]} kind={v.wallKind} c={v.wall}/>
        <pointLight ref={light} position={[0, 5.6, z0 - Math.min(3.2, L * .4)]} color={v.light} intensity={v.intensity} distance={15} decay={2}/>
        {/* light spilling over the threshold onto the hall floor */}
        <mesh position={[0, .02, PORTAL.wallZ + 1.9]} rotation-x={-Math.PI / 2} renderOrder={1}><planeGeometry args={[4.4, 4.4]}/><meshBasicMaterial ref={pool} map={softSpot()} color={v.light} transparent opacity={.16} blending={THREE.AdditiveBlending} depthWrite={false}/></mesh>
        {id === 'glow' && <>
            <Painting room="glow" seed={24} p={[0, 2.75, zb + .06]} w={1.7} h={2.1} frame="#b48a4a"/>
            <mesh position={[0, 5.35, zb + .02]}><circleGeometry args={[1.05, 40, 0, Math.PI]}/><meshStandardMaterial color="#fff1d2" emissive="#ffd896" emissiveIntensity={1.4} roughness={1}/></mesh>
            <mesh position={[0, 5.32, zb + .03]}><ringGeometry args={[1.05, 1.17, 40, 1, 0, Math.PI]}/><meshStandardMaterial color="#cfb58a" roughness={.6}/></mesh>
            {/* a long shaft of afternoon light from the lunette to the floor */}
            <mesh position={[.15, 2.9, zb + 2.2]} rotation={[-.62, 0, .1]} renderOrder={2}><planeGeometry args={[1.7, 6]}/><meshBasicMaterial map={softSpot()} color="#ffcf88" transparent opacity={.12} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide}/></mesh>
            {/* seen obliquely from the hall: a sunlit arch of light and a second canvas on the right wall */}
            <mesh position={[-W / 2 + .01, 3.1, z0 - 3.2]} rotation-y={Math.PI / 2} renderOrder={2}><planeGeometry args={[2.6, 4.6]}/><meshBasicMaterial map={softSpot()} color="#ffcf8c" transparent opacity={.55} blending={THREE.AdditiveBlending} depthWrite={false}/></mesh>
            <group position={[-W / 2 + .02, 0, z0 - 3.4]} rotation-y={Math.PI / 2}><Painting room="glow" seed={11} p={[0, 2.7, 0]} w={1.5} h={1.9} frame="#b48a4a"/></group>
            <mesh position={[.3, .025, zb + 3.3]} rotation-x={-Math.PI / 2}><planeGeometry args={[2.6, 3.2]}/><meshBasicMaterial map={softSpot()} color="#ffd9a0" transparent opacity={.3} blending={THREE.AdditiveBlending} depthWrite={false}/></mesh>
        </>}
        {id === 'hush' && <>
            <Painting room="hush" seed={52} p={[0, 3, zb + .06]} w={2.3} h={1.7} frame="#c9cdbf"/>
            <Block p={[0, .42, zb + 2.6]} s={[2.4, .14, .62]} kind="plaster" c="#d6dacd"/>
            <Block p={[-.85, .18, zb + 2.6]} s={[.16, .36, .5]} kind="plaster" c="#9eaa99"/>
            <Block p={[.85, .18, zb + 2.6]} s={[.16, .36, .5]} kind="plaster" c="#9eaa99"/>
            <mesh position={[0, H - .02, zc]} rotation-x={Math.PI / 2}><planeGeometry args={[3.2, L - 2]}/><meshStandardMaterial color="#f1f5ee" emissive="#e8efe4" emissiveIntensity={.55}/></mesh>
        </>}
        {id === 'echo' && <>
            {[2.6, 5.4, 8.2].map((d, i) => <mesh key={d} position={[0, 0, z0 - d]} geometry={bandGeometry(1.45 - i * .08, 2.2, 4.9 - i * .15, .45, 0)} material={stone('ashlar', '#9aa8b6')} castShadow receiveShadow/>)}
            <Haze p={[0, 3.6, z0 - 4]} s={[W, H]} color="#a8b8cb" opacity={.12}/>
            <Haze p={[0, 3.6, z0 - 6.8]} s={[W, H]} color="#a8b8cb" opacity={.16}/>
            <Haze p={[0, 3.6, z0 - 9.6]} s={[W, H]} color="#b5c3d4" opacity={.2}/>
            <Painting room="echo" seed={71} p={[0, 2.7, zb + .06]} w={1.3} h={1.65} frame="#6f6450"/>
            <pointLight position={[0, 4.6, zb + 1.4]} color="#dfe8ff" intensity={14} distance={6} decay={2}/>
        </>}
        {id === 'pulse' && <group position={[W / 2 - .02, 0, z0 - 3.6]} rotation-y={-Math.PI / 2}>
            <mesh position={[.4, 3.4, .02]}><circleGeometry args={[1.25, 48]}/><meshStandardMaterial color="#c8452e" roughness={.55}/></mesh>
            <mesh position={[-.7, 4.9, .04]}><circleGeometry args={[.36, 32]}/><meshStandardMaterial color="#e2b04a" roughness={.5}/></mesh>
            <mesh position={[0, 3, .1]} rotation-z={-.75} geometry={meterBox(5, .08, .08)} material={brass('#c8a063')}/>
            <mesh position={[-.2, 2.4, .08]}><torusGeometry args={[1.7, .04, 8, 64, Math.PI * .7]}/><meshStandardMaterial color="#1b1b20" roughness={.4}/></mesh>
        </group>}
        {id === 'pulse' && <group position={[0, 0, zb + .05]}>
            <mesh position={[-.45, 3.55, .02]}><circleGeometry args={[1.02, 48]}/><meshStandardMaterial color="#b9432c" roughness={.55}/></mesh>
            <mesh position={[.35, 3.15, .1]}><torusGeometry args={[1.38, .05, 10, 72]}/><meshStandardMaterial color="#c98a5a" metalness={.9} roughness={.3}/></mesh>
            <mesh position={[1.05, 4.75, .06]}><circleGeometry args={[.3, 32]}/><meshStandardMaterial color="#17171b" roughness={.4}/></mesh>
            <mesh position={[.1, 3.3, .16]} rotation-z={.88} geometry={meterBox(5.4, .09, .09)} material={brass('#c8a063')}/>
            <mesh position={[-.3, 2.6, .14]} rotation-z={-.42} geometry={meterBox(3.2, .05, .05)} material={finishMaterial('#e8d7bc', .5)}/>
            <mesh position={[.2, 2.05, .1]} rotation-z={.3}><torusGeometry args={[.9, .035, 8, 48, Math.PI * .9]}/><meshStandardMaterial color="#d9a441" roughness={.45}/></mesh>
        </group>}
    </group>;
}

/* ---------- mouldings ---------- */
const LIME = '#efe5d1', WALL = '#d9cdb6', PLINTH = '#c4b69b';
function Archivolt({ x }: { x: number }) {
    const { halfWidth: r, spring, wallZ } = PORTAL;
    const keystone = useMemo(() => cachedGeometry('keystone', () => { const s = new THREE.Shape(); s.moveTo(-.26, 0); s.lineTo(.26, 0); s.lineTo(.38, .92); s.lineTo(-.38, .92); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: .3, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 2 }); }), []);
    return <group position={[x, 0, wallZ]}>
        <mesh geometry={bandGeometry(r, r + .3, spring, .12, .03)} material={stone('limestone', LIME)} castShadow receiveShadow/>
        <mesh geometry={bandGeometry(r + .3, r + .48, spring, .24, .05)} material={stone('limestone', '#f3ead8')} castShadow receiveShadow/>
        <mesh position={[0, spring + r - .14, .02]} geometry={keystone} material={stone('limestone', '#f1e7d3')} castShadow receiveShadow/>
        {[-1, 1].map(side => <group key={side}>
            <Block p={[side * (r + .26), spring - .13, .16]} s={[.74, .26, .34]} kind="limestone" c={LIME}/>
            <Block p={[side * (r + .26), spring - .3, .12]} s={[.66, .08, .26]} kind="limestone" c={LIME}/>
            <Block p={[side * (r + .26), .34, .18]} s={[.72, .68, .38]} kind="travertine" c={PLINTH}/>
        </group>)}
        {/* threshold: dark honed stone with a brass nosing */}
        <Block p={[0, .03, -PORTAL.depth / 2]} s={[r * 2, .06, PORTAL.depth]} kind="floor" c="#6d665c" rough={.8}/>
        <mesh position={[0, .045, .04]} geometry={meterBox(r * 2, .03, .08)} material={brass()} receiveShadow/>
    </group>;
}
function Pilaster({ x }: { x: number }) {
    const z = PORTAL.wallZ;
    return <group position={[x, 0, z]}>
        <Block p={[0, .32, .2]} s={[.86, .64, .4]} kind="travertine" c={PLINTH}/>
        <Block p={[0, .7, .15]} s={[.74, .12, .3]} kind="limestone" c={LIME}/>
        <Block p={[0, 3.63, .09]} s={[.6, 5.74, .18]} kind="limestone" c={LIME}/>
        <Block p={[0, 6.56, .15]} s={[.76, .12, .3]} kind="limestone" c={LIME}/>
    </group>;
}
function Entablature() {
    const z = PORTAL.wallZ, W = PORTAL.hallHalf * 2;
    const dentils = useRef<THREE.InstancedMesh>(null);
    useEffect(() => {
        const m = new THREE.Matrix4(), n = dentils.current!; const count = n.count;
        for (let i = 0; i < count; i++) { m.makeTranslation(-W / 2 + .2 + i * (W - .4) / (count - 1), 8.52, z + .36); n.setMatrixAt(i, m); }
        n.instanceMatrix.needsUpdate = true;
    }, [W, z]);
    return <group position-y={-.3}>
        <Block p={[0, 7.1, z + .14]} s={[W, .34, .28]} kind="limestone" c={LIME}/>
        <Block p={[0, 7.3, z + .2]} s={[W, .06, .36]} kind="limestone" c={LIME}/>
        <Block p={[0, 7.86, z + .08]} s={[W, 1.06, .16]} kind="limestone" c="#ece2cd"/>
        <Block p={[0, 8.43, z + .22]} s={[W, .1, .44]} kind="limestone" c={LIME}/>
        <instancedMesh ref={dentils} args={[meterBox(.13, .17, .14), stone('limestone', LIME), 66]} castShadow receiveShadow/>
        <Block p={[0, 8.7, z + .32]} s={[W, .16, .64]} kind="limestone" c={LIME}/>
        <Block p={[0, 8.86, z + .42]} s={[W, .16, .84]} kind="limestone" c="#f4ecdb"/>
        <Block p={[0, 9.0, z + .38]} s={[W, .12, .76]} kind="limestone" c={LIME}/>
        {/* attic: a recessed panel above each portal and the museum's central oculus */}
        {order.map(id => <group key={id} position={[doorX[id], 10.05, z + .03]}>
            {[[0, .62, 3.2, .1], [0, -.62, 3.2, .1], [-1.55, 0, .1, 1.34], [1.55, 0, .1, 1.34]].map(([x, y, w, h], i) => <Block key={i} p={[x, y, .03]} s={[w, h, .12]} kind="limestone" c={LIME}/>)}
        </group>)}
        <group position={[0, 10.05, z + .05]}>
            <mesh><circleGeometry args={[.62, 48]}/><meshStandardMaterial color="#fff4dc" emissive="#ffe0a0" emissiveIntensity={1.8}/></mesh>
            {Array.from({ length: 12 }, (_, i) => <mesh key={i} rotation-z={i * Math.PI / 6} position={[0, 0, .02]}><planeGeometry args={[.03, 1.0]}/><primitive object={brass('#c9a76a')} attach="material"/></mesh>)}
            <mesh position={[0, 0, .04]}><torusGeometry args={[.66, .07, 12, 64]}/><primitive object={brass()} attach="material"/></mesh>
        </group>
        {order.map(id => <group key={id} position={[doorX[id], 0, z + .17]}>
            <mesh position={[0, 7.98, 0]}><planeGeometry args={[3.7, .7]}/><meshBasicMaterial map={engravedTexture(id.toUpperCase(), 120, '#9c7a40', .5)} transparent depthWrite={false} toneMapped={false}/></mesh>
            <mesh position={[0, 7.55, 0]}><planeGeometry args={[3.7, .34]}/><meshBasicMaterial map={engravedTexture(movement[id], 78, '#6a583f', .5)} transparent depthWrite={false} toneMapped={false}/></mesh>
        </group>)}
    </group>;
}
/** Baked ambient occlusion where masonry meets the floor (cheap; works without shadow maps). */
function ContactShadows() {
    const { halfWidth: r, wallZ, hallHalf: H } = PORTAL;
    const edges = [-H, ...order.flatMap(id => [doorX[id] - r, doorX[id] + r]), H];
    const segments: [number, number][] = []; for (let i = 0; i < edges.length; i += 2) segments.push([edges[i], edges[i + 1]]);
    return <group>{segments.map(([a, b]) => <mesh key={a} position={[(a + b) / 2, .018, wallZ + .55]} rotation-x={-Math.PI / 2} renderOrder={1}><planeGeometry args={[b - a + .5, 1.1]}/><meshBasicMaterial color="#1c140c" alphaMap={softStrip()} transparent opacity={.5} depthWrite={false}/></mesh>)}</group>;
}

export const PortalWall = memo(function PortalWall() {
    return <group>
        <mesh geometry={portalWallGeometry()} material={stone('ashlar', WALL)} castShadow receiveShadow/>
        {order.map(id => <Archivolt key={id} x={doorX[id]}/>)}
        {[-10.25, -5, 0, 5, 10.25].map(x => <Pilaster key={x} x={x}/>)}
        <Entablature/>
        <ContactShadows/>
        {order.map(id => <Vestibule key={id} id={id}/>)}
    </group>;
});

/* ---------- interaction ---------- */
function Threshold({ id, open, onDoor, reduced }: { id: RoomId; open: boolean; onDoor: (id: RoomId) => void; reduced: boolean }) {
    const [hover, setHover] = useState(false);
    const { invalidate } = useThree();
    const shape = useMemo(() => cachedGeometry('opening', () => new THREE.ShapeGeometry(openingShape(), 32)), []);
    useEffect(() => {
        const level = open ? 2.2 : hover ? 1 : 0;
        const tween = gsap.to(glowLevel[id], { v: level, duration: reduced ? 0 : open ? 1.1 : .35, ease: 'power2.out', onUpdate: () => { applyGlow(id); invalidate(); }, onComplete: () => { applyGlow(id); invalidate(); } });
        return () => { tween.kill(); };
    }, [id, hover, open, reduced, invalidate]);
    useEffect(() => () => { glowLevel[id].v = 0; applyGlow(id); document.body.style.cursor = ''; }, [id]);
    return <group position={[doorX[id], 0, PORTAL.wallZ + .3]}
        onPointerOver={e => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
        onClick={e => { e.stopPropagation(); onDoor(id); }}>
        {/* invisible hit surface filling the whole arched opening (≥ 3 m wide: generous on phones) */}
        <mesh geometry={shape}><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
        {hover && <mesh position={[0, .75, .05]}><planeGeometry args={[2.6, .5]}/><meshBasicMaterial map={engravedTexture('Step inside', 70, '#fbf1dc', .12)} transparent depthWrite={false} toneMapped={false}/></mesh>}
    </group>;
}
export function PortalThresholds({ target, onDoor, reduced }: { target: RoomId | null; onDoor: (id: RoomId) => void; reduced: boolean }) {
    return <group>{rooms.map(room => <Threshold key={room.id} id={room.id} open={target === room.id} onDoor={onDoor} reduced={reduced}/>)}</group>;
}
