'use strict';
const root=document.documentElement;
const $=id=>document.getElementById(id);
const roles=['bg','surface','surface-alt','ink','muted','border','primary','primary-ink','focus','selected','danger'];
const elements=['fire','air','water','earth'];
const names={fire:'Feu',air:'Air',water:'Eau',earth:'Terre'};
function status(text){$('demo-status').textContent=text}
function ratio(fg,bg){
  const values=s=>s.match(/[\d.]+/g)?.slice(0,3).map(Number);
  const lum=rgb=>rgb.reduce((sum,n,i)=>{const x=n/255;return sum+[.2126,.7152,.0722][i]*(x<=.04045?x/12.92:((x+.055)/1.055)**2.4)},0);
  const f=values(fg),b=values(bg);if(!f||!b)return null;
  const a=lum(f),c=lum(b);return ((Math.max(a,c)+.05)/(Math.min(a,c)+.05)).toFixed(2);
}
function paintSwatches(){
  const panel=$('swatches');panel.replaceChildren();
  for(const role of [...roles,...elements.map(e=>'zodiac-'+e)]){
    const token='--astra-'+role, style=getComputedStyle(root);
    const cell=document.createElement('div');cell.className='catalog-swatch';
    const sample=document.createElement('span');sample.className='catalog-swatch-sample';
    sample.style.backgroundColor='var('+token+')';sample.setAttribute('aria-hidden','true');
    const label=document.createElement('strong');label.textContent=role;
    const value=document.createElement('div');value.className='tiny';value.textContent=style.getPropertyValue(token).trim();
    cell.append(sample,label,value);panel.append(cell);
  }
  const sample=document.createElement('span');panel.append(sample);
  sample.style.color='var(--astra-ink)';sample.style.backgroundColor='var(--astra-surface)';
  const css=getComputedStyle(sample);
  const contrast=ratio(css.color,css.backgroundColor);sample.remove();
  $('metrics').textContent='Largeur : '+innerWidth+' px · cible : '+getComputedStyle(root).getPropertyValue('--astra-control-min').trim()+' · texte/surface : '+contrast+':1';
}
function setPalette(value){
  root.dataset.astraPalette=value;$('palette').value=value;
  for(const btn of document.querySelectorAll('[data-element-palette]'))btn.setAttribute('aria-pressed',String(btn.dataset.elementPalette===value));
  paintSwatches();
}
for(const [id,label] of [['classic','Palette 1 · Classique'],['vivid','Palette 2 · Vive']]){
  const btn=document.createElement('button');btn.type='button';btn.className='astra-palette-choice';btn.dataset.elementPalette=id;
  const title=document.createElement('strong');title.textContent=label;
  const samples=document.createElement('span');samples.className='astra-palette-samples';samples.setAttribute('aria-hidden','true');
  for(const element of elements){const swatch=document.createElement('i');swatch.className='astra-palette-swatch';swatch.dataset.element=element;samples.append(swatch)}
  const desc=document.createElement('small');desc.textContent=elements.map(e=>names[e]).join(' · ');
  btn.append(title,samples,desc);btn.addEventListener('click',()=>setPalette(id));$('palette-options').append(btn);
}
$('theme').addEventListener('change',()=>{root.dataset.astraTheme=$('theme').value;root.style.colorScheme=$('theme').value;paintSwatches()});
$('palette').addEventListener('change',()=>setPalette($('palette').value));
$('safe-area').addEventListener('change',()=>{
  const values={none:[0,0,0,0],portrait:[32,0,30,0],landscape:[0,32,0,32]}[$('safe-area').value];
  ['top','right','bottom','left'].forEach((edge,i)=>root.style.setProperty('--astra-native-inset-'+edge,values[i]+'px'));
  paintSwatches();
});
$('text-scale').addEventListener('change',()=>{root.style.fontSize=$('text-scale').value+'%'});
for(const btn of document.querySelectorAll('[data-demo-action]'))btn.addEventListener('click',()=>status(btn.dataset.demoAction));
for(const btn of document.querySelectorAll('[data-demo-mode]'))btn.addEventListener('click',()=>{
  for(const item of document.querySelectorAll('[data-demo-mode]')){
    item.classList.toggle('on',item===btn);item.setAttribute('aria-pressed',String(item===btn));
  }
  status(btn.textContent);
});
$('open-dialog').addEventListener('click',()=>$('catalog-dialog').showModal());
$('close-dialog').addEventListener('click',()=>$('catalog-dialog').close());
$('catalog-dialog').addEventListener('close',()=>$('open-dialog').focus());
$('show-status').addEventListener('click',()=>status('Action effectuée.'));
const grid=$('calendar-grid');
for(const label of ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']){
  const day=document.createElement('span');day.className='weekday';day.textContent=label[0];day.setAttribute('aria-label',label);grid.append(day);
}
const week=document.createElement('div');week.className='astra-calendar-date-week';
const ribbon=document.createElement('div');ribbon.className='astra-solar-ribbon-backdrop';ribbon.setAttribute('aria-hidden','true');
for(const [element,start,span,extra] of [['earth',1,7,' ends-at-ingress'],['water',8,7,' starts-at-ingress']]){
  const band=document.createElement('span');band.className='astra-solar-ribbon-segment solar-element-'+element+extra;band.style.gridColumn=start+' / span '+span;ribbon.append(band);
}
week.append(ribbon);
function chooseDay(day){
  for(const btn of week.querySelectorAll('button.day')){
    const selected=btn.dataset.day===day;btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',String(selected));
  }
  $('catalog-date-picker').value=day;
}
for(let i=1;i<=7;i++){
  const date='2026-11-'+String(i).padStart(2,'0'),btn=document.createElement('button');btn.type='button';btn.className='day'+(i===1?' today':'');btn.dataset.day=date;btn.dataset.solarElement=i<=3?'earth':'water';
  if(i===4)btn.dataset.solarIngress='true';
  if(i===1)btn.setAttribute('aria-current','date');
  btn.setAttribute('aria-label',i+' novembre, '+(i<=3?'Terre':i===4?'Terre vers Eau':'Eau'));
  const number=document.createElement('span');number.className='astra-calendar-date-number';number.textContent=String(i);btn.append(number);
  btn.addEventListener('click',()=>chooseDay(date));week.append(btn);
  const option=document.createElement('option');option.value=date;option.textContent=i+' novembre';$('catalog-date-picker').append(option);
}
grid.append(week);chooseDay('2026-11-01');
$('catalog-date-picker').addEventListener('change',()=>chooseDay($('catalog-date-picker').value));
// Copy the real navigation markup from the production HTML; no second template.
async function loadNav(){
  const response=await fetch('/index.html');if(!response.ok)throw Error('Navigation indisponible');
  const doc=new DOMParser().parseFromString(await response.text(),'text/html');
  const nav=doc.querySelector('.bottom-nav');if(!nav)throw Error('Navigation absente');
  nav.setAttribute('aria-label','Démonstration de la navigation');
  for(const btn of nav.querySelectorAll('button')){
    for(const attr of ['id','aria-haspopup','aria-controls','aria-expanded'])btn.removeAttribute(attr);
    btn.addEventListener('click',()=>{
      for(const other of nav.querySelectorAll('button')){
        other.classList.toggle('active',other===btn);other.setAttribute('aria-pressed',String(other===btn));
      }
      status(btn.getAttribute('aria-label'));
    });
    btn.setAttribute('aria-pressed',String(btn.classList.contains('active')));
  }
  $('nav-slot').replaceWith(nav);
}
setPalette('vivid');window.addEventListener('resize',paintSwatches);
loadNav().catch(err=>{status(err.message);document.documentElement.dataset.catalogError='true'});
