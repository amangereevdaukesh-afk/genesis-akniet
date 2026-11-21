import { Doorways, DoorJourney, doorX } from './Exhibits';
import { exhibition, type Memory } from './memories';
import type { RoomId } from './data';
import { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { Exterior, Hall, Gallery } from './Architecture';
import { skyTexture } from './textures';
import { LightRig } from './Lighting';
import { exhibitionPosition, roomById, type Place } from './data';
interface Props {
    memories: Memory[]; door:RoomId|null; onDoor:(id:RoomId)=>void; onArrival:()=>void;
    place: Place;
    selected: number | null;
    reduced: boolean;
    quality: 'high' | 'low';
    onReady: () => void;
    onSettled: () => void;
    onSelect: (i: number) => void;
}
function CameraRig({ place, selected, reduced, onSettled }: Pick<Props, 'place' | 'selected' | 'reduced' | 'onSettled'>) {
    const { camera, invalidate, size, gl } = useThree();
    const aim = useRef(new THREE.Vector3(0, 4.4, 4));
    const previous = useRef<Place>('entrance');
    useEffect(() => {
        const mobile = size.width / size.height < .85;
        const isEntry = place === 'entrance';
        const room = roomById(place);
        let pos = [0, isEntry ? 4.6 : 3.4, isEntry ? (mobile ? 25 : 20) : 1.7];
        if(mobile && place==='hall')pos[0]=roomById(previous.current)?doorX[previous.current as RoomId]:doorX.glow;
        let target = [pos[0], isEntry ? (mobile ? 3.8 : 5.1) : 4.25, isEntry ? 4 : -15];
        if (room && selected !== null) {
            const p = exhibitionPosition(selected, room.id);
            pos = [p[0], 2.75, p[2] + (mobile ? 6.4 : 5.4)];
            target = [p[0], 2.7, p[2]];
        }
        else if (room) {
            pos = [mobile?exhibitionPosition(0,room.id)[0]:0, 3.25, mobile ? 10 : 6];
            target = [pos[0], 3, -10];
        }
        if(room && previous.current!==place){camera.position.set(0,3.25,mobile?11:9);aim.current.set(0,3,-10)}
        if(place==='hall' && roomById(previous.current)){camera.position.set(doorX[previous.current as RoomId],2.7,-6);aim.current.set(0,3,-15)}
        const duration = reduced ? 0 : previous.current === 'entrance' && place === 'hall' ? 3.7 : previous.current === 'hall' && place === 'entrance' ? 2.8 : 1.35;
        const update = () => { camera.lookAt(aim.current); invalidate(); };
        const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, onUpdate: update, onComplete: () => { update(); onSettled(); } });
        tl.to(camera.position, { x: pos[0], y: pos[1], z: pos[2], duration }, 0).to(aim.current, { x: target[0], y: target[1], z: target[2], duration }, 0);
        previous.current = place;
        return () => { tl.kill(); };
    }, [place, selected, reduced, size.width, size.height, camera, invalidate, onSettled]);
    useEffect(()=>{
        if(place==='entrance'||selected!==null||size.width/size.height>=.85)return;
        const canvas=gl.domElement;
        let pointer:number|null=null, start=0, origin=0, dragged=false;
        let settle:gsap.core.Tween|undefined;
        const position=(x:number)=>{
            camera.position.x=x;aim.current.x=x;camera.lookAt(aim.current);invalidate();
        };
        const down=(event:PointerEvent)=>{
            if(!event.isPrimary||event.button!==0)return;
            settle?.kill();pointer=event.pointerId;start=event.clientX;origin=camera.position.x;dragged=false;
        };
        const move=(event:PointerEvent)=>{
            if(event.pointerId!==pointer)return;
            const delta=event.clientX-start;
            if(Math.abs(delta)<8&&!dragged)return;
            dragged=true;
            position(THREE.MathUtils.clamp(origin-delta*8/size.width,doorX.glow,doorX.pulse));
        };
        const up=(event:PointerEvent)=>{
            if(event.pointerId!==pointer)return;
            pointer=null;
            if(!dragged||place!=='hall')return;
            const delta=event.clientX-start;
            const doors=Object.values(doorX);
            const nearest=(x:number)=>doors.reduce((a,b)=>Math.abs(a-x)<Math.abs(b-x)?a:b);
            let x=nearest(camera.position.x);
            if(event.type==='pointerup'&&Math.abs(delta)>size.width*.14&&x===nearest(origin)){
                const next=doors.indexOf(x)-Math.sign(delta);
                x=doors[THREE.MathUtils.clamp(next,0,doors.length-1)];
            }
            const pan={x:camera.position.x};
            settle=gsap.to(pan,{x,duration:reduced?0:.22,ease:'power2.out',onUpdate:()=>position(pan.x)});
        };
        const click=(event:MouseEvent)=>{if(dragged){event.stopImmediatePropagation();dragged=false;}};
        canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
        window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);canvas.addEventListener('click',click,true);
        return ()=>{settle?.kill();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);canvas.removeEventListener('click',click,true);};
    },[camera,gl,invalidate,place,size,selected,reduced]);
    return null;
}
function Stage({ place, selected, reduced, quality, onReady, onSettled, onSelect, memories, door, onDoor, onArrival }: Props) {
    const { invalidate, scene, size } = useThree();
    const base = roomById(place);
    const room = base?exhibition(base,memories):undefined;
    useEffect(() => { scene.background = skyTexture(); onReady(); invalidate(); }, [scene, onReady, invalidate]);
    return <>
 <LightRig place={place} quality={quality}/>
 {room ? <Gallery room={room} selected={selected} onSelect={onSelect}/> : <>{(place==="entrance" || size.width/size.height>=.85) && <Exterior />}<Hall />{place==='hall'&&<Doorways target={door} onDoor={onDoor} reduced={reduced}/>}</>}
 <DoorJourney target={door} reduced={reduced} onArrival={onArrival}/>
 <CameraRig place={place} selected={selected} reduced={reduced} onSettled={onSettled}/>
 </>;
}
export default function MuseumScene(props: Props) {
    const [contextLost, setContextLost] = useState(false);
    if (contextLost)
        return <div className="scene-error" role="status">The 3D view was interrupted. <button onClick={() => location.reload()}>Reload the museum</button></div>;
    return <Canvas shadows={props.quality === 'high' ? 'percentage' : false} dpr={props.quality === 'low' ? 1 : [1, 1.5]} frameloop="demand" camera={{ position: [0, 4.6, 20], fov: 49, near: .1, far: 120 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', () => setContextLost(true), { once: true }); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.02; if (location.search.includes('stats')) (window as unknown as { __museumGl?: THREE.WebGLRenderer }).__museumGl = gl; }}><Stage {...props}/></Canvas>;
}
