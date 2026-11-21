import {Account} from './Account';
import {client,hydrate,prepareOpening,removeCloud,saveCloud} from './cloud';
import { VisitorGuide } from './VisitorGuide';
import { readMemories } from './memories';
import { MemoryEditor, MemoryViewer } from './MemoryUI';

import { useMemories, exhibition, type Memory } from './memories';

import type { RoomId } from './data';

import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';

import type { ReactNode } from 'react';

import { ArrowLeft, ChevronLeft, ChevronRight, DoorOpen, Settings2, Volume2, VolumeX, X } from 'lucide-react';

import { useGSAP } from '@gsap/react';

import gsap from 'gsap';

import { rooms, roomById, type Place } from './data';

import { setAmbience } from './audio';

gsap.registerPlugin(useGSAP);

const MuseumScene = lazy(() => import('./MuseumScene'));

type Panel = 'settings' | 'about' | 'collection' | 'guide' | null;

function initialPlace(): Place { const hash = location.hash.slice(1); return hash === 'hall' || rooms.some(r => r.id === hash) ? hash as Place : 'entrance'; }

function supportsWebGL() { try {

    return !!document.createElement('canvas').getContext('webgl2');

}

catch {

    return false;

} }

class SceneBoundary extends Component<{

    children: ReactNode;

    onFail: () => void;

}, {

    failed: boolean;

}> {

    state = { failed: false };

    static getDerivedStateFromError() { return { failed: true }; }

    componentDidCatch() { this.props.onFail(); }

    render() { return this.state.failed ? null : this.props.children; }

}

function Mark() { return <svg width="31" height="38" viewBox="0 0 31 38" fill="none" aria-hidden="true"><path d="M3 36V16a12.5 12.5 0 0 1 25 0v20M8 36V16a7.5 7.5 0 0 1 15 0v20M0 36h31M15.5 20v16" stroke="currentColor" strokeWidth="1.4"/></svg>; }

function Dialog({ title, onClose, children }: {

    title: string;

    onClose: () => void;

    children: ReactNode;

}) { const ref = useRef<HTMLDialogElement>(null); useEffect(() => { const el = ref.current!; const last = document.activeElement as HTMLElement; el.showModal(); return () => { el.close(); last?.focus(); }; }, []); return <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget)

    onClose(); }}><div className="dialog-inner"><button className="icon-button close" aria-label="Close dialog" onClick={onClose}><X size={22}/></button><h2 id="dialog-title">{title}</h2>{children}</div></dialog>; }

export default function App({owner}:{owner:string|null}) {

    const {memories,setMemories,error:storageError,loaded}=useMemories(owner);

    const [editing,setEditing]=useState<Memory>();
    const [accountMessage,setAccountMessage]=useState('');
    const [working,setWorking]=useState(false);
    async function importLocal(){
      if(!owner||working)return;
      setWorking(true);
      try{
        const existing=[...memories];let count=0;
        for(const m of await readMemories()){
          if(m.kind==='demo'||m.kind==='test'||existing.some(x=>x.id===m.id))continue;
          const copy={...m,cloud:true};while(existing.some(x=>x.room===copy.room&&x.slot===copy.slot))copy.slot++;
          await saveCloud(copy,owner);existing.push(copy);setMemories([...existing]);count++;
        }
        setAccountMessage('Personal memories imported: '+count+'. Originals are still in this browser.');
      }catch{setAccountMessage('Import paused. Completed memories are kept. Try again.')}finally{setWorking(false)}
    }
    const [editor,setEditor]=useState<number|null>(null);

    const [viewer,setViewer]=useState<Memory|null>(null);

    const [door,setDoor]=useState<RoomId|null>(null);

    const [notice,setNotice]=useState('');
    const ticket=useRef(0);
    const soundtrack=useRef<HTMLAudioElement|null>(null);
    const soundBlob=useRef('');
    const stopStory=useCallback(()=>{
      ticket.current++;const a=soundtrack.current;if(a){a.pause();a.removeAttribute('src');a.load()}
      soundtrack.current=null;if(soundBlob.current)URL.revokeObjectURL(soundBlob.current);soundBlob.current='';
    },[]);
    const viewerTimer=useRef<ReturnType<typeof setTimeout>|null>(null);

    const [place, setPlace] = useState<Place>(initialPlace);

    const [panel, setPanel] = useState<Panel>(null);

    const [selected, setSelected] = useState<number | null>(null);

    const [exploring, setExploring] = useState(false);

    const [ready, setReady] = useState(false);

    const [busy, setBusy] = useState(true);

    const [sound, setSound] = useState(false);

    const [audioError, setAudioError] = useState('');

    const [quality, setQuality] = useState<'high' | 'low'>(() => window.innerWidth < 700 ? 'low' : 'high');

    const [motion, setMotion] = useState<'system' | 'reduced'>('system');

    const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

    const [webgl, setWebgl] = useState(supportsWebGL);

    const [flat, setFlat] = useState(() => new URLSearchParams(location.search).has('lite'));

    const root = useRef<HTMLDivElement>(null);

    const veil = useRef<HTMLDivElement>(null);

    const navTimeline = useRef<gsap.core.Timeline | null>(null);

    const currentPlace = useRef(place);

    currentPlace.current = place;

    const reduced = motion === 'reduced' || systemReduced;

    const baseRoom = roomById(place);

    const room=baseRoom?exhibition(baseRoom,memories):undefined;

    const firstEmpty = room?.works.findIndex(work=>!work.memory) ?? 0;
    const sampleIndex = room?.works.findIndex(work=>work.memory?.kind==='demo') ?? -1;
    const art = room && selected !== null ? room.works[selected] : undefined;

    const fallback = !webgl || flat;

    const onReady = useCallback(() => setReady(true), []);

    const onSettled = useCallback(() => setBusy(false), []);

    const onSelect = useCallback((i:number)=>{if(!loaded||busy)return;setSelected(i);const memory=memories.find(m=>m.room===place&&m.slot===i);if(memory){
      stopStory();const request=ticket.current;
      void setAmbience(false);setSound(false);setNotice('Opening memory�');
      const audio=memory.audio?URL.createObjectURL(memory.audio):memory.media?.expires&&memory.media.expires>Date.now()?memory.media.audioUrl:undefined;
      if(audio){if(memory.audio)soundBlob.current=audio;const a=new Audio(audio);soundtrack.current=a;void a.play().catch(()=>{});}
      Promise.all([prepareOpening(memory),new Promise(resolve=>setTimeout(resolve,reduced?0:1100))]).then(([full])=>{
        if(ticket.current!==request)return;
        if(!soundtrack.current&&full.audio){soundBlob.current=URL.createObjectURL(full.audio);soundtrack.current=new Audio(soundBlob.current);void soundtrack.current.play().catch(()=>{});}
        setNotice('');setViewer(full);
      }).catch(()=>{if(ticket.current===request){stopStory();setNotice('Could not open this memory. Select the frame to retry.')}});
    }else {if(!owner)sessionStorage.setItem("museum-create",JSON.stringify({room:place,slot:i}));setEditor(i)}},[loaded,busy,memories,place,reduced,owner,stopStory]);

    useEffect(()=>()=>{stopStory();if(viewerTimer.current)clearTimeout(viewerTimer.current)},[]);

    const onFail = useCallback(() => { setWebgl(false); setReady(true); setBusy(false); }, []);

    useEffect(() => { const media = matchMedia('(prefers-reduced-motion: reduce)'); const change = () => setSystemReduced(media.matches); media.addEventListener('change', change); return () => media.removeEventListener('change', change); }, []);

    useEffect(() => { const sync = () => { stopStory();setViewer(null);setNotice('');navTimeline.current?.kill(); gsap.set(veil.current, { opacity: 0 }); setPlace(initialPlace()); setSelected(null); setExploring(false); setBusy(false); }; window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync); }, []);

    useEffect(() => () => { navTimeline.current?.kill(); void setAmbience(false); }, []);

    useEffect(() => { if (fallback) {

        setReady(true);

        setBusy(false);

    } }, [fallback]);

    useEffect(() => { document.title = `${room ? room.name : place === 'hall' ? 'The main hall' : 'Every day deserves to be remembered'} — Museum of Days`; }, [place, room]);

    useGSAP(() => { if (!reduced && ready)

        gsap.fromTo('.reveal', { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: .075, duration: .7, ease: 'power2.out', clearProps: 'all' }); }, { scope: root, dependencies: [place, exploring, ready], revertOnUpdate: true });

    const navigate = useCallback((next: Place) => {

        if (navTimeline.current?.isActive())

            return;

        if(viewerTimer.current)clearTimeout(viewerTimer.current);

        stopStory();setNotice('');setViewer(null);setEditor(null);setDoor(null);

        setPanel(null);

        setExploring(false);

        setSelected(null);

        setBusy(true);

        const commit = () => { setPlace(next); history.pushState(null, '', next === 'entrance' ? '#entrance' : `#${next}`); };

        const throughDoor = (currentPlace.current === 'entrance' && next === 'hall') || (currentPlace.current === 'hall' && next === 'entrance');

        if (throughDoor || reduced || fallback) {

            commit();

            if (fallback || reduced)

                setBusy(false);

            return;

        }

        navTimeline.current = gsap.timeline().to(veil.current, { opacity: 1, duration: .35, ease: 'power1.inOut' }).call(commit).to(veil.current, { opacity: 0, duration: .7, delay: .15, ease: 'power2.out' });

    }, [reduced, fallback]);

    const enterDoor=useCallback((id:RoomId)=>{if(busy||door)return;if(fallback){navigate(id);return}setBusy(true);setDoor(id)},[busy,door,fallback,navigate]);

    const arrival=useCallback(()=>{if(door)navigate(door)},[door,navigate]);

    useEffect(()=>{if(!owner||!loaded)return;const pending=sessionStorage.getItem("museum-create");if(!pending)return;sessionStorage.removeItem("museum-create");try{const p=JSON.parse(pending);if(["glow","hush","echo","pulse"].includes(p.room)&&Number.isInteger(p.slot)){setPlace(p.room);history.replaceState(null,"","#"+p.room);setEditor(p.slot)}}catch{}},[owner,loaded]);
    function saved(memory:Memory){setNotice("Saved to your private collection.");setEditing(undefined);setMemories(old=>[...old.filter(m=>m.id!==memory.id),memory]);setEditor(null);if(place!==memory.room){setPlace(memory.room);history.pushState(null,'','#'+memory.room)}setSelected(memory.slot)}

    async function toggleSound() { try {

        await setAmbience(!sound);

        setSound(!sound);

        setAudioError('');

    }

    catch {

        setAudioError('Sound could not start. Please try again.');

    } }

    const closePanel = () => setPanel(null);

    return <div ref={root} className={`museum ${place === 'entrance' ? 'outside' : 'inside'} ${room ? 'in-gallery' : ''} ${art ? 'viewing-art' : ''}`} data-place={place} data-ready={ready} data-quality={quality} data-motion={reduced ? 'reduced' : 'full'}>

 <a className="skip-link" href="#main-controls">Skip to museum controls</a>

 <div className="environment" aria-hidden="true">{!fallback && <SceneBoundary onFail={onFail}><Suspense fallback={null}><MuseumScene memories={memories} door={door} onDoor={enterDoor} onArrival={arrival} place={place} selected={selected} reduced={reduced} quality={quality} onReady={onReady} onSettled={onSettled} onSelect={onSelect}/></Suspense></SceneBoundary>}{fallback && <div className={`flat-scene flat-${place}`}><div className="flat-arch"><div className="flat-depth"/></div><div className="flat-floor"/></div>}</div>

 <div className="scene-shade" aria-hidden="true"/><div ref={veil} className="transition-veil" aria-hidden="true"/>

 <header className="masthead"><button className="brand" aria-label="Museum of Days entrance" onClick={() => navigate('entrance')} disabled={busy}><Mark /><span>Museum<br />of Days</span></button><nav className="top-nav" aria-label="Museum navigation">{place !== 'entrance' && <button className="collection-link" onClick={() => setPanel('collection')}>The collection</button>}<button className="about-link" onClick={() => setPanel('about')}>About the museum</button><button className="icon-button" aria-label="Settings" onClick={() => setPanel('settings')}><Settings2 size={20} strokeWidth={1.5}/></button></nav></header>

 <main id="main-controls" tabIndex={-1}>

 {place === 'entrance' ? <section className={`entrance-copy ${busy ? 'departing' : ''}`} aria-label="Museum entrance"><h1 className="reveal">Every day deserves<br />to be remembered.</h1><p className="reveal">A museum where memories become art.</p><p className="demo-intro">Public demo · Four sample memories to explore. Your additions stay in this browser and are not shared.</p><button className="enter-button reveal" disabled={!ready || busy} onClick={() => navigate('hall')}><span>{!ready ? 'Preparing your visit' : busy ? 'Stepping inside' : 'Enter the museum'}</span><span className="button-symbol"><DoorOpen size={20} strokeWidth={1.4}/></span></button>{!ready && <button className="text-button lite-link" onClick={() => setFlat(true)}>Continue with the lightweight view</button>}</section> : place === 'hall' ? <>

 <div className="place-label reveal"><span className="location-line"/><span>The main hall</span></div>

 <section className="hall-invitation"><h1>Choose a doorway.</h1><p>Four ways to remember. <span className="pan-instruction">Swipe to look around. </span>Touch a door to step inside.</p><details><summary>Accessible gallery navigation</summary><nav>{rooms.map(r=><button disabled={busy} key={r.id} onClick={()=>enterDoor(r.id)}>{r.name}</button>)}</nav></details></section>

 </> : room ? <>

 <div className="gallery-top"><button className="back-button" disabled={busy} onClick={() => selected !== null ? setSelected(null) : navigate('hall')}><ArrowLeft size={17}/>{selected !== null ? 'Back to the gallery' : 'Main hall'}</button><nav className="room-switch" aria-label="Emotional galleries">{rooms.map(r => <button key={r.id} aria-current={r.id === place ? 'page' : undefined} onClick={() => navigate(r.id)} disabled={busy}>{r.name}</button>)}</nav></div>

 {!art ? <section className="gallery-copy reveal"><h1>{room.name}</h1><p className="emotion-name">{room.emotion}</p><p className="gallery-line">{room.line}</p><button className="art-button" disabled={busy||!loaded||!!storageError} onClick={() => onSelect(firstEmpty)}>Create a memory</button>{sampleIndex>=0&&<button className="art-button sample-action" disabled={busy||!loaded} onClick={()=>onSelect(sampleIndex)}>Explore demo memory</button>}</section> : <section className="art-detail"><div className="art-detail-title"><span className="sample-label">{art.memory ? (art.memory.kind==='demo'?'Demo sample':art.memory.kind==='test'?'Test memory · local':art.memory.cloud?'Private cloud memory':'Personal memory · local') : 'A place for your next memory'}</span><h1>{art.title}</h1><p>{art.subtitle}</p><button className="art-button" onClick={()=>onSelect(selected!)}>{art.memory?'Open living memory':'Create a memory'}</button></div><p className="art-note">{art.note}</p><div className="art-pager"><button className="icon-button" aria-label="Previous artwork" onClick={() => setSelected(i => Math.max(0, (i ?? 0) - 1))} disabled={selected === 0}><ChevronLeft size={24}/></button><span>{selected! + 1} / {room.works.length}</span><button className="icon-button" aria-label="Next artwork" onClick={() => setSelected(i => Math.min(room.works.length - 1, (i ?? 0) + 1))} disabled={selected === room.works.length - 1}><ChevronRight size={24}/></button></div></section>}

 </> : null}

 </main>

 <footer className="museum-footer"><div>{place === 'entrance' ? <span>A space for your becoming.</span> : <button className="text-button" onClick={() => setPanel('collection')}>{memories.length ? `Your collection · ${memories.length}` : 'Your collection awaits'}</button>}</div><div className="footer-end"><button className="text-button guide-link" onClick={()=>setPanel('guide')}>Public demo · Visitor guide</button><span className="example-note">{owner?'Private cloud collection':'Local to this browser · Not shared'}</span>{fallback && <span className="example-note">Lightweight architectural study</span>}<button className="sound-button" aria-label={sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={sound} onClick={toggleSound}>{sound ? <Volume2 size={17}/> : <VolumeX size={17}/>}<span>Sound {sound ? 'on' : 'off'}</span></button></div></footer>

 <span className="sr-only" role="status" aria-live="polite">{busy ? 'Moving through the museum' : room ? `${room.name}, ${room.emotion}` : place === 'hall' ? 'You are in the main hall' : 'Museum entrance'}</span>

 {panel === 'settings' && <Dialog title="Make yourself at home." onClose={closePanel}><p className="dialog-intro">A few small adjustments for your visit.</p><div className="setting-row"><div><h3>Ambient sound</h3><p>A quiet, original tonal soundscape.</p></div><button role="switch" aria-checked={sound} aria-label="Ambient sound" className={`toggle ${sound ? 'on' : ''}`} onClick={toggleSound}><span /></button></div>{audioError && <p role="alert">{audioError}</p>}<fieldset className="setting-block"><legend>Motion</legend><p>Reduced motion skips camera journeys. Your system preference is always respected.</p><div className="segmented"><button aria-pressed={motion === 'system'} onClick={() => setMotion('system')}>Follow system</button><button aria-pressed={motion === 'reduced'} onClick={() => setMotion('reduced')}>Reduced</button></div></fieldset><fieldset className="setting-block"><legend>Rendering quality</legend><p>Light uses fewer pixels and turns off real-time shadows.</p><div className="segmented"><button aria-pressed={quality === 'high'} onClick={() => setQuality('high')}>Detailed</button><button aria-pressed={quality === 'low'} onClick={() => setQuality('low')}>Light</button></div></fieldset><div className="setting-row"><div><h3>Lightweight view</h3><p>A simple architectural fallback without 3D.</p></div><button role="switch" aria-label="Lightweight view" aria-checked={flat} className={`toggle ${flat ? 'on' : ''}`} onClick={() => setFlat(!flat)}><span /></button></div><p className="dialog-footnote">Preferences apply to this visit.</p></Dialog>}

 {panel === 'about' && <Dialog title="Not every day is extraordinary. Every day is yours." onClose={closePanel}><p className="dialog-intro">Museum of Days is a place for the things you want to keep: a feeling, a person, the light on an ordinary afternoon.</p><p>Here, your photographs and words become exhibits. Each finds a place in a gallery shaped by how that day felt.</p><div className="about-emotions">{rooms.map(r => <span key={r.id}>{r.name}<small>{r.emotion.replace('The gallery of ', '')}</small></span>)}</div><p>Choose an empty frame to keep a day. {owner?'Your account keeps your private collection across devices.':'Sign in to save a private memory across devices.'}</p><button className="solid-button" onClick={() => navigate('hall')}>Visit the main hall</button></Dialog>}

 {panel==='guide'&&<Dialog title="Your first visit." onClose={closePanel}>{owner?<p>Your collection is saved privately to your account.</p>:<VisitorGuide onChange={async()=>{if(viewerTimer.current)clearTimeout(viewerTimer.current);setViewer(null);setEditor(null);setSelected(null);setMemories(await readMemories())}}/>}</Dialog>}
 {storageError&&<p className="storage-error" role="alert">{storageError}</p>}

 {panel==='collection'&&<Dialog title="The days you kept." onClose={closePanel}><p> {owner?'Your private cloud collection.':'Guest memories stay in this browser.'}</p>{owner?<><button disabled={working||!loaded} onClick={()=>void importLocal()}>Import personal memories from this browser</button><button onClick={()=>void client!.auth.signOut()}>Sign out</button></>:<Account/>}{memories.length===0?<p>No memories yet. Step into a gallery and choose an empty frame.</p>:<div className="collection-list">{memories.map(m=><div key={m.id}><button onClick={()=>{setPanel(null);setPlace(m.room);history.pushState(null,'','#'+m.room);setSelected(m.slot)}}><strong>{m.title}<small className="memory-kind">{m.kind==='demo'?'Demo sample':m.kind==='test'?'Test memory':'Personal memory'}</small></strong><span>{m.date} · {m.room}</span></button>{owner&&<><button disabled={working} onClick={async()=>{setWorking(true);try{const full=await hydrate(m);setEditing(full);setPlace(m.room);setPanel(null);setEditor(m.slot)}catch{setAccountMessage("Could not load originals. Try Edit again.")}finally{setWorking(false)}}}>Edit</button><button disabled={working} onClick={async()=>{if(!window.confirm('Delete this private memory and its files?'))return;setWorking(true);try{await removeCloud(m,owner);setMemories(old=>old.filter(x=>x.id!==m.id))}catch{setAccountMessage('Deletion could not be confirmed. Reload to check your collection.')}finally{setWorking(false)}}}>Delete</button></>}</div>)}</div>}<button className="solid-button" onClick={()=>navigate('hall')}>Return to the main hall</button><p role="status">{accountMessage}</p></Dialog>}

 {editor!==null&&room&&!owner&&<Dialog title="Keep this day." onClose={()=>{sessionStorage.removeItem("museum-create");setEditor(null)}}><Account/></Dialog>}
 {editor!==null&&room&&owner&&<MemoryEditor initial={editing} owner={owner} room={room.id} slot={editor} memories={memories} onClose={()=>{setEditing(undefined);setEditor(null)}} onSaved={saved}/>}

 {notice&&<p className="museum-notice" role="status">{notice}</p>}
 {viewer&&<MemoryViewer soundtrack={soundtrack.current} memory={viewer} reduced={reduced} onClose={()=>{stopStory();setViewer(null)}}/>}



 </div>;

}

