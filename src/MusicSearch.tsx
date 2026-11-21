import { useEffect, useRef, useState } from 'react';

export interface Track { id:string; title:string; artist:string; url:string }

export function MusicSearch({selected,onSelect}:{selected?:Track;onSelect:(track:Track)=>void}) {
  const [query,setQuery]=useState('');
  const [tracks,setTracks]=useState<Track[]>([]);
  const [status,setStatus]=useState('');
  const request=useRef<AbortController|null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  async function search() {
    request.current?.abort();
    const controller=new AbortController();
    request.current=controller;
    setTracks([]);setStatus('Searching…');
    const params=new URLSearchParams({term:query.trim(),entity:'song',media:'music',country:'US',limit:'6'});
    try {
      const response=await fetch('https://itunes.apple.com/search?'+params,{signal:controller.signal});
      if(!response.ok)throw Error();
      const body=await response.json();
      const found:Track[]=[];
      for(const item of body.results){
        if(item.trackId && item.trackName && item.artistName && /^https:\/\/music\.apple\.com\//.test(item.trackViewUrl)){
          found.push({id:String(item.trackId),title:item.trackName,artist:item.artistName,url:item.trackViewUrl});
        }
      }
      setTracks(found);setStatus(found.length?'Choose a recording.':'No recordings found.');
    } catch {if(!controller.signal.aborted)setStatus('Search unavailable. You can paste a music link below.')}
  }
  return <fieldset><legend>Find a recording</legend><label>Song or artist<input value={query} onChange={e=>{request.current?.abort();setQuery(e.target.value);setTracks([]);setStatus('')}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(query.trim().length>=2)void search()}}}/></label><button type="button" disabled={query.trim().length<2} onClick={()=>void search()}>Search music</button><p role="status">{status || (selected ? selected.title+' · '+selected.artist : '')}</p>{tracks.map(t=><button type="button" key={t.id} onClick={()=>{onSelect(t);setStatus('');setTracks([])}}>{t.title} · {t.artist}</button>)}</fieldset>
}
