import { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Mesh, MeshStandardMaterial } from 'three';
import type { RoomId } from './data';

type Triple = [number,number,number];
export function AtelierModel({name,position,scale,finish}:{name:'hush-rebate'|'pulse-rebate'|'echo-rebate'|'cornice-course'|'threshold-surround'|'golden-loggia'|'sunlit-rebate'|'limestone-portal'|'gallery-molding'|'alabaster-lantern';position?:Triple;scale?:Triple;finish?:RoomId}) {
  const gltf = useLoader(GLTFLoader, '/models/'+name+'.glb');
  const object = useMemo(()=>{
    const root=gltf.scene.clone(true);
    root.traverse(child=>{
      if(!(child instanceof Mesh))return;
      child.castShadow=true;child.receiveShadow=true;
      if(finish && child.material instanceof MeshStandardMaterial){
        const metal=child.material.name.includes('brass');
        const colors={glow:['#ac7850','#d6b577'],hush:['#736d5a','#b3b2a1'],echo:['#4e332d','#967148'],pulse:['#302e32','#b36e59']};
        child.material=child.material.clone();
        child.material.color.set(colors[finish][metal?1:0]);
      }
    });
    return root;
  },[gltf,finish]);
  return <primitive object={object} position={position} scale={scale} dispose={null}/>;
}
