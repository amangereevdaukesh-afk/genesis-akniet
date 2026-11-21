import { useMemo } from 'react';
import * as THREE from 'three';
import type { RoomId } from './data';

// A continuous folded surface keeps each installation to a single draw call.
function wovenScreen(depth:number, folds:number, wave:number) {
  const geo=new THREE.PlaneGeometry(depth,5.4,folds*8,6);
  const a=geo.attributes.position;
  for(let i=0;i<a.count;i++){
    const x=a.getX(i), y=a.getY(i);
    a.setZ(i,wave*Math.cos(x/depth*folds*Math.PI*2)+.07*Math.sin(y*.8+x*.45));
  }
  geo.computeVertexNormals();
  return geo;
}
export function Installation({room}:{room:RoomId}){
  const fabric=useMemo(()=>wovenScreen(15,23,.16),[]);
  if(room==='glow')return <group position={[0,0,-8]}>
    {[-1,1].map(side=><group key={side} position={[side*5.9,5.9,0]}>
      <mesh rotation={[0,0,side*.48]}><torusGeometry args={[2.35,.045,8,72,Math.PI]}/><meshStandardMaterial color="#ceab64" metalness={.55} roughness={.36}/></mesh>
      {Array.from({length:9},(_,i)=><mesh key={i} position={[(i-4)*.49,Math.sqrt(Math.max(0,5.52-((i-4)*.49)**2))-.75,-.1]}><cylinderGeometry args={[.023,.036,1.45+i*.05,8]}/><meshStandardMaterial color="#d3b073" metalness={.45}/></mesh>)}
    </group>)}
    <pointLight position={[-4,6,2]} color="#ffdb9d" intensity={54} distance={14}/>
  </group>;
  if(room==='hush')return <group>{[-1,1].map(side=><mesh key={side} geometry={fabric} position={[side*7.9,3.5,-12]} rotation-y={side*Math.PI/2}><meshStandardMaterial side={THREE.DoubleSide} color="#a5b5a5" roughness={.99}/></mesh>)}</group>;
  if(room==='echo')return <group>{[-1,1].map(side=><group key={side} position={[side*7.2,3.4,-11]} rotation-y={side*.3}>{[0,1,2].map(i=><mesh key={i} position={[0,0,-i*2]} scale={[1.7,2.8,1]}><torusGeometry args={[1,.035,7,64]}/><meshStandardMaterial color="#997653" roughness={.55} metalness={.45}/></mesh>)}</group>)}</group>;
  return <group position={[0,6.8,-12]}>{[-2,-1,0,1,2].map((n)=><mesh key={n} position={[n*.8,n*.15,-Math.abs(n)*.6]} rotation={[.3,n*.2,-.68]}><boxGeometry args={[.085,4.2,.46]}/><meshStandardMaterial color={n%2?'#bd8466':'#443b39'} roughness={.45} metalness={.5}/></mesh>)}</group>;
}
