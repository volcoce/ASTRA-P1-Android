#!/usr/bin/env python3
"""Build reproducible P1 astronomical timeline from ASTRA P0 precalculated data.

Swiss Ephemeris Moshier geocentric apparent ecliptic longitudes. Windows: |angular
residual| <= 2.0 degrees, sampled then boundaries refined by 24-step bisection.
Moon sampling 90m; other planets 6h / 12h. Outside the 2026–28 horizon,
boundaries are explicitly marked clipped, not extrapolated.

The input contains a fixed natal profile. The resulting JS retains that profile.
Releasing embedded Swiss Ephemeris-derived work may require licensing review.
"""
from __future__ import annotations
import bisect
from collections import defaultdict
from datetime import datetime, timezone, timedelta
import json
import math
from pathlib import Path
import sys
import swisseph as swe

ASSET = Path(__file__).resolve().parents[1] / 'app/src/main/assets'
T0 = datetime(2026,1,1,tzinfo=timezone.utc)
T1 = datetime(2029,1,1,tzinfo=timezone.utc)
SECS = round((T1-T0).total_seconds())
JD0 = swe.julday(2026,1,1,0)
BODIES={'Sun':swe.SUN,'Moon':swe.MOON,'Mercury':swe.MERCURY,'Venus':swe.VENUS,
        'Mars':swe.MARS,'Jupiter':swe.JUPITER,'Saturn':swe.SATURN,
        'Uranus':swe.URANUS,'Neptune':swe.NEPTUNE,'Pluto':swe.PLUTO}
ASPECT_ANGLES=[('conjonction',0),('sextile',-60),('sextile',60),('carré',-90),('carré',90),
               ('trigone',-120),('trigone',120),('opposition',180)]
ORB=2.


def utcstr(sec):
    return (T0 + timedelta(seconds=sec)).strftime('%Y-%m-%dT%H:%M:%SZ')

def calc(sec, body, mode):
    flag = swe.FLG_MOSEPH|swe.FLG_SPEED|(swe.FLG_SIDEREAL if mode=='sidereal' else 0)
    vals, actual_flags=swe.calc_ut(JD0+sec/86400.0,BODIES[body],flag)
    if (actual_flags & swe.FLG_MOSEPH)==0:
        raise RuntimeError(f'Unexpected ephemeris flag {actual_flags} for {body}')
    return vals[0] % 360, vals[3]

def residual(lon,natal,target):
    return ((lon-natal-target+180)%360)-180

def bisect_root(fn,low,high):
    fa=fn(low);fb=fn(high)
    if fa==0:return low
    if fb==0:return high
    if fa*fb>0:raise ValueError('no root bracketed')
    for _ in range(24):
        mid=(low+high)/2
        fm=fn(mid)
        if fm==0:return mid
        if fa*fm<0:high=mid;fb=fm
        else:low=mid;fa=fm
    return (low+high)/2

def load_input():
    script=(ASSET/'data.js').read_text()
    prefix='window.ASTRA_FORECASTS='
    assert script.startswith(prefix)
    return json.loads(script[len(prefix):].rstrip().rstrip(';'))

def build_windows(all_data):
    result={}; cached={}; exact_index={}
    for mode in ('tropical','sidereal'):
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        natal=all_data[mode]['2026-01']['natal']['positions']
        lookup=defaultdict(list)
        for m in all_data[mode].values():
            for d in m['days']:
                for ev in d['events']:
                    tm=datetime.fromisoformat(ev['time_utc'])
                    sec=(tm-T0).total_seconds()
                    lookup[(ev['transiting'],ev['natal'],ev['aspect'])].append((sec,ev))
        for ls in lookup.values():ls.sort(key=lambda x:x[0])
        output=[]
        for body in BODIES:
            step=90*60 if body=='Moon' else (6*3600 if body in ('Sun','Mercury','Venus','Mars') else 12*3600)
            times=list(range(0,SECS,step))
            if times[-1]!=SECS:times.append(SECS)
            vals=[calc(t,body,mode) for t in times]
            longs=[x[0] for x in vals]
            for natal_name,np in natal.items():
                nlon=np['longitude']
                for aspect,target in ASPECT_ANGLES:
                    starts=[]
                    prev_inside=abs(residual(longs[0],nlon,target))<=ORB
                    start=0 if prev_inside else None
                    start_clipped=prev_inside
                    for i in range(1,len(times)):
                        inside=abs(residual(longs[i],nlon,target))<=ORB
                        if inside == prev_inside:continue
                        a,b=times[i-1],times[i]
                        def f(x):return abs(residual(calc(x,body,mode)[0],nlon,target))-ORB
                        boundary=bisect_root(f,a,b)
                        if inside:
                            start=boundary
                            start_clipped=False
                        else:
                            starts.append((start,boundary,start_clipped,False))
                            start=None
                        prev_inside=inside
                    if prev_inside:starts.append((start,SECS,start_clipped,True))
                    events=lookup.get((body,natal_name,aspect),[])
                    etimes=[x[0] for x in events]
                    for s,e,sc,ec in starts:
                        lo=bisect.bisect_left(etimes,s-2)
                        hi=bisect.bisect_right(etimes,e+2)
                        within=[]
                        for v,evt in events[lo:hi]:
                            if abs(residual(calc(v,body,mode)[0],nlon,target))<0.015:
                                within.append([round(v),int(bool(evt['retrograde']))])
                        output.append(dict(t=body,n=natal_name,a=aspect,theta=target,
                            s=utcstr(s),e=utcstr(e),sc=int(sc),ec=int(ec),p=within))
            print(f'{mode:<8} {body:<8} {len(output)} fenetres',flush=True)
        output.sort(key=lambda w:(w['s'],w['t'],w['n'],w['theta']))
        # Subsequent related windows in one retrograde loop share a group ID.
        by_key=defaultdict(list)
        for idx,w in enumerate(output):by_key[(w['t'],w['n'],w['theta'])].append(idx)
        group_num=0
        limits={'Mercury':45,'Venus':85,'Mars':160,'Jupiter':220,'Saturn':250,
                'Uranus':250,'Neptune':250,'Pluto':250}
        for (body,_,_), ids in by_key.items():
            if body not in limits:continue
            cluster=[]
            def flush():
                nonlocal group_num
                if len(cluster)<=1:return
                if not any(any(p[1] for p in output[z]['p']) for z in cluster):return
                group_num+=1
                for rank,z in enumerate(cluster,1):
                    output[z]['g']=group_num
                    output[z]['gi']=rank
                    output[z]['gn']=len(cluster)
            for z in ids:
                if cluster and (datetime.fromisoformat(output[z]['s'].replace('Z','+00:00'))-
                                datetime.fromisoformat(output[cluster[-1]]['e'].replace('Z','+00:00'))).total_seconds()/86400>limits[body]:
                    flush();cluster=[]
                cluster.append(z)
            flush()
        print('TOTAL',mode,len(output),'groupes',group_num,flush=True)
        result[mode]=output
    return result

def lunar_events():
    # Moon-Sun ecliptic-longitude conjunction, square, opposition, square.
    # Times are geocentric exact ecliptic differences, not observed illumination extrema.
    mode='tropical'
    step=6*3600
    times=list(range(0,SECS+1,step))
    if times[-1]!=SECS:times.append(SECS)
    def r(sec,target):
        return residual(calc(sec,'Moon',mode)[0],calc(sec,'Sun',mode)[0],target)
    phases=[('Nouvelle Lune',0),('Premier quartier',90),('Pleine Lune',180),('Dernier quartier',270)]
    sky=[]
    for name,target in phases:
        prev=r(times[0],target)
        for a,b in zip(times,times[1:]):
            va=prev;vb=r(b,target);prev=vb
            if va*vb>0 or max(abs(va),abs(vb))>15:continue
            root=bisect_root(lambda x:r(x,target),a,b)
            sun_l=calc(root,'Sun','tropical')[0]
            moon_l=calc(root,'Moon','tropical')[0]
            sky.append({'kind':'moon','label':name,'at':utcstr(root),
                        'longitude_tropical':round(moon_l,5),
                        'longitude_sidereal':round(calc(root,'Moon','sidereal')[0],5)})
    sky.sort(key=lambda x:x['at'])
    return sky

def station_events():
    # Standard direct/retrograde stations defined by zero tropical apparent longitude speed.
    sky=[]
    for body in ('Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'):
        step=12*3600
        times=list(range(0,SECS+1,step))
        if times[-1]!=SECS:times.append(SECS)
        prev=calc(0,body,'tropical')[1]
        for a,b in zip(times,times[1:]):
            cur=calc(b,body,'tropical')[1]
            if prev*cur<=0:
                at=bisect_root(lambda x:calc(x,body,'tropical')[1],a,b)
                direction='retrograde' if prev>0 else 'direct'
                sky.append({'kind':'station','body':body,'direction':direction,
                            'label':('Station rétrograde' if direction=='retrograde' else 'Station directe'),
                            'at':utcstr(at), 'longitude_tropical':round(calc(at,body,'tropical')[0],5),
                            'longitude_sidereal':round(calc(at,body,'sidereal')[0],5)})
            prev=cur
    sky.sort(key=lambda x:x['at'])
    return sky

def mark_motion(all_data):
    # Derivative of the absolute aspect residual = residual * longitude speed.
    # A local extremum without an exact aspect is handled as stationnaire.
    from zoneinfo import ZoneInfo
    tz=ZoneInfo('Europe/Paris')
    for mode in ('tropical','sidereal'):
        natal_positions=all_data[mode]['2026-01']['natal']['positions']
        for month in all_data[mode].values():
            for day in month['days']:
                date=datetime.fromisoformat(day['date'])
                midday=date.replace(hour=12,tzinfo=tz).astimezone(timezone.utc)
                sec=(midday-T0).total_seconds()
                sky={body:calc(sec,body,mode) for body in BODIES}
                for act in day['active']:
                    body=act['transiting'];n=act['natal'];aspect=act['aspect']
                    base=natal_positions[n]['longitude']
                    choices=[abs(residual(sky[body][0],base,target)) for label,target in ASPECT_ANGLES if label==aspect]
                    target=min((target for label,target in ASPECT_ANGLES if label==aspect),key=lambda v:abs(residual(sky[body][0],base,v)))
                    r=residual(sky[body][0],base,target);speed=sky[body][1]
                    phase='exact' if abs(r)<0.001 else 'stationnaire' if abs(speed)<0.00003 else 'appliquant' if r*speed<0 else 'séparant'
                    act['phase']=phase

def validate(all_data,p1):
    for mode in ('tropical','sidereal'):
        windows=p1['windows'][mode]
        assert windows
        actual=defaultdict(list)
        for w in windows:
            assert w['s']<w['e']
            for p in w['p']:
                actual[(w['t'],w['n'],w['a'],p[0])].append(w)
        missing=[];count=0
        for m in all_data[mode].values():
            for d in m['days']:
                for ev in d['events']:
                    count+=1
                    sec=round((datetime.fromisoformat(ev['time_utc'])-T0).total_seconds())
                    if not any(actual[(ev['transiting'],ev['natal'],ev['aspect'],sec+i)] for i in (-1,0,1)):
                        missing.append((ev,sec))
        print(mode,'contacts',count,'non-affectes',len(missing), 'fenetres',len(windows))
        if missing:print('EXEMPLES NON AFFECTES',missing[:3])
        assert len(missing)==0, 'Un contact exact est sans fenetre de transit'
    moons=[e for e in p1['sky'] if e['kind']=='moon']
    stations=[e for e in p1['sky'] if e['kind']=='station']
    print('phases',len(moons),'stations',len(stations))
    assert 145 <= len(moons) <= 155
    assert 40 <= len(stations) <= 80
    full=[e for e in moons if e['label']=='Pleine Lune' and e['at'].startswith('2026-11-24')]
    new=[e for e in moons if e['label']=='Nouvelle Lune' and e['at'].startswith('2026-11-09')]
    assert len(full)==len(new)==1
    def minute_dist(at,ref):return abs((datetime.fromisoformat(at.replace('Z','+00:00'))-ref).total_seconds())/60
    assert minute_dist(full[0]['at'],datetime(2026,11,24,14,53,tzinfo=timezone.utc))<2
    assert minute_dist(new[0]['at'],datetime(2026,11,9,7,2,tzinfo=timezone.utc))<2


def main():
    data=load_input()
    windows=build_windows(data)
    sky=lunar_events()+station_events()
    sky.sort(key=lambda e:e['at'])
    p1={'meta':{'start':'2026-01-01','end_exclusive':'2029-01-01','orb':2,
                'engine':'Swiss Ephemeris / Moshier', 'station_definition':'zero tropical longitude speed',
                'phase_definition':'geocentric ecliptic longitude difference'},
        'windows':windows,'sky':sky}
    mark_motion(data)
    validate(data,p1)
    (ASSET/'data.js').write_text('window.ASTRA_FORECASTS='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
    (ASSET/'p1-data.js').write_text('window.ASTRA_P1='+json.dumps(p1,ensure_ascii=False,separators=(',',':'))+';\n')
    print('Data output bytes',(ASSET/'p1-data.js').stat().st_size,flush=True)
if __name__=='__main__':main()
