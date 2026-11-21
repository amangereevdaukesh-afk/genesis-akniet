import type { RoomId } from './data';
export type Energy='automatic'|'quiet'|'steady'|'driving';
type Study={ratio:number;color:string};
export interface ArtDirection {
 color:string; seconds:number; motion:string; texture:string;
 layout?:'folio'|'panorama'|'pair'|'sequence'; energy?:Energy;
 studies?:Study[]; cadence?:number; longform?:boolean; edition?:number; paperTone?:string; previewPath?:string;
}
const palette={glow:'#cb9b61',hush:'#8ca490',echo:'#71879c',pulse:'#a75a67'};
export function suggestTitle(diary:string,room:RoomId){
 const phrases=diary.trim().split(/[.!?;:\n]+/u).map(p=>p.trim().split(/\s+/u));
 const words=phrases.find(p=>p.length>=3)??phrases[0];
 if(words.length>=3)return words.slice(0,7).join(' ');
 const ru=/[а-яё]/i.test(diary);
 const suffix=ru?{glow:'в тёплом свете',hush:'в тишине дня',echo:'сквозь время',pulse:'в движении дня'}:{glow:'in afternoon light',hush:'in quiet hours',echo:'across the years',pulse:'in full motion'};
 return [words.join(' '),suffix[room]].join(' ').trim();
}
export function interpret(diary:string,room:RoomId,studies:Study[]=[],energy:Energy='automatic',hasMusic=false,date=''):ArtDirection{
 const energetic=/dance|rush|celebrat|танц|праздн|восторг/i.test(diary);
 const reflective=/quiet|remember|stillness|тиши|вспомина|помню/i.test(diary);
 const speed=energy==='automatic'?(energetic||room==='pulse'?'driving':reflective||room==='hush'?'quiet':'steady'):energy;
 const seconds={driving:4.8,steady:6.8,quiet:9}[speed]+(diary.length>400?1:0);
 const color=studies[0]?.color??palette[room];
 const month=Number(date.slice(5,7));
 const paperTone=month>=4&&month<=9?"#f1e5cd":"#dce1df";
 return {edition:2,paperTone,studies,energy,color,seconds,cadence:(hasMusic ? .84 : 1)*seconds/6,
 motion:speed==='driving'?'sweep':speed==='quiet'?'breathe':room==='echo'?'recede':'drift',
 texture:room==='echo'||reflective?'vellum':'clean',longform:diary.length>400,
 layout:studies.length>=3?'sequence':studies.length===2?'pair':(studies[0]?.ratio??1)>1.35?'panorama':'folio',
 };
}
export async function studyPhotos(photos:Blob[]):Promise<Study[]>{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=24;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Cannot read photographs.');
 const studies:Study[]=[];
 for(const blob of photos){
  const bitmap=await createImageBitmap(blob);
  try{
   ctx.clearRect(0,0,24,24);ctx.drawImage(bitmap,0,0,24,24);
   const pixels=ctx.getImageData(0,0,24,24).data;
   const bins=new Map<number,number[]>();
   for(let i=0;i<pixels.length;i+=4){
    if(pixels[i+3]<96)continue;
    const [r,g,b]=[pixels[i],pixels[i+1],pixels[i+2]];
    const k=(r>>5)*64+(g>>5)*8+(b>>5);
    const bin=bins.get(k)??[0,0,0,0];bin[0]++;bin[1]+=r;bin[2]+=g;bin[3]+=b;bins.set(k,bin);
   }
   const best=[...bins.values()].sort((a,b)=>b[0]-a[0])[0];
   const color=best?'#'+best.slice(1).map(v=>Math.round(v/best[0]).toString(16).padStart(2,'0')).join(''):'#a69c88';
   studies.push({ratio:bitmap.width/bitmap.height,color});
  }finally{bitmap.close()}
 }
 return studies;
}
