// Museum of Days — FOUR WAYS TO REMEMBER (Claude art direction).
// Each gallery shares the museum's proportions (20 m wide, 13.6 m high, frames on free-standing
// partitions) but speaks its own artistic language through architecture, light and sculpture.
//   GLOW  · Impressionism  — warm limestone loggia, clerestory sun, a lily basin of reflected light.
//   HUSH  · Tonalism       — matte plaster, flat lintels as architectural pauses, a balanced cairn.
//   ECHO  · Romanticism    — a deep arcade receding into cool haze, layers of distance.
//   PULSE · Abstraction    — dark envelope, circles, diagonals and arcs composed as one system.
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { RoomId } from './data';
import { brass, cachedGeometry, finishMaterial, meterBox, meterUV, softSpot, stone, type StoneKind } from './materials';

type V3 = [number, number, number];
export interface RoomStyle { wallKind: StoneKind; wall: string; floorKind: StoneKind; floor: string; ceiling: string; arch: string; partition: string; partitionKind: StoneKind; frame: string; plinth: string }
export const roomStyle: Record<RoomId, RoomStyle> = {
    glow: { wallKind: 'limestone', wall: '#dcc39c', floorKind: 'floor', floor: '#d6c4a3', ceiling: '#efe3cb', arch: '#efe1c6', partition: '#e3cca6', partitionKind: 'limestone', frame: '#b08a4c', plinth: '#c4a983' },
    hush: { wallKind: 'plaster', wall: '#a5b2a3', floorKind: 'travertine', floor: '#bcc0b4', ceiling: '#d6dbd0', arch: '#c2cabd', partition: '#adb9aa', partitionKind: 'plaster', frame: '#b7bdae', plinth: '#c8ccc0' },
    echo: { wallKind: 'ashlar', wall: '#7e8d9c', floorKind: 'floor', floor: '#767d84', ceiling: '#6c7783', arch: '#a2aebb', partition: '#8494a5', partitionKind: 'plaster', frame: '#6f634f', plinth: '#4f4a45' },
    pulse: { wallKind: 'plaster', wall: '#5a242b', floorKind: 'floor', floor: '#45403f', ceiling: '#2c2324', arch: '#8b5a4e', partition: '#4c2026', partitionKind: 'plaster', frame: '#b8955a', plinth: '#2c2728' },
};

function Block({ p, s, kind, c, rough, rot = 0, shadow = true }: { p: V3; s: V3; kind?: StoneKind; c: string; rough?: number; rot?: number; shadow?: boolean }) {
    return <mesh position={p} rotation-y={rot} geometry={meterBox(...s)} material={kind ? stone(kind, c, { rough }) : finishMaterial(c, rough ?? .7)} castShadow={shadow} receiveShadow/>;
}
function bandShape(r0: number, r1: number, spring: number) {
    const s = new THREE.Shape();
    s.moveTo(-r1, 0); s.lineTo(-r1, spring); s.absarc(0, spring, r1, Math.PI, 0, true); s.lineTo(r1, 0);
    s.lineTo(r0, 0); s.lineTo(r0, spring); s.absarc(0, spring, r0, 0, Math.PI, false); s.lineTo(-r0, 0); s.closePath();
    return s;
}
const archGeometry = (r0: number, r1: number, spring: number, depth: number) => cachedGeometry(`garch|${r0}|${r1}|${spring}|${depth}`, () => new THREE.ExtrudeGeometry(bandShape(r0, r1, spring), { depth, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2, curveSegments: 56 }));
/** A soffit-faced transverse arch: one draw call per arch, metre UVs from ExtrudeGeometry. */
function TransverseArch({ z, r0, r1, spring, depth, color, kind = 'limestone' }: { z: number; r0: number; r1: number; spring: number; depth: number; color: string; kind?: StoneKind }) {
    return <mesh position={[0, 0, z - depth / 2]} geometry={archGeometry(r0, r1, spring, depth)} material={stone(kind, color)} castShadow receiveShadow/>;
}
function Glow({ p, s, color, opacity, rot = [0, 0, 0] as V3, floor = false }: { p: V3; s: [number, number]; color: string; opacity: number; rot?: V3; floor?: boolean }) {
    return <mesh position={p} rotation={floor ? [-Math.PI / 2, 0, 0] : rot} renderOrder={2}><planeGeometry args={s}/><meshBasicMaterial map={softSpot()} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide}/></mesh>;
}

/* ---------- GLOW ---------- */
function LilyBasin() {
    const pads = useMemo(() => Array.from({ length: 11 }, (_, i) => { const a = i * 2.39996, r = .35 + (i % 4) * .28; return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: .16 + (i % 3) * .05, flower: i % 3 === 0, hue: ['#7f9a5c', '#94aa68', '#6f8a55'][i % 3] }; }), []);
    return <group position={[0, 0, -14]}>
        <mesh position={[0, .24, 0]} castShadow receiveShadow><cylinderGeometry args={[2.05, 2.15, .48, 64, 1, true]}/><primitive object={stone('travertine', '#d9c6a2')} attach="material"/></mesh>
        <mesh position={[0, .47, 0]} rotation-x={-Math.PI / 2} receiveShadow><ringGeometry args={[1.82, 2.08, 64]}/><primitive object={stone('limestone', '#eadbbd')} attach="material"/></mesh>
        <mesh position={[0, .2, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[1.84, 64]}/><meshStandardMaterial color="#3e5a55" roughness={.06} metalness={.35} envMapIntensity={2.2}/></mesh>
        {pads.map((d, i) => <group key={i} position={[d.x, .215, d.z]} rotation-y={i}>
            <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[d.s, 20, .3, Math.PI * 1.85]}/><meshStandardMaterial color={d.hue} roughness={.6}/></mesh>
            {d.flower && <mesh position={[0, .03, 0]} scale={[1, .55, 1]}><sphereGeometry args={[.065, 10, 8]}/><meshStandardMaterial color="#f0c6c4" emissive="#f5c9b8" emissiveIntensity={.25} roughness={.5}/></mesh>}
        </group>)}
        <Glow p={[0, .025, 0]} s={[6, 6]} color="#ffd9a2" opacity={.22} floor/>
    </group>;
}
function GlowArchitecture({ length }: { length: number }) {
    return <group>
        {[0, -8, -16, -24, -32].filter(z => z > -length + 4).map(z => <group key={z}><TransverseArch z={z} r0={8.9} r1={9.35} spring={4.6} depth={.6} color="#efe2c8"/>
            {[-1, 1].map(s => <Block key={s} p={[s * 9.05, 2.3, z]} s={[.7, 4.6, .9]} kind="limestone" c="#e8d7b6"/>)}</group>)}
        {/* clerestory: tall sunlit windows high on the left wall, sun shafts falling across the room */}
        {[-4, -12, -20, -28].map(z => <group key={z}>
            <mesh position={[-9.43, 10.4, z]} rotation-y={Math.PI / 2}><planeGeometry args={[2.2, 3.2]}/><meshStandardMaterial color="#fff6e2" emissive="#ffe0a6" emissiveIntensity={1.5}/></mesh>
            <Block p={[-9.4, 8.7, z]} s={[.2, .18, 2.6]} kind="limestone" c="#efe3cb"/>
            <Glow p={[-6.2, 9.6, z - .4]} s={[2.4, 8]} color="#ffd593" opacity={.08} rot={[0, 0, -.62]}/>
            <Glow p={[-1.8, .03, z - .6]} s={[5.5, 3.2]} color="#ffdca6" opacity={.2} floor/>
        </group>)}
        <LilyBasin/>
    </group>;
}

/* ---------- HUSH ---------- */
function Cairn() {
    const stones: [number, number, number, number][] = [[0, .2, .62, .28], [.05, .5, .48, .22], [-.04, .76, .36, .18], [.03, .96, .24, .13], [0, 1.1, .14, .09]];
    return <group position={[0, .9, -14]}>
        <Block p={[0, -.45, 0]} s={[2.2, .9, 1.1]} kind="plaster" c="#c9cdc1"/>
        {stones.map(([x, y, r, h], i) => <mesh key={i} position={[x, y, 0]} scale={[r, h, r * .82]} rotation-y={i * .9} castShadow receiveShadow><sphereGeometry args={[1, 32, 16]}/><meshStandardMaterial color={['#8d968a', '#a7ada0', '#7c8579', '#b5b9ad', '#93998d'][i]} roughness={.88}/></mesh>)}
    </group>;
}
function HushArchitecture({ length }: { length: number }) {
    // Flat lintels on square piers: the rhythm slows; long uninterrupted surfaces carry the room.
    return <group>
        {[-2, -14, -26].filter(z => z > -length + 4).map(z => <group key={z}>
            {[-1, 1].map(s => <Block key={s} p={[s * 8.9, 3.6, z]} s={[1.2, 7.2, .9]} kind="plaster" c="#b4beb1"/>)}
            <Block p={[0, 7.65, z]} s={[19, .9, .9]} kind="plaster" c="#bcc5b8"/>
        </group>)}
        {/* a single long diffuse skylight — overcast light, no hard edges */}
        <mesh position={[0, 13.42, -14]} rotation-x={Math.PI / 2}><planeGeometry args={[6, 30]}/><meshStandardMaterial color="#f2f6ef" emissive="#e9f0e5" emissiveIntensity={.75}/></mesh>
        <Block p={[0, .55, -6]} s={[3.2, .14, .8]} kind="plaster" c="#d8dccf"/>
        {[-1.2, 1.2].map(x => <Block key={x} p={[x, .24, -6]} s={[.2, .48, .66]} kind="plaster" c="#9ba798"/>)}
        <Cairn/>
    </group>;
}

/* ---------- ECHO ---------- */
function EchoArchitecture({ length }: { length: number }) {
    // A tall arcade every 6 m receding into cool fog: distance itself becomes the subject.
    const bays = [2, -4, -10, -16, -22, -28].filter(z => z > -length + 4);
    return <group>
        {bays.map(z => <group key={z}>
            <TransverseArch z={z} r0={6.4} r1={7.05} spring={6.2} depth={.9} color="#a3afbc" kind="ashlar"/>
            {[-1, 1].map(s => <group key={s}><Block p={[s * 8.35, 6.8, z]} s={[2.7, 13.6, 1.1]} kind="ashlar" c="#8996a5"/><Block p={[s * 7.35, .3, z]} s={[.9, .6, 1.3]} kind="limestone" c="#a9b3be"/><Block p={[s * 7.25, 6.05, z]} s={[.6, .3, 1.2]} kind="limestone" c="#a9b3be"/></group>)}
        </group>)}
        {/* archival stele: a tall dark slab with a cool rim of moonlight */}
        <group position={[0, 0, -14]}>
            <Block p={[0, .15, 0]} s={[2.4, .3, 1.4]} kind="limestone" c="#5d6167"/>
            <Block p={[0, 2.5, 0]} s={[1.1, 4.4, .36]} kind="ashlar" c="#4d5560"/>
            <mesh position={[0, 4.95, 0]} rotation-z={Math.PI / 4} geometry={meterBox(.42, .42, .3)} material={finishMaterial('#8d7a5a', .38, .8)} castShadow/>
        </group>
        <Glow p={[0, 6, -length + 6]} s={[14, 12]} color="#c6d6ee" opacity={.16}/>
    </group>;
}

/* ---------- PULSE ---------- */
function Composition() {
    // Kandinsky as a principle, not a copy: a dominant circle, a counter-circle, a crossing
    // diagonal and an arc, balanced around one centre of gravity.
    const ring = useRef<THREE.Mesh>(null);
    useEffect(() => { ring.current?.lookAt(0, 3, 8); }, []);
    return <group position={[0, 0, -14]}>
        <Block p={[0, .4, 0]} s={[2.6, .8, 2.6]} kind="floor" c="#2a2526" rough={.5}/>
        <mesh position={[-.6, 4.1, -.3]} castShadow><cylinderGeometry args={[1.55, 1.55, .14, 64]}/><meshStandardMaterial color="#b63a2a" roughness={.5}/></mesh>
        <mesh ref={ring} position={[.7, 3.4, .5]} castShadow><torusGeometry args={[1.9, .07, 12, 96]}/><meshStandardMaterial color="#cf8e5c" metalness={.95} roughness={.26}/></mesh>
        <mesh position={[1.6, 5.7, .2]} castShadow><sphereGeometry args={[.42, 32, 16]}/><meshStandardMaterial color="#141418" roughness={.3} metalness={.4}/></mesh>
        <mesh position={[.2, 3.6, .7]} rotation={[0, 0, .86]} geometry={meterBox(7.6, .12, .12)} material={brass('#c9a364')} castShadow/>
        <mesh position={[-.4, 2.6, .9]} rotation={[0, 0, -.5]} geometry={meterBox(4.2, .06, .06)} material={finishMaterial('#efe1c8', .45)} castShadow/>
        <mesh position={[.3, 1.9, .6]} rotation={[0, .3, .4]} castShadow><torusGeometry args={[1.25, .05, 8, 64, Math.PI * .85]}/><meshStandardMaterial color="#e0a83c" roughness={.4} metalness={.3}/></mesh>
        <mesh position={[-1.7, 1.6, .4]} rotation-z={.2} castShadow><coneGeometry args={[.45, 1, 3]}/><meshStandardMaterial color="#1f3f7a" roughness={.45}/></mesh>
    </group>;
}
function PulseArchitecture({ length }: { length: number }) {
    return <group>
        {/* great copper hoops replace the classical arch: the room is read as circles in sequence */}
        {[0, -10, -20, -30].filter(z => z > -length + 4).map((z, i) => <mesh key={z} position={[0, 6.2, z]} castShadow><torusGeometry args={[7.4, .16, 12, 120]}/><meshStandardMaterial color={i % 2 ? '#8e4d3c' : '#c08158'} metalness={.85} roughness={.32}/></mesh>)}
        {/* diagonal blades on the walls set the tempo */}
        {[-1, 1].flatMap(s => [0, 1, 2, 3].map(i => <mesh key={`${s}${i}`} position={[s * 9.35, 6.5, -3 - i * 8]} rotation={[s * (.55 + (i % 2) * .25), 0, 0]} geometry={meterBox(.12, 11, .34)} material={finishMaterial(i % 2 ? '#2a2223' : '#b88c64', .35, i % 2 ? .2 : .85)} castShadow/>))}
        {/* a deep red sun on the far wall anchors the perspective */}
        <mesh position={[3.5, 8.6, -length + 5.3]}><circleGeometry args={[2.6, 64]}/><meshStandardMaterial color="#c0442c" roughness={.6}/></mesh>
        <mesh position={[-4.2, 5.2, -length + 5.35]}><circleGeometry args={[.9, 48]}/><meshStandardMaterial color="#e3ad48" roughness={.6}/></mesh>
        <Composition/>
    </group>;
}

export const RoomArchitecture = memo(function RoomArchitecture({ room, length }: { room: RoomId; length: number }) {
    if (room === 'glow') return <GlowArchitecture length={length}/>;
    if (room === 'hush') return <HushArchitecture length={length}/>;
    if (room === 'echo') return <EchoArchitecture length={length}/>;
    return <PulseArchitecture length={length}/>;
});

/** Fluted shaft as one mesh: the flutes are modelled in the vertices, not stacked cylinders. */
export function flutedShaft(r: number, r2: number, h: number) {
    return cachedGeometry(`flute|${r}|${r2}|${h}`, () => {
        const g = new THREE.CylinderGeometry(r2, r, h, 96, 1, true), p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
            const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 - .07 * Math.max(0, Math.cos(a * 16)) ** .6;
            p.setX(i, x * k); p.setZ(i, z * k);
        }
        g.computeVertexNormals();
        return meterUV(g, Math.PI * 2 * r, h);
    });
}
