/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import type { Memory } from './memories';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const client = url && key ? createClient(url,key) : null;
const media = () => client!.storage.from('memory-media');

const cleanupPrefix='museum-media-cleanup/';
async function cleanFiles(owner:string,paths:string[]){
  const safe=paths.filter(path=>path.startsWith(owner+'/'));
  if(!safe.length)return;
  const key=cleanupPrefix+owner+'/'+crypto.randomUUID();
  try{localStorage.setItem(key,JSON.stringify(safe))}catch{/* Storage may be disabled. */}
  const {error}=await media().remove(safe);
  if(!error){try{localStorage.removeItem(key)}catch{}}
}
async function retryCleanup(owner:string){
  try{
    for(const key of Object.keys(localStorage).filter(k=>k.startsWith(cleanupPrefix+owner+'/'))){
      const paths:unknown=JSON.parse(localStorage.getItem(key)??'[]');
      if(!Array.isArray(paths)||!paths.every(p=>typeof p==='string'&&p.startsWith(owner+'/')))continue;
      const {error}=await media().remove(paths);
      if(!error)localStorage.removeItem(key);
    }
  }catch{/* A later visit can retry a failed cleanup. */}
}
export async function googleEnabled(){
  const response=await fetch(url+'/auth/v1/settings',{headers:{apikey:key}});
  if(!response.ok)throw Error('Cannot reach the account service. Please try again.');
  const settings=await response.json();return settings.external?.google===true;
}

export async function saveCloud(memory:Memory, owner:string, replacing=false, phase?:(message:string)=>void) {
  const previous=await pathsFor(memory.id,!replacing);
  phase?.('Uploading media...');
  const uploaded:string[]=[];
  async function upload(file:Blob) {
    if(file.size>25*1024*1024) throw Error('Each file must be under 25 MB.');
    const path=[owner,memory.id,crypto.randomUUID()].join('/');
    const {error}=await media().upload(path,file,{contentType:file.type});
    if(error) throw error;
    uploaded.push(path);
    return path;
  }
  let submitted=false;
  try {
    if(memory.photos.some(p=>!['image/jpeg','image/png','image/webp'].includes(p.type)||p.size>25*1024*1024))throw Error('Use JPEG, PNG or WebP photographs up to 25 MB.');
    if(memory.audio&&!['audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/webm'].includes(memory.audio.type))throw Error('Unsupported audio format.');
    if(!memory.photos.length)throw Error('Choose a photograph before saving.');
    const cover=await createImageBitmap(memory.photos[0]);
    const canvas=document.createElement('canvas');
    try {
      const scale=Math.min(1,480/Math.max(cover.width,cover.height));
      canvas.width=Math.max(1,Math.round(scale*cover.width));canvas.height=Math.max(1,Math.round(scale*cover.height));
      canvas.getContext('2d')!.drawImage(cover,0,0,canvas.width,canvas.height);
    } finally {cover.close()}
    const thumbnail=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Thumbnail unavailable.')),'image/jpeg',.79));
    const previewPath=await upload(thumbnail);
    const pictures=[];
    for(const photo of memory.photos) pictures.push({path:await upload(photo),type:photo.type,size:photo.size});
    const path=memory.audio ? await upload(memory.audio) : null;
    const {id,date,title,diary,room,slot,visual}=memory;
    phase?.('Saving your memory...');
    submitted=true;
    const {error}=await client!.rpc('store_day',{day:{id,date,title,diary,room,slot,visual:{...visual,previewPath},visibility:'private'},pictures,music:{url:memory.musicUrl,path,title:memory.track?.title,artist:memory.track?.artist,track_id:memory.track?.id}});
    if(error){
      if(error.code && /^([0-9A-Z]{5}|PGRST\d+)$/.test(error.code)){submitted=false;throw error}
      // A lost HTTP response can follow a committed transaction. Its unique cover identifies this write.
      const receipt=await client!.from('memories').select('visual_settings').eq('id',id).maybeSingle();
      if(receipt.error||receipt.data?.visual_settings?.previewPath!==previewPath)throw error;
    }
    memory.visual={...visual,previewPath};memory.media={pictures:pictures.map(p=>p.path),audio:path??undefined};
    if(previous.length)await cleanFiles(owner,previous).catch(()=>{});
  } catch(error) {
    if(!submitted && uploaded.length)await cleanFiles(owner,uploaded).catch(()=>{});
    throw error;
  }
}
export async function download(path:string) {
  const {data,error}=await media().download(path);
  if(error) throw error;
  return data;
}
export async function readCloud(owner:string):Promise<Memory[]> {
  void retryCleanup(owner);
  const {data,error}=await client!.from('memories').select('*,memory_photos(storage_path,display_order),memory_music(external_url,storage_path,track_title,artist,provider_track_id)').eq('user_id',owner);
  if(error) throw error;
  const paths=data.flatMap(row=>row.memory_music?.storage_path?[String(row.memory_music.storage_path)]:[]);
  const signed=paths.length?await media().createSignedUrls(paths,1800):null;
  const urls=new Map(signed?.data?.map(item=>[item.path,item.signedUrl]));
  return data.map(row=>{
    const pictures=row.memory_photos as {storage_path:string;display_order:number}[];
    return {id:row.id,kind:'personal',date:row.memory_date,title:row.title,diary:row.diary_text,room:row.emotional_room,slot:row.slot,visual:row.visual_settings,createdAt:row.created_at,photos:[],media:{pictures:pictures.sort((a,b)=>a.display_order-b.display_order).map(p=>p.storage_path),audio:row.memory_music?.storage_path??undefined,audioUrl:urls.get(row.memory_music?.storage_path)??undefined,expires:Date.now()+1790000},track:row.memory_music?.provider_track_id?{id:row.memory_music.provider_track_id,title:row.memory_music.track_title,artist:row.memory_music.artist,url:row.memory_music.external_url}:undefined,musicUrl:row.memory_music?.external_url??'',cloud:true};
  });
}

export async function prepareOpening(memory:Memory):Promise<Memory>{
  if(!memory.media||memory.photos.length)return memory;
  const keys=memory.media.pictures;
  const {data,error}=await media().createSignedUrls(keys,3600);
  if(error)throw error;
  const urls=new Map(data.map(entry=>[entry.path,entry.signedUrl]));
  const sources=keys.map(path=>{const url=urls.get(path);if(!url)throw Error('A photograph is unavailable.');return url});
  // Only the displayed photographs are requested by the viewer. Editing still hydrates originals.
  const needsAudio=memory.media.audio&&(!memory.media.audioUrl||!memory.media.expires||memory.media.expires<=Date.now());
  return {...memory,sources,audio:needsAudio?await download(memory.media.audio!):undefined};
}
export async function hydrate(memory:Memory):Promise<Memory>{
  if(!memory.media || memory.photos.length)return memory;
  const [photos,audio]=await Promise.all([Promise.all(memory.media.pictures.map(download)),memory.media.audio?download(memory.media.audio):undefined]);
  return {...memory,photos,audio};
}
async function pathsFor(id:string, optional=false) {
  const {data,error}=await client!.from('memories').select('user_id,visual_settings,memory_photos(storage_path),memory_music(storage_path)').eq('id',id).maybeSingle();
  if(error) throw error;
  if(!data){if(optional)return [];throw Error("Memory no longer exists.")}
  const music=data.memory_music as unknown as {storage_path?:string}|null;
  return [...data.memory_photos.map(p=>p.storage_path as string),...(music?.storage_path?[music.storage_path]:[]),data.visual_settings?.previewPath].filter((path):path is string=>typeof path==="string"&&path.startsWith(data.user_id+"/"+id+"/"));
}
export async function removeCloud(memory:Memory, owner:string){
  const paths=await pathsFor(memory.id);
  const result=await client!.from('memories').delete().eq('id',memory.id).select('id').single();
  if(result.error)throw result.error;
  await cleanFiles(owner,paths);
}
