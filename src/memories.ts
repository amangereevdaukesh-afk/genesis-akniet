import { readCloud } from './cloud';
import { useEffect, useState } from 'react';
import { type Room, type RoomId } from './data';
export interface OpeningClip {kind:"video";file:Blob}
export interface Memory {demoEdition?:number;sources?:string[];clip?:OpeningClip;media?:{pictures:string[];audio?:string;audioUrl?:string;expires?:number};track?:import("./MusicSearch").Track;cloud?:boolean;id:string;kind?:'demo'|'test'|'personal';date:string;title:string;diary:string;room:RoomId;slot:number;photos:Blob[];musicUrl:string;audio?:Blob;visual:import('./artDirection').ArtDirection;createdAt:string}
export { interpret } from './artDirection';
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('museum-of-days',2);request.onupgradeneeded=()=>{for(const store of ['memories','meta'])if(!request.result.objectStoreNames.contains(store))request.result.createObjectStore(store,{keyPath:'id'})};request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result)};request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Close other museum tabs and try again.'))})}
function complete(tx:IDBTransaction,db:IDBDatabase):Promise<void>{return new Promise((resolve,reject)=>{tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>{db.close();reject(tx.error??new Error('Local storage transaction failed.'))}})}
type LocalFile = {bytes:ArrayBuffer;type:string};
type LocalRecord = Omit<Memory,'photos'|'audio'|'clip'> & {
 photos:(Blob|LocalFile)[];audio?:Blob|LocalFile;clip?:{kind:'video';file:Blob|LocalFile};
};
async function encodeFile(blob:Blob):Promise<LocalFile>{
 return {bytes:await blob.arrayBuffer(),type:blob.type};
}
function decodeFile(file:Blob|LocalFile):Blob{
 return file instanceof Blob?file:new Blob([file.bytes],{type:file.type});
}
async function encodeRecord(memory:Memory):Promise<LocalRecord>{
 return {...memory,photos:await Promise.all(memory.photos.map(encodeFile)),
  audio:memory.audio&&await encodeFile(memory.audio),
  clip:memory.clip&&{kind:'video',file:await encodeFile(memory.clip.file)}};
}
function decodeRecord(record:LocalRecord):Memory{
 return {...record,photos:record.photos.map(decodeFile),audio:record.audio&&decodeFile(record.audio),
  clip:record.clip&&{kind:'video',file:decodeFile(record.clip.file)}};
}
export async function readMemories():Promise<Memory[]>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('memories');const req=tx.objectStore('memories').getAll();let result:Memory[]=[];req.onsuccess=()=>{result=(req.result as LocalRecord[]).map(decodeRecord)};tx.oncomplete=()=>{db.close();resolve(result)};tx.onabort=()=>{db.close();reject(tx.error)}})}
export async function saveMemory(memory:Memory){const record=await encodeRecord(memory);const db=await database();const tx=db.transaction('memories','readwrite');const done=complete(tx,db);tx.objectStore('memories').put(record);return done}
export async function initializeDemo(force=false){
 const db=await database();
 const initialized=await new Promise<boolean>((resolve,reject)=>{const tx=db.transaction('meta');const req=tx.objectStore('meta').get('demo-initialized');req.onsuccess=()=>resolve(!!req.result);req.onerror=()=>reject(req.error)});db.close();
 if(initialized&&!force){
 const id='museum-demo-v1-glow',lookup=await database();
 const old=await new Promise<Memory|undefined>((resolve,reject)=>{const req=lookup.transaction('memories').objectStore('memories').get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
 lookup.close();
 if(old?.kind!=='demo'||old.demoEdition===2)return;
 const {lakeMemory}=await import('./demo');const sample=await encodeRecord(await lakeMemory());
 const target=await database(),tx=target.transaction('memories','readwrite'),done=complete(tx,target);
 const store=tx.objectStore('memories'),req=store.get(id);
 req.onsuccess=()=>{if(req.result?.kind==='demo'&&!req.result.demoEdition)store.put({...sample,slot:req.result.slot})};
 return done;
 }
 const {sampleMemories}=await import('./demo');const samples=await Promise.all((await sampleMemories()).map(encodeRecord));
 const target=await database();const tx=target.transaction(['memories','meta'],'readwrite');const done=complete(tx,target);
 // Recheck inside the write transaction: safe against concurrent first visits and reset.
 const flag=tx.objectStore('meta').get('demo-initialized');flag.onsuccess=()=>{
  if(flag.result&&!force)return;
  const store=tx.objectStore('memories');const existing=store.getAll();existing.onsuccess=()=>{
   const records=existing.result as LocalRecord[];
   for(const sample of samples){if(records.some(m=>m.id===sample.id))continue;while(records.some(m=>m.room===sample.room&&m.slot===sample.slot))sample.slot++;store.put(sample);records.push(sample)}
   tx.objectStore('meta').put({id:'demo-initialized',value:true});
  };
 };return done;
}
export async function resetDemoData(){const db=await database();const tx=db.transaction(['memories','meta'],'readwrite');const done=complete(tx,db);const request=tx.objectStore('memories').openCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;const memory=cursor.value as Memory;if(memory.kind==='demo'||memory.kind==='test')cursor.delete();cursor.continue()};tx.objectStore('meta').put({id:'demo-initialized',value:true});return done}
export function useMemories(owner:string|null){const [memories,setMemories]=useState<Memory[]>([]);const [error,setError]=useState('');const [loaded,setLoaded]=useState(false);useEffect(()=>{(owner?readCloud(owner):initializeDemo().then(readMemories)).then(setMemories).catch(()=>setError(owner?'Your private collection could not be loaded. Reload to try again.':'Local storage could not be opened. Please allow browser storage, close older museum tabs, then reload.')).finally(()=>setLoaded(true))},[]);return {memories,setMemories,error,loaded}}
export function exhibition(room:Room,memories:Memory[]):Room{const entries=new Map(memories.filter(m=>m.room===room.id).map(m=>[m.slot,m]));let count=3;for(const slot of entries.keys())count=Math.max(count,slot+2);return {...room,works:Array.from({length:count},(_,slot)=>{const memory=entries.get(slot);return {title:memory?.title??'Create a memory',subtitle:memory?.date??'An empty frame, a day to keep',note:memory?.diary??'',seed:slot,memory}})}}
export function useBlobUrl(blob?:Blob){const [url,setUrl]=useState('');useEffect(()=>{if(!blob){setUrl('');return}const next=URL.createObjectURL(blob);setUrl(next);return()=>URL.revokeObjectURL(next)},[blob]);return url}
