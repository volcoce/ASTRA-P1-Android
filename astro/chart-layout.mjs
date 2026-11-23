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


/**
 * Actual-angle wheel grouping. Unlike layoutPlanetLabels, this never changes
 * the longitude of a planet glyph to make the drawing look less crowded.
 * One planet: a glyph at its precise angle. Two close planets: radial stacking
 * at their own angles. Three or more: one accessible cluster marker, with
 * individual exact positions retained in the returned group.
 *
 * Grouping is purely visual; it MUST NOT be interpreted as a conjunction.
 */
export function groupWheelPlanets(positions, gapDegrees=11, maxGroupSpan=27){
  if(!positions||typeof positions!=='object'||Array.isArray(positions))
    throw Error('Positions planétaires invalides');
  if(!Number.isFinite(gapDegrees)||gapDegrees<=0||gapDegrees>25||
     !Number.isFinite(maxGroupSpan)||maxGroupSpan<gapDegrees||maxGroupSpan>60)
    throw Error('Espacement de regroupement invalide');
  const sorted=Object.entries(positions)
    .filter(([,longitude])=>Number.isFinite(longitude))
    .map(([body,longitude])=>({body,longitude:mod(longitude)}))
    .sort((a,b)=>a.longitude-b.longitude||a.body.localeCompare(b.body));
  if(!sorted.length)return [];
  if(sorted.length===1)return [{longitude:sorted[0].longitude,items:sorted}];
  // Choose the largest truly empty sector as the circular seam. Clusters
  // crossing 0° Aries are then handled like all the others.
  let largest=-1,first=0;
  for(let i=0;i<sorted.length;i++){
    const next=sorted[(i+1)%sorted.length].longitude+(i===sorted.length-1?360:0);
    const gap=next-sorted[i].longitude;
    if(gap>largest){largest=gap;first=(i+1)%sorted.length;}
  }
  const ordered=Array.from({length:sorted.length},(_,i)=>{
    const index=(first+i)%sorted.length;
    return {...sorted[index],unwrapped:sorted[index].longitude+(index<first?360:0)};
  });
  const groups=[];
  for(const item of ordered){
    const group=groups[groups.length-1];
    if(group&&item.unwrapped-group[group.length-1].unwrapped<=gapDegrees&&
      item.unwrapped-group[0].unwrapped<=maxGroupSpan){
      group.push(item);
    }else groups.push([item]);
  }
  return groups.map(items=>({
    longitude:mod(items.reduce((sum,item)=>sum+item.unwrapped,0)/items.length),
    items:items.map(({body,longitude})=>({body,longitude}))
  }));
}
