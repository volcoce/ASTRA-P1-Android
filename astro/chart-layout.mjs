/**
 * Deterministic circular label layout for the natal SVG.
 *
 * The marker ALWAYS stays at its astronomical longitude. Only the rendered
 * glyph may move along its ring to avoid overlap, linked to its marker.
 *
 * Sort longitudes, cut the circle at the largest empty gap, then use pooled
 * adjacent violators (isotonic regression) to obtain minimally displaced
 * ordered labels separated by at least minDegrees.
 */
import {mod} from './core.mjs';

export const MIN_LABEL_SPACING_DEGREES = 14;

export function layoutPlanetLabels(positions, minDegrees = MIN_LABEL_SPACING_DEGREES) {
  if (!positions || typeof positions !== 'object' || Array.isArray(positions))
    throw Error('Positions planétaires invalides');
  if (!Number.isFinite(minDegrees) || minDegrees <= 0 || minDegrees > 30)
    throw Error('Espacement de glyphes invalide');
  const sorted=Object.entries(positions)
    .filter(([,longitude])=>Number.isFinite(longitude))
    .map(([body,longitude])=>({body,longitude:mod(longitude)}))
    .sort((a,b)=>a.longitude-b.longitude || a.body.localeCompare(b.body));
  const count=sorted.length;
  if (!count) return {};
  if (count*minDegrees >= 360) throw Error('Trop de planètes pour cet espacement');
  if (count===1) {
    const item=sorted[0];
    return {[item.body]:{longitude:item.longitude,labelLongitude:item.longitude,shiftDegrees:0}};
  }

  // A stable seam in the largest true empty sector prevents crossing the
  // zodiac wrap, even with a conjunction spanning 359° and 1°.
  let largestGap=-1,after=0;
  for(let i=0;i<count;i++){
    const next=sorted[(i+1)%count].longitude+(i===count-1?360:0);
    const gap=next-sorted[i].longitude;
    if(gap>largestGap){largestGap=gap;after=(i+1)%count;}
  }
  const arranged=Array.from({length:count},(_,i)=>{
    const index=(after+i)%count,item=sorted[index];
    return {...item,unwrapped:item.longitude+(index<after?360:0)};
  });

  // PAVA solves the least-squares positioning with the spacing constraint
  // y[i+1]-y[i] >= minDegrees. No random jitter or unstable animations.
  const blocks=[];
  for(let i=0;i<count;i++){
    blocks.push({start:i,end:i,sum:arranged[i].unwrapped-i*minDegrees,count:1});
    while(blocks.length>1){
      const last=blocks[blocks.length-1],previous=blocks[blocks.length-2];
      if(previous.sum/previous.count<=last.sum/last.count)break;
      previous.end=last.end;previous.sum+=last.sum;previous.count+=last.count;
      blocks.pop();
    }
  }
  const placed=new Array(count);
  for(const block of blocks){
    const average=block.sum/block.count;
    for(let i=block.start;i<=block.end;i++)placed[i]=average+i*minDegrees;
  }
  // With the seam chosen at the largest empty interval, the free boundary
  // remains wide enough for <=10 glyphs at 14°. Verify at runtime nonetheless.
  if(placed[0]+360-placed[count-1]<minDegrees-1e-7)
    throw Error('Disposition circulaire impossible sans collision');

  return Object.fromEntries(arranged.map((item,i)=>{
    const labelLongitude=mod(placed[i]);
    const shiftDegrees=mod(labelLongitude-item.longitude+180)-180;
    return [item.body,{longitude:item.longitude,labelLongitude,
      shiftDegrees:+shiftDegrees.toFixed(5)}];
  }));
}
