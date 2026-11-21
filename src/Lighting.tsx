// Museum of Days — architectural lighting per space (Claude art direction).
// One key light (the only shadow caster), a hemisphere fill, an image-based environment for
// believable stone and metal response, and a few local accents per room. Photographs on the
// walls use unlit materials, so no light setting can make a visitor's picture unreadable.
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Place, RoomId } from './data';

interface Rig {
    fog: [string, number, number]; exposure: number; env: number;
    hemi: [string, string, number]; ambient: [string, number];
    key: { color: string; intensity: number; position: [number, number, number]; target: [number, number, number] };
}
export const rigs: Record<'hall' | RoomId, Rig> = {
    // Hall: warm daylight entering over the facade, cool sky fill from the oculus.
    hall: { fog: ['#d6c9b2', 30, 95], exposure: 1.02, env: .32, hemi: ['#e8eef2', '#9a8a6e', .62], ambient: ['#fff3e0', .1], key: { color: '#ffe6c2', intensity: 2.5, position: [-10, 17, 9], target: [1, 0, -11] } },
    // GLOW — Impressionism: low golden afternoon sun raking across limestone; warm bounce.
    glow: { fog: ['#e3cfae', 24, 62], exposure: 1.04, env: .4, hemi: ['#fff1d6', '#b08d62', .7], ambient: ['#ffe8c8', .12], key: { color: '#ffd59a', intensity: 3, position: [-14, 12, 4], target: [4, 0, -14] } },
    // HUSH — Tonalism: overcast, diffuse, low contrast; nothing raking, nothing hard.
    hush: { fog: ['#b7c2b5', 20, 58], exposure: 1, env: .3, hemi: ['#eaf1e8', '#8f9a8c', 1.25], ambient: ['#eef3ea', .25], key: { color: '#eef2ea', intensity: .9, position: [0, 20, 6], target: [0, 0, -14] } },
    // ECHO — Romanticism: cool moonlit key from deep in the room, layered atmospheric haze.
    echo: { fog: ['#8f9db0', 15, 50], exposure: 1.06, env: .34, hemi: ['#d2deef', '#4d5560', .78], ambient: ['#cfd9ea', .1], key: { color: '#d4def0', intensity: 2.1, position: [9, 15, -32], target: [-2, 0, -6] } },
    // PULSE — Abstraction: dark envelope, a hard warm key and saturated accents for drama.
    pulse: { fog: ['#3b2a2c', 20, 56], exposure: 1.05, env: .55, hemi: ['#f0d6cf', '#2a1d1e', .34], ambient: ['#ffd9cc', .05], key: { color: '#ffd6b8', intensity: 2.4, position: [12, 14, 6], target: [-3, 0, -14] } },
};

let environment: THREE.Texture | undefined;
function useEnvironment() {
    const { gl, scene } = useThree();
    useEffect(() => {
        if (!environment) {
            const pmrem = new THREE.PMREMGenerator(gl);
            const room = new RoomEnvironment();
            environment = pmrem.fromScene(room, .04).texture;
            room.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
            pmrem.dispose();
        }
        scene.environment = environment;
    }, [gl, scene]);
}

function Accents({ id }: { id: 'hall' | RoomId }) {
    if (id === 'hall') return <pointLight position={[0, 9.4, -4.5]} color="#ffe2b0" intensity={70} distance={22} decay={2}/>;
    if (id === 'glow') return <>
        <pointLight position={[-4, 6.5, -6]} color="#ffd08a" intensity={70} distance={20} decay={2}/>
        <pointLight position={[4, 5.5, -19]} color="#ffe2b6" intensity={55} distance={18} decay={2}/>
    </>;
    if (id === 'hush') return <pointLight position={[0, 9, -12]} color="#e8f0e6" intensity={60} distance={26} decay={2}/>;
    if (id === 'echo') return <>
        <pointLight position={[0, 6, -4]} color="#ffe0b8" intensity={34} distance={16} decay={2}/>
        <pointLight position={[0, 7, -22]} color="#b8cbe8" intensity={70} distance={24} decay={2}/>
    </>;
    return <>
        <spotLight position={[-6, 12, -6]} color="#ff6f52" intensity={200} distance={30} angle={.5} penumbra={.6} decay={2} target-position={[0, 2, -14]}/>
        <spotLight position={[7, 11, -2]} color="#ffe6cf" intensity={120} distance={28} angle={.45} penumbra={.7} decay={2} target-position={[-2, 2, -8]}/>
    </>;
}

export function LightRig({ place, quality }: { place: Place; quality: 'high' | 'low' }) {
    const id: 'hall' | RoomId = place === 'entrance' || place === 'hall' ? 'hall' : place;
    const rig = rigs[id];
    const { gl, scene, invalidate } = useThree();
    const key = useRef<THREE.DirectionalLight>(null);
    useEnvironment();
    useEffect(() => {
        gl.toneMappingExposure = rig.exposure;
        scene.environmentIntensity = rig.env;
        if (key.current) { key.current.target.position.set(...rig.key.target); key.current.target.updateMatrixWorld(); }
        invalidate();
    }, [rig, gl, scene, invalidate]);
    // spotlight targets declared as props need to be part of the scene graph to update
    useEffect(() => { scene.traverse(o => { if (o instanceof THREE.SpotLight) { o.target.updateMatrixWorld(); } }); invalidate(); }, [id, scene, invalidate]);
    return <>
        <fog attach="fog" args={rig.fog}/>
        <ambientLight color={rig.ambient[0]} intensity={rig.ambient[1]}/>
        <hemisphereLight args={rig.hemi}/>
        <directionalLight ref={key} position={rig.key.position} color={rig.key.color} intensity={rig.key.intensity} castShadow={quality === 'high'}
            shadow-mapSize={[2048, 2048]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24}
            shadow-camera-near={1} shadow-camera-far={70} shadow-bias={-.0002} shadow-normalBias={.04} shadow-radius={4}/>
        <Accents id={id}/>
    </>;
}
