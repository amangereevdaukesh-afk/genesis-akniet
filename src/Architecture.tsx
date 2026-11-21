import { Installation } from "./Installation";
import { AtelierModel } from './AtelierModel';
import { MemorySurface } from './Exhibits';
import type { Memory } from './memories';
import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { inscriptionTexture, paintingTexture } from './textures';
import { brass as brassMaterial, cachedGeometry, finishMaterial, meterBox, meterUV, softRect, softSpot, softStrip, stone as stoneMaterial, type StoneKind } from './materials';
import { PortalWall } from './Portal';
import { RoomArchitecture, flutedShaft, roomStyle } from './GalleryRooms';
import { exhibitionPosition, type Room } from './data';
type V3 = [
    number,
    number,
    number
];
const stone = '#e4dccc', brass = '#a58448';
/** Architectural block. Textured blocks carry metre-scaled UVs so stone grain keeps its real size. */
export const Box = memo(function Box({ p, s, c = stone, metal = 0, rough = .8, texture = false, rotation = 0, kind }: {
    p: V3;
    s: V3;
    c?: string;
    metal?: number;
    rough?: number;
    texture?: boolean;
    rotation?: number;
    kind?: StoneKind;
}) {
    const material = texture || kind ? stoneMaterial(kind ?? 'limestone', c) : metal >= .5 ? finishMaterial(c, Math.min(rough, .38), .9) : finishMaterial(c, rough, metal);
    return <mesh position={p} geometry={meterBox(...s)} rotation-y={rotation} material={material} castShadow receiveShadow/>;
});
function Cylinder({ p, r, h, c = stone, r2, segments = 24 }: {
    p: V3;
    r: number;
    h: number;
    c?: string;
    r2?: number;
    segments?: number;
}) {
    const geometry = cachedGeometry(`cyl|${r}|${r2 ?? r}|${h}|${segments}`, () => meterUV(new THREE.CylinderGeometry(r2 ?? r, r, h, segments), Math.PI * 2 * r, h));
    return <mesh position={p} geometry={geometry} material={stoneMaterial('limestone', c)} castShadow receiveShadow/>;
}
function OliveTree({ p, scale = 1 }: {
    p: V3;
    scale?: number;
}) { return <group position={p} scale={scale}><Cylinder p={[0, .4, 0]} r={.34} r2={.43} h={.8} c="#a69b80"/><Cylinder p={[0, 1.35, 0]} r={.045} r2={.025} h={1.8} c="#74654a"/>{Array.from({ length: 7 }, (_, b) => <group key={b} position={[0, 1 + b * .12, 0]} rotation={[Math.sin(b) * .3, b * 2.4, (b % 2 ? 1 : -1) * .55]}><Cylinder p={[0, .52, 0]} r={.012} r2={.005} h={1.05} c="#6d6047"/>{Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[(i % 2 ? 1 : -1) * (.06 + i * .008), .22 + i * .07, Math.sin(i + b) * .09]} rotation={[.2, i * .7, (i % 2 ? 1 : -1) * .6]} scale={[.038, .14, .018]}><sphereGeometry args={[1, 7, 5]}/><meshStandardMaterial color={i % 3 ? '#596c43' : '#7e8b60'} roughness={.9}/></mesh>)}</group>)}</group>; }
function Arch({ width = 4.6, spring = 5.5, thickness = .38, depth = .45, p = [0, 0, 0], c = stone }: {
    width?: number;
    spring?: number;
    thickness?: number;
    depth?: number;
    p?: V3;
    c?: string;
}) {
    const geo = useMemo(() => { const r = width / 2, shape = new THREE.Shape(); shape.moveTo(-r - thickness, 0); shape.lineTo(-r - thickness, spring); shape.absarc(0, spring, r + thickness, Math.PI, 0, true); shape.lineTo(r + thickness, 0); shape.lineTo(r, 0); shape.lineTo(r, spring); shape.absarc(0, spring, r, 0, Math.PI, false); shape.lineTo(-r, 0); shape.closePath(); return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 40 }); }, [width, spring, thickness, depth]);
    return <mesh geometry={geo} position={p} material={stoneMaterial('limestone', c)} castShadow receiveShadow/>;
}
function Spandrel() { const geo = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-4, 5.5); s.lineTo(-4, 10.4); s.lineTo(4, 10.4); s.lineTo(4, 5.5); s.lineTo(2.3, 5.5); s.absarc(0, 5.5, 2.3, 0, Math.PI, false); s.lineTo(-4, 5.5); return new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false, curveSegments: 40 }); }, []); return <mesh geometry={geo} position={[0, 0, 4]} material={stoneMaterial('limestone', stone)} castShadow receiveShadow/>; }
const Column = memo(function Column({ x, z, h = 7.8, r = .42 }: {
    x: number;
    z: number;
    h?: number;
    r?: number;
}) { return <group position={[x, 0, z]}><Box p={[0, .15, 0]} s={[r * 3, .3, r * 3]} texture/><Cylinder p={[0, .43, 0]} r={r * 1.25} h={.22}/><Cylinder p={[0, .62, 0]} r={r * 1.1} h={.15}/><mesh position={[0, h / 2 + .3, 0]} geometry={flutedShaft(r, r * .85, h - 1.1)} material={stoneMaterial('limestone', stone)} castShadow receiveShadow/><Cylinder p={[0, h - .3, 0]} r={r * 1.15} h={.18}/><Box p={[0, h - .12, 0]} s={[r * 2.7, .24, r * 2.7]} texture/>{[-1, 1].map(sign => <mesh key={sign} position={[sign * r * .8, h - .35, r * .65]} rotation-x={Math.PI / 2} material={stoneMaterial('limestone', stone)}><torusGeometry args={[.15, .06, 8, 16]}/></mesh>)}</group>; });
function Gate({ side }: {
    side: number;
}) { return <group position={[side * 2.3, .16, 5.05]} rotation-y={side * -1.08}><group position={[-side * 1.12, 0, 0]}><Box p={[0, 2.65, 0]} s={[2.24, 5.3, .12]} c="#323c35" metal={.5}/>{[-1, 1].map(s => <Box key={s} p={[s * 1.1, 2.65, .1]} s={[.1, 5.5, .12]} c={brass} metal={.75} rough={.28}/>)}{[.12, .65, 2.0, 3.95, 5.3].map(y => <Box key={y} p={[0, y, .12]} s={[2.24, .08, .08]} c={brass} metal={.75}/>)}{Array.from({ length: 7 }, (_, i) => <Box key={i} p={[-.9 + i * .3, 2.85, .12]} s={[.033, 4.75, .045]} c={brass} metal={.75}/>)}{[1.15, 2.8, 4.6].flatMap((y, k) => [-.57, .57].map((x, j) => <group key={`${k}-${j}`} position={[x, y, .18]}><mesh><torusGeometry args={[.32, .026, 6, 24]}/><meshStandardMaterial color="#c2a360" metalness={.8} roughness={.25}/></mesh><mesh rotation-z={Math.PI / 4}><boxGeometry args={[.37, .37, .035]}/><meshStandardMaterial color={brass} metalness={.7}/></mesh><mesh><sphereGeometry args={[.07, 10, 8]}/><meshStandardMaterial color="#d2b976" metalness={.8}/></mesh></group>))}<Box p={[side * .82, 2.6, .25]} s={[.055, .5, .11]} c="#d8b970" metal={.8}/></group></group>; }
export const Exterior = memo(function Exterior() {
    return <group>
 <Box p={[0, -.68, 15]} s={[70, .4, 40]} c="#d6cdbb" kind="travertine"/>
 {[0, 1, 2, 3].map(i => <Box key={i} p={[0, -.48 + i * .16, 8.5 - i * .6]} s={[20 - i * .5, .2, 5 - i * .8]} c={i % 2 ? '#d9d1c1' : '#c9c1b0'} texture/>)}
 {[-1, 1].map(side => <group key={side}><Box p={[side * 9, 5, 4.5]} s={[10, 10, 1.5]} c="#e2d8c4" kind="ashlar"/>{[6.2, 10.5, 13].map(x => <group key={x}><Box p={[side * x, 4.1, 5.4]} s={[1.15, 7.4, .48]} texture/><Box p={[side * x, 7.95, 5.5]} s={[1.65, .35, .8]} texture/></group>)}<Box p={[side * 3.2, 2.75, 4.5]} s={[1.8, 5.5, 1.5]} texture/>{[3.6, 5.05].map(x => <Column key={x} x={side * x} z={6.05}/>)}<Box p={[side * 8.5, .4, 5.5]} s={[9, .8, 1.2]} texture/></group>)}
 <Spandrel /><AtelierModel name="limestone-portal" position={[0,-.27,5.69]} scale={[1.42,1.49,1.1]}/>
 <AtelierModel name="cornice-course" position={[0,8.4,5.5]} scale={[2.95,1.15,1.6]}/><Box p={[0, 9.15, 5]} s={[28, 1.08, 1.3]} texture/>
 <mesh position={[0, 9.13, 5.67]}><planeGeometry args={[7.9, .97]}/><meshBasicMaterial transparent map={inscriptionTexture('M U S E U M   O F   D A Y S')}/></mesh>
 {[9.78, 10.05, 10.25].map((y, i) => <Box key={y} p={[0, y, 5.2]} s={[28 + i * .3, .17, 1.8 + i * .15]} texture/>)}
 {Array.from({ length: 61 }, (_, i) => <Box key={i} p={[-13.8 + i * .46, 9.7, 5.9]} s={[.19, .27, .28]} texture/>)}
 <Box p={[0, 10.65, 4.8]} s={[28, .6, 1.1]} texture/>
 {[-1, 1].map(side => <OliveTree key={side} p={[side * 6.7, .2, 7.8]} scale={1.2}/>)}
 <Gate side={-1}/><Gate side={1}/>
 </group>;
});
function Floor({ c = '#cfc3ab', length = 34, width = 23, kind = 'floor' }: {
    c?: string;
    length?: number;
    width?: number;
    kind?: StoneKind;
}) { return <mesh position={[0, -.15, -length / 2 + 5]} geometry={meterBox(width, .3, length)} material={stoneMaterial(kind, c, { rough: kind === 'floor' ? 1 : .95 })} receiveShadow/>; }
/** Soft darkening where walls meet the floor: baked occlusion that also works with shadows off. */
function BaseOcclusion({ x, z, length, side }: { x: number; z: number; length: number; side: 1 | -1 }) {
    return <mesh position={[x - side * .5, .016, z]} rotation={[-Math.PI / 2, 0, side * Math.PI / 2]} renderOrder={1}><planeGeometry args={[length, 1]}/><meshBasicMaterial color="#1b130c" alphaMap={softStrip()} transparent opacity={.42} depthWrite={false}/></mesh>;
}
function FrameArt({ p, width = 2, height = 2.5, room = 'glow', seed = 11, frame = brass, onClick, memory, empty = false }: {
    p: V3;
    width?: number;
    height?: number;
    room?: Room['id'];
    seed?: number;
    frame?: string;
    onClick?: () => void;
    memory?: Memory; empty?: boolean;
}) {
    const metallic = frame === brass || frame === roomStyle.pulse.frame || frame === roomStyle.glow.frame;
    return <group position={p}>
 {/* soft drop shadow on the wall and a wash from the picture light above */}
 <mesh position={[.04, -.1, -.045]} renderOrder={1}><planeGeometry args={[width + .9, height + .9]}/><meshBasicMaterial map={softRect()} color="#000" transparent opacity={.5} depthWrite={false}/></mesh>
 <mesh position={[0, height * .2, -.04]} renderOrder={1}><planeGeometry args={[width + 1.6, height + 1.2]}/><meshBasicMaterial map={softSpot()} color="#fff1d6" transparent opacity={.16} blending={THREE.AdditiveBlending} depthWrite={false}/></mesh>
 <AtelierModel name={empty?(room==="glow"?"sunlit-rebate":`${room}-rebate`):"gallery-molding"} scale={[width/1.95,height/2.45,1]}/>
 <mesh geometry={meterBox(width + .08, height + .08, .1)} material={metallic ? finishMaterial(frame, .34, .85) : finishMaterial(frame, .55)} castShadow receiveShadow/>
 <mesh position={[0, 0, .085]} geometry={meterBox(width + .1, height + .1, .04)} material={finishMaterial('#ece5d3', .95)} receiveShadow/>
 {empty ? <MemorySurface memory={memory} onClick={onClick!}/> : <mesh position={[0, 0, .12]} onClick={onClick} onPointerOver={onClick ? () => { document.body.style.cursor = 'pointer'; } : undefined} onPointerOut={onClick ? () => { document.body.style.cursor = ''; } : undefined}><planeGeometry args={[width, height]}/><meshStandardMaterial map={paintingTexture(room, seed)} roughness={1}/></mesh>}
 <Box p={[width * .32, -height / 2 - .4, .06]} s={[.52, .19, .03]} c="#ece6d6"/>
 {/* picture light: brass arm and a softly glowing diffuser */}
 <mesh position={[0, height / 2 + .34, .28]} geometry={meterBox(width * .65, .06, .2)} material={brassMaterial()}/>
 <mesh position={[0, height / 2 + .305, .3]} geometry={meterBox(width * .6, .012, .12)} material={finishMaterial('#fff3da', .9, 0, '#ffe7bd', 1.2)}/>
 <mesh position={[0, height / 2 + .2, .14]} geometry={meterBox(.04, .26, .04)} material={brassMaterial()}/>
 </group>;
}
const Bench = memo(function Bench({ x, z }: { x: number; z: number }) {
    return <group position={[x, 0, z]}>
        <mesh position={[0, .015, 0]} rotation-x={-Math.PI / 2} renderOrder={1}><planeGeometry args={[3.6, 1.9]}/><meshBasicMaterial map={softRect()} color="#000" transparent opacity={.45} depthWrite={false}/></mesh>
        <Box p={[0, .63, 0]} s={[2.8, .12, .95]} c="#6e5640" rough={.55}/>
        {[-1, 1].map(s => <Box key={s} p={[s * 1.05, .29, 0]} s={[.42, .58, .8]} c="#cdbfa5" kind="travertine"/>)}
    </group>;
});
export const Hall = memo(function Hall() {
    const L = 18.5;
    return <group><Floor length={L} width={22.6}/>
 {/* side walls in coursed ashlar with pilasters and a niche each */}
 {[-1, 1].map(s => <group key={s}>
  <Box p={[s * 11.3, 5.6, -3.4]} s={[.6, 11.2, 17.2]} c="#dccfb8" kind="ashlar"/>
  <BaseOcclusion x={s * 11} z={-3.4} length={17.2} side={s as 1 | -1}/>
  {[2.4, -9].map(z => <Box key={z} p={[s * 10.92, 3.6, z]} s={[.18, 7.2, .7]} c="#efe5d1" kind="limestone"/>)}
  <group position={[s * 10.95, 0, -3.3]} rotation-y={s * -Math.PI / 2}><Arch width={3.8} spring={3.8} thickness={.25} depth={.3}/><Box p={[0, 2.6, -.1]} s={[3.7, 5.2, .1]} c={s < 0 ? '#9aa392' : '#7e5a5a'} kind="plaster"/><FrameArt p={[0, 2.7, .07]} width={1.7} height={2.2} room={s === -1 ? 'hush' : 'echo'} seed={s < 0 ? 42 : 43}/></group>
  <Box p={[s * 10.85, 7.15, -3.4]} s={[.3, .3, 17.2]} c="#efe5d1" kind="limestone"/>
 </group>)}
 {/* coffered ceiling: deep beams, a run of skylights over the central axis */}
 <mesh position={[0, 11.35, -3.4]} geometry={meterBox(22.6, .3, 17.2)} material={stoneMaterial('plaster', '#e9e0cd')}/>
 {[3.5, -1.2, -5.9].map(z => <mesh key={z} position={[0, 10.85, z]} geometry={meterBox(22, .7, .55)} material={stoneMaterial('limestone', '#e6dbc4')}/>)}
 {[-5.6, 5.6].map(x => <mesh key={x} position={[x, 10.85, -3.4]} geometry={meterBox(.55, .7, 17.2)} material={stoneMaterial('limestone', '#e6dbc4')}/>)}
 {[1.15, -3.55, -8.6].map(z => <group key={z}><mesh position={[0, 11.18, z]} rotation-x={Math.PI / 2}><planeGeometry args={[9.6, 3.6]}/><meshStandardMaterial color="#fff8ea" emissive="#fff0d2" emissiveIntensity={.85}/></mesh><mesh position={[0, 11.16, z]} geometry={meterBox(10.4, .08, 4.3)} material={finishMaterial('#d9ccb1', .7)}/></group>)}
 {/* the arch that frames the first view, inherited from the original hall */}
 <Arch width={12} spring={4.9} thickness={.45} depth={.55} p={[0, 0, 1]} c="#e3d6bd"/>{[-1, 1].map(s => <Column key={s} x={s * 6} z={1.4} h={5.2} r={.35}/>)}
 {/* alabaster sconces on the piers between the portals */}
 {[-10.25, -5, 0, 5, 10.25].map(x => <group key={x} position={[x, 4.4, -11.55]}><AtelierModel name="alabaster-lantern" scale={[1.25, 1.25, 1.25]}/></group>)}
 {/* a brass compass inlaid in the floor marks the centre of the hall */}
 <group position={[0, .012, -5.2]} rotation-x={-Math.PI / 2}>
  <mesh renderOrder={1}><ringGeometry args={[1.25, 1.33, 96]}/><primitive object={brassMaterial()} attach="material"/></mesh>
  <mesh position={[0, 0, -.002]}><circleGeometry args={[1.25, 96]}/><primitive object={stoneMaterial('floor', '#7c766a', { rough: .7 })} attach="material"/></mesh>
  {[0, 1, 2, 3].map(i => <mesh key={i} rotation-z={i * Math.PI / 2} position={[0, 0, .001]}><circleGeometry args={[1.05, 3, -Math.PI / 2 - .12, .24]}/><primitive object={brassMaterial('#c9a76a')} attach="material"/></mesh>)}
 </group>
 <Bench x={-4.6} z={-6.6}/><Bench x={4.6} z={-6.6}/>
 <PortalWall/>
 </group>;
});
export const Gallery = memo(function Gallery({ room, onSelect, selected }: {
    room: Room;
    onSelect: (i: number) => void;
    selected: number | null;
}) {
    const length = 40, style = roomStyle[room.id];
    const anchor=selected??0; const offset=anchor>3?exhibitionPosition(anchor,room.id)[2]+8:0;
    const partitionHeight = room.id === 'pulse' ? 7 : room.id === 'echo' ? 6.3 : room.id === 'hush' ? 4.8 : 5.5;
    return <group>
 <group position={[0,0,offset]}><Floor c={style.floor} length={length} width={20} kind={style.floorKind}/>
 <Box p={[-9.7, 6.8, -length / 2 + 4]} s={[.5, 13.6, length]} c={style.wall} kind={style.wallKind}/><Box p={[9.7, 6.8, -length / 2 + 4]} s={[.5, 13.6, length]} c={style.wall} kind={style.wallKind}/><Box p={[0, 6.8, -length + 5]} s={[20, 13.6, .5]} c={style.wall} kind={style.wallKind}/>
 {[-1, 1].map(s => <BaseOcclusion key={s} x={s * 9.45} z={-length / 2 + 4} length={length} side={s as 1 | -1}/>)}
 <mesh position={[0, 13.6, -length / 2 + 4]} geometry={meterBox(20, .3, length)} material={stoneMaterial('plaster', style.ceiling)}/>
 <RoomArchitecture room={room.id} length={length}/>
 </group>{room.works.map((art, i) => { if(Math.abs(i-anchor)>3)return null; const p = exhibitionPosition(i, room.id); return <group key={`${room.id}-${art.seed}`} position={[p[0], 0, p[2]]} rotation-y={room.id === 'pulse' ? (i % 2 ? -.38 : .25) : room.id === 'echo' ? (i % 2 ? .12 : -.08) : 0}>
  <mesh position={[0, .016, .6]} rotation-x={-Math.PI / 2} renderOrder={1}><planeGeometry args={[5.6, 2.2]}/><meshBasicMaterial map={softRect()} color="#000" transparent opacity={.4} depthWrite={false}/></mesh>
  {room.id==="glow"?<AtelierModel name="golden-loggia"/>:<><Box p={[0, partitionHeight / 2, -.2]} s={[room.id === 'hush' ? 3.7 : 4.6, partitionHeight, .3]} c={style.partition} kind={style.partitionKind}/><Box p={[0, .15, -.14]} s={[4.8, .3, .55]} c={style.plinth} kind={room.id === 'hush' ? 'plaster' : 'travertine'}/></>}
  <FrameArt p={[0, 2.7, .02]} width={1.95} height={2.45} room={room.id} seed={art.seed} empty memory={art.memory} frame={style.frame} onClick={() => onSelect(i)}/></group>; })}
 <Installation room={room.id}/>
 </group>;
});
