import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { download } from './cloud';
import { Box } from './Architecture';
import type { RoomId } from './data';
import { doorX, PortalThresholds } from './Portal';
import { useBlobUrl, type Memory } from './memories';
// The hall doors are now monumental arched portals (see Portal.tsx). The public interface is
// unchanged: doorX keeps the same coordinates and Doorways keeps the same props.
export { doorX };
export function Doorways({target,onDoor,reduced}:{target:RoomId|null;onDoor:(id:RoomId)=>void;reduced:boolean}){return <PortalThresholds target={target} onDoor={onDoor} reduced={reduced}/>}
export function DoorJourney({target,reduced,onArrival}:{target:RoomId|null;reduced:boolean;onArrival:()=>void}){const {camera,invalidate}=useThree();useEffect(()=>{if(!target)return;const aim=camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(14).add(camera.position);const update=()=>{camera.lookAt(aim);invalidate()};const tl=gsap.timeline({onUpdate:update,onComplete:onArrival});tl.to(aim,{x:doorX[target],y:2.7,z:-14,duration:reduced?0:1.8,ease:'power2.inOut'},0);tl.to(camera.position,{x:doorX[target],y:2.7,z:-6,duration:reduced?0:1.8,ease:'power2.inOut'}).to(camera.position,{z:-13.1,duration:reduced?0:1.4,ease:'power2.inOut'});return()=>{tl.kill()}},[target,reduced,camera,invalidate,onArrival]);return null}
export function MemorySurface({memory,onClick}:{memory?:Memory;onClick:()=>void}){const [preview,setPreview]=useState<{path:string;blob:Blob}>();
 const path=memory?.visual.previewPath??memory?.media?.pictures[0];
 useEffect(()=>{let active=true;if(path&&!memory?.photos[0])download(path).then(blob=>{if(active)setPreview({path,blob})}).catch(()=>{});return()=>{active=false}},[path,memory?.photos]);
 const url=useBlobUrl(memory?.photos[0]??(path&&preview?.path===path?preview.blob:undefined));const [map,setMap]=useState<THREE.Texture|null>(null);const [hover,setHover]=useState(false);const {invalidate}=useThree();const label=useMemo(()=>{const c=document.createElement('canvas');c.width=768;c.height=180;const x=c.getContext('2d')!;x.fillStyle='#eee7d6';x.fillRect(0,0,768,180);x.fillStyle='#3c4039';x.font='32px Georgia';x.textAlign='center';x.fillText(memory?.title??'Create a memory',384,72,710);x.font='23px sans-serif';x.fillText(memory?.date??'A day is waiting here',384,124);return new THREE.CanvasTexture(c)},[memory]);
 useEffect(()=>()=>label.dispose(),[label]);useEffect(()=>{let alive=true;let texture:THREE.Texture|undefined;setMap(null);if(url)new THREE.TextureLoader().load(url,t=>{texture=t;if(!alive){t.dispose();return}t.colorSpace=THREE.SRGBColorSpace;setMap(t);invalidate()});return()=>{alive=false;texture?.dispose()}},[url,invalidate]);
 return <group><mesh position={[0,0,.13]} onClick={e=>{e.stopPropagation();onClick()}} onPointerOver={()=>{setHover(true);document.body.style.cursor='pointer'}} onPointerOut={()=>{setHover(false);document.body.style.cursor=''}}><planeGeometry args={[1.95,2.45]}/><meshStandardMaterial color={map?'#e5dece':hover?'#ddd0ad':'#c7bfac'} roughness={.93}/></mesh>{map&&<mesh position={[0,0,.135]} raycast={()=>{}}><planeGeometry args={[Math.min(1.79,2.27*map.image.width/map.image.height),Math.min(2.27,1.79*map.image.height/map.image.width)]}/><meshBasicMaterial map={map} toneMapped={false}/></mesh>}{!memory&&<group position={[0,0,.16]}><Box p={[0,0,0]} s={[.4,.025,.02]} c="#6c705f"/><Box p={[0,0,0]} s={[.025,.4,.02]} c="#6c705f"/></group>}<mesh position={[0,-1.64,.15]}><planeGeometry args={[1.8,.42]}/><meshBasicMaterial map={label}/></mesh></group>
}
