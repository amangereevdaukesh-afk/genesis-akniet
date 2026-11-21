import {useEffect,useMemo,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Volume2,VolumeX,X} from 'lucide-react';
import {useBlobUrl,type Memory} from './memories';
import './theatre.css';

function diaryLines(text:string,count:number){
 const clauses=text.trim().match(/[^.!?。！？\n]+[.!?。！？]*|[^\s]/gu)?.map(x=>x.trim()).filter(Boolean)??[];
 const units=clauses.length>=count?clauses:text.trim().split(/\s+/u);
 return Array.from({length:count},(_,i)=>units.slice(Math.floor(i*units.length/count),Math.floor((i+1)*units.length/count)).join(' '));
}
function usePrints(memory:Memory){
 const [local,setLocal]=useState<string[]>([]);
 useEffect(()=>{
  if(memory.sources)return;
  const urls=memory.photos.map(b=>URL.createObjectURL(b));setLocal(urls);
  return ()=>urls.forEach(u=>URL.revokeObjectURL(u));
 },[memory.photos,memory.sources]);
 return memory.sources??local;
}
export function MemoryViewer({memory,reduced,soundtrack,onClose}:{memory:Memory;reduced:boolean;soundtrack:HTMLAudioElement|null;onClose:()=>void}){
 const prints=usePrints(memory),count=prints.length;
 const [index,setIndex]=useState(0),[previous,setPrevious]=useState<number|null>(null);
 const [playing,setPlaying]=useState(true),[ended,setEnded]=useState(false),[serial,setSerial]=useState(0);
 const [ready,setReady]=useState(false),[read,setRead]=useState(false),[failed,setFailed]=useState(false);
 const [quiet,setQuiet]=useState(!!soundtrack?.paused),[ratio,setRatio]=useState(1.5);
 const dialog=useRef<HTMLDialogElement>(null),progress=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null);
 const elapsed=useRef(0),video=useRef<HTMLVideoElement>(null);
 const clip=useBlobUrl(memory.clip?.file);
 const seconds=Math.max(3,Math.min(18,memory.visual.seconds||7));
 const captions=useMemo(()=>diaryLines(memory.diary,Math.max(1,count)),[count,memory.diary]);
 const date=new Date(memory.date+'T12:00:00');
 const dateText=Number.isNaN(date.getTime())?memory.date:date.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
 useEffect(()=>{const last=document.activeElement as HTMLElement;dialog.current?.showModal();return()=>last?.focus()},[]);
 useEffect(()=>{
  if(!ready||count<2||index===count-1)return;
  const next=new Image();next.src=prints[index+1];
 },[ready,index,count,prints]);
 useEffect(()=>{
  if(!playing||!ready||read||failed)return;
  let last=performance.now(),raf=0;
  function tick(now:number){
   elapsed.current+=now-last;last=now;
   const t=Math.min(1,elapsed.current/(seconds*1000));
   progress.current?.style.setProperty('--filled',String(t));
   if(t<1){raf=requestAnimationFrame(tick);return}
   if(index+1<count){setPrevious(index);setIndex(index+1);setReady(false);elapsed.current=0}
   else{setEnded(true);setPlaying(false);soundtrack?.pause()}
  }
  raf=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(raf);
 },[playing,ready,read,failed,seconds,index,count,soundtrack,serial]);
 useEffect(()=>{const node=video.current;if(!node)return;if(playing&&!read)void node.play().catch(()=>{});else node.pause();return()=>node.pause()},[playing,read,clip,index,serial]);
 useEffect(()=>{if(!soundtrack)return;const error=()=>setQuiet(true);soundtrack.addEventListener('error',error);return()=>soundtrack.removeEventListener('error',error)},[soundtrack]);
 function startAudio(){if(soundtrack)void soundtrack.play().then(()=>setQuiet(false),()=>setQuiet(true))}
 function seek(i:number){
  const next=Math.min(count-1,Math.max(0,i));if(next<0)return;
  setPrevious(index!==next?index:null);setIndex(next);setReady(false);setFailed(false);setEnded(false);setSerial(n=>n+1);elapsed.current=0;
  if(soundtrack&&Number.isFinite(soundtrack.duration))soundtrack.currentTime=Math.min(next*seconds,Math.max(0,soundtrack.duration-.05));
 }
 function replay(){seek(0);setRead(false);setPlaying(true);startAudio()}
 function toggle(){if(ended){replay();return}setPlaying(!playing);if(playing)soundtrack?.pause();else if(!quiet)startAudio()}
 function showDiary(){setPlaying(false);soundtrack?.pause();setRead(true)}
 const url=prints[index],portrait=(memory.visual.studies?.[index]?.ratio??ratio)<.9;
 const style={'--seconds':seconds+'s','--tint':memory.visual.studies?.[index]?.color??memory.visual.color,'--px':'0px','--py':'0px'} as CSSProperties;
 return <dialog data-layout={memory.visual.layout} className={'theatre theatre-'+memory.room+(reduced?' still':'')+(playing&&!read?' running':'')+(portrait?' vertical':'')} style={style} ref={dialog} aria-label="Living memory" onCancel={e=>{e.preventDefault();if(read)setRead(false);else onClose()}}>
 <header className="theatre-head"><span>Museum of Days</span><time>{dateText}</time><button onClick={onClose} aria-label="Close · Return to gallery"><X size={16}/>Return to gallery</button></header>
 <div className="theatre-stage" ref={stage} onPointerMove={e=>{if(reduced||!playing||e.pointerType!=='mouse')return;const r=e.currentTarget.getBoundingClientRect();stage.current?.style.setProperty('--px',((e.clientX-r.left)/r.width*6-3)+'px');stage.current?.style.setProperty('--py',((e.clientY-r.top)/r.height*4-2)+'px')}}>
 {previous!==null&&prints[previous]&&<div className="receding-print" aria-hidden="true" style={{backgroundImage:'url("'+prints[previous]+'")'}}/>}
 {url&&<div className="theatre-shot" key={index+'-'+serial}>
 <div className="colour-field" aria-hidden="true" style={{backgroundImage:'url("'+url+'")'}}/>
 <div className="lens"><img className="main-print" src={url} alt={memory.title+', photograph '+(index+1)} onLoad={e=>{setRatio(e.currentTarget.naturalWidth/e.currentTarget.naturalHeight);setReady(true)}} onError={()=>{setFailed(true);setPlaying(false);soundtrack?.pause()}}/>
 {clip&&index===0&&<video ref={video} src={clip} muted playsInline poster={url}/>}
 <div className="near-field" style={{backgroundImage:'url("'+url+'")'}} aria-hidden="true"/></div>
 <div className="light-field" aria-hidden="true"/><div className="print-grain" aria-hidden="true"/></div>}
 {failed&&<button className="retry-print" onClick={()=>{seek(index);setPlaying(true)}}>Retry photograph</button>}
 </div>
 <section className="theatre-notes"><div className="type-block"><span className="room-signature">{memory.room} <i/> {dateText}</span><h1>{memory.title}</h1></div><div className="diary-leaf"><p key={index+'-'+serial}>{captions[index]}</p><button onClick={showDiary}>Read diary</button></div></section>
 <footer className="theatre-foot"><div className="cue-strip" ref={progress}>{prints.map((_,i)=><button key={i} aria-label={'View photograph '+(i+1)} aria-current={i===index?'step':undefined} className={i<index?'passed':''} onClick={()=>seek(i)}><i/></button>)}</div>
 <div className="transport"><button aria-label="Previous photograph" disabled={!index} onClick={()=>seek(index-1)}><ArrowLeft/></button><button className="play-key" onClick={toggle} aria-label={playing?'Pause':'Play'}>{playing?<Pause/>:<Play/>}</button><button disabled={index+1>=count} aria-label="Next photograph" onClick={()=>seek(index+1)}><ArrowRight/></button><span>{String(index+1).padStart(2,'0')} / {String(count).padStart(2,'0')}</span><button aria-label="Replay" onClick={replay}><RotateCcw/></button>
 <div className="sound-desk">{soundtrack&&<button aria-label={quiet?'Enable Sound':'Mute sound'} onClick={()=>{if(quiet){setPlaying(true);startAudio()}else{soundtrack.pause();setQuiet(true)}}}>{quiet?<VolumeX/>:<Volume2/>}{quiet?'Enable sound':'Sound on'}</button>}{memory.musicUrl&&<a target="_blank" rel="noopener noreferrer" href={memory.musicUrl} title={memory.track?memory.track.title+' · '+memory.track.artist:'Listen at source'}>Open Song ↗</a>}</div></div>
 </footer>{read&&<section className="reading-room"><button onClick={()=>setRead(false)}>Back to memory</button><time>{dateText}</time><h2>{memory.title}</h2><p>{memory.diary}</p>{memory.track&&<p>{memory.track.title} · {memory.track.artist}</p>}</section>}
 </dialog>;
}
