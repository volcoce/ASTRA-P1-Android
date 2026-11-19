"""ASTRA astronomical calculation backend (Moshier mode of Swiss Ephemeris).

Geocentric, apparent ecliptic positions of date. No predictive efficacy is asserted.
The Swiss Ephemeris is dual-licensed: review AGPL-3.0/commercial obligations
before distributing a version that incorporates pyswisseph.
"""
from __future__ import annotations
from datetime import datetime, date, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from threading import RLock
import math
import swisseph as swe

_LOCK = RLock()  # swisseph has global sidereal mode
BODIES = {
    'Sun': swe.SUN, 'Moon': swe.MOON, 'Mercury': swe.MERCURY,
    'Venus': swe.VENUS, 'Mars': swe.MARS, 'Jupiter': swe.JUPITER,
    'Saturn': swe.SATURN, 'Uranus': swe.URANUS, 'Neptune': swe.NEPTUNE,
    'Pluto': swe.PLUTO,
}
SIGNS = ['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge',
         'Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons']
ASPECTS = {'conjonction':(0,), 'sextile':(-60,60), 'carré':(-90,90),
           'trigone':(-120,120), 'opposition':(180,)}
LABELS = {'Sun':'Soleil','Moon':'Lune','Mercury':'Mercure','Venus':'Vénus',
          'Mars':'Mars','Jupiter':'Jupiter','Saturn':'Saturne','Uranus':'Uranus',
          'Neptune':'Neptune','Pluto':'Pluton'}


def norm(deg: float) -> float:
    return deg % 360.0


def wrap(deg: float) -> float:
    """Wrap to [-180,180)."""
    return (deg + 180.0) % 360.0 - 180.0


def julian(utc: datetime) -> float:
    utc=utc.astimezone(timezone.utc)
    hour=utc.hour+utc.minute/60+utc.second/3600+utc.microsecond/3600000000
    return swe.julday(utc.year, utc.month, utc.day, hour)


def parse_utc(local_date: str, local_time: str, zone: str, fold: int|None) -> datetime:
    """Reject ambiguous / nonexistent civil times instead of silently guessing."""
    try:
        tz=ZoneInfo(zone)
        naive=datetime.fromisoformat(f'{local_date}T{local_time}')
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValueError('Date, heure ou identifiant IANA du fuseau invalide.') from exc
    possibilities=[]
    for f in (0,1):
        local=naive.replace(tzinfo=tz, fold=f)
        utc=local.astimezone(timezone.utc)
        if utc.astimezone(tz).replace(tzinfo=None)==naive:
            possibilities.append(utc)
    possibilities=list(dict.fromkeys(possibilities))
    if not possibilities:
        raise ValueError('Heure de naissance inexistante (changement d’heure).')
    if len(possibilities)>1 and fold is None:
        raise ValueError('Heure de naissance ambiguë : préciser fold = 0 ou 1.')
    if fold not in (None,0,1):
        raise ValueError('fold doit être 0, 1 ou null.')
    candidate=naive.replace(tzinfo=tz,fold=fold or 0).astimezone(timezone.utc)
    if candidate not in possibilities:
        raise ValueError('Heure civile invalide pour ce fuseau.')
    return candidate


def positions(utc:datetime, mode:str) -> dict:
    """Sidereal Lahiri; Moshier analytical ephemeris, not external .se1 files."""
    if mode not in ('tropical','sidereal'):
        raise ValueError('Zodiaque invalide.')
    jd=julian(utc)
    flags=swe.FLG_MOSEPH | swe.FLG_SPEED
    if mode=='sidereal':
        flags|=swe.FLG_SIDEREAL
    with _LOCK:
        if mode=='sidereal': swe.set_sid_mode(swe.SIDM_LAHIRI)
        result={}
        for name,body in BODIES.items():
            vals,used=swe.calc_ut(jd,body,flags)
            result[name]={'longitude':norm(vals[0]),'latitude':vals[1],
                          'speed_deg_day':vals[3], 'retrograde':vals[3]<0}
        ayanamsha=swe.get_ayanamsa_ut(jd) if mode=='sidereal' else None
    return {'positions':result,'ayanamsha':ayanamsha}


def natal(profile:dict, mode:str) -> dict:
    utc=parse_utc(profile['date'],profile['time'],profile['timezone'],profile.get('fold'))
    lat=float(profile['latitude']);lon=float(profile['longitude'])
    if not -90<=lat<=90 or not -180<=lon<=180:
        raise ValueError('Latitude ou longitude hors limites.')
    house_system=profile.get('house_system','P')
    if house_system not in ('P','W'):
        raise ValueError('Système de maisons non pris en charge.')
    sky=positions(utc,mode)
    jd=julian(utc)
    flags=swe.FLG_SIDEREAL if mode=='sidereal' else 0
    with _LOCK:
        if mode=='sidereal': swe.set_sid_mode(swe.SIDM_LAHIRI)
        try:
            cusps,angles=swe.houses_ex(jd,lat,lon,house_system.encode('ascii'),flags)
        except swe.Error as exc:
            raise ValueError('Maisons impossibles à calculer : vérifier la latitude ou choisir Signes entiers.') from exc
    asc,mc=norm(angles[0]),norm(angles[1])
    if house_system=='W':
        start=int(asc//30)*30
        cusps=[norm(start+30*k) for k in range(12)]
    return {'mode':mode,'time_utc':utc.isoformat(),'house_system':house_system,
            'ayanamsha':sky['ayanamsha'],'ascendant':asc,'midheaven':mc,
            'house_cusps':[norm(c) for c in cusps],
            'positions':sky['positions']}


def angle_label(deg:float)->str:
    sign=SIGNS[int(norm(deg)//30)]
    d=norm(deg)%30
    return f'{int(d):02}°{int((d%1)*60):02}′ {sign}'


def aspect_residual(planet_long:float,natal_long:float,angle:float)->float:
    return wrap(planet_long-natal_long-angle)


def exact_utc(name:str,natal_long:float,angle:float,mode:str,left:datetime,right:datetime)->datetime:
    """Binary refine a bracketed signed longitudinal angular root."""
    a=aspect_residual(positions(left,mode)['positions'][name]['longitude'],natal_long,angle)
    for _ in range(25):
        mid=left+(right-left)/2
        b=aspect_residual(positions(mid,mode)['positions'][name]['longitude'],natal_long,angle)
        if abs(b)<1e-8:return mid
        if (a<=0<=b) or (b<=0<=a):right=mid
        else:left,a=mid,b
    return left+(right-left)/2


def phase_info(sky:dict)->dict:
    sun=sky['Sun']['longitude']; moon=sky['Moon']['longitude']
    elongation=norm(moon-sun)
    # Physical illumination approximation from elongation (not from a full physical phase-angle model).
    return {'elongation_deg':round(elongation,3),
            'phase_label':('Nouvelle Lune' if elongation<22.5 or elongation>=337.5 else
                           'Premier croissant' if elongation<67.5 else
                           'Premier quartier' if elongation<112.5 else
                           'Gibbeuse croissante' if elongation<157.5 else
                           'Pleine Lune' if elongation<202.5 else
                           'Gibbeuse décroissante' if elongation<247.5 else
                           'Dernier quartier' if elongation<292.5 else
                           'Dernier croissant'),
            'approx_illumination_pct':round((1-math.cos(math.radians(elongation)))*50,1)}


def day_forecast(profile:dict, day:date, mode:str, display_timezone:str='Europe/Paris',
                 orb:float=2.0, include_exact:bool=True, precomputed_natal=None)->dict:
    if not 0<orb<=10:
        raise ValueError('Orbe en degrés hors limites (0, 10].')
    try:tz=ZoneInfo(display_timezone)
    except ZoneInfoNotFoundError as exc:raise ValueError('Fuseau d’affichage invalide.') from exc
    ref=precomputed_natal or natal(profile,mode)
    start=datetime.combine(day,time.min,tzinfo=tz).astimezone(timezone.utc)
    end=datetime.combine(day+timedelta(days=1),time.min,tzinfo=tz).astimezone(timezone.utc)
    noon=datetime.combine(day,time(12),tzinfo=tz).astimezone(timezone.utc)
    sky=positions(noon,mode)['positions']
    current=[]
    for tname,body in sky.items():
        for nname,npos in ref['positions'].items():
            d=body['longitude']-npos['longitude']
            best=min(((abs(wrap(d-target)),aname) for aname,angles in ASPECTS.items() for target in angles),key=lambda x:x[0])
            if best[0]<=orb:
                current.append({'transiting':tname,'natal':nname,'aspect':best[1],
                                'orb_deg':round(best[0],3),'retrograde':body['retrograde']})
    current.sort(key=lambda x:x['orb_deg'])
    events=[]
    if include_exact:
        step=timedelta(hours=3)
        times=[start]
        while times[-1]<end:
            times.append(min(times[-1]+step,end))
        frames=[positions(t,mode)['positions'] for t in times]
        for transit in BODIES:
            for natal_body,npos in ref['positions'].items():
                base=npos['longitude']
                for aname,angles in ASPECTS.items():
                    for angle in angles:
                        for i in range(len(times)-1):
                            x=aspect_residual(frames[i][transit]['longitude'],base,angle)
                            y=aspect_residual(frames[i+1][transit]['longitude'],base,angle)
                            # avoids confusing the -180/+180 discontinuity with an aspect
                            if abs(x)>5 or abs(y)>5:continue
                            if x*y>0:continue
                            when=exact_utc(transit,base,angle,mode,times[i],times[i+1])
                            if not start<=when<end:continue
                            if any(e['transiting']==transit and e['natal']==natal_body and e['aspect']==aname
                                   and abs((datetime.fromisoformat(e['time_utc'])-when).total_seconds())<60 for e in events):
                                continue
                            events.append({'transiting':transit,'natal':natal_body,'aspect':aname,
                                           'time_utc':when.isoformat(), 'time_local':when.astimezone(tz).isoformat(),
                                           'time_label':when.astimezone(tz).strftime('%H:%M'),
                                           'retrograde':positions(when,mode)['positions'][transit]['retrograde']})
        events.sort(key=lambda x:x['time_utc'])
    return {'date':day.isoformat(),'mode':mode,'display_timezone':display_timezone,
            'lunar':phase_info(sky),'events':events,'active':current,
            'calculation_method':'Swiss Ephemeris / Moshier analytical mode',
            'interpretations_are_symbolic':True}


def month_forecast(profile:dict, year:int, month:int, mode:str,
                   display_timezone:str='Europe/Paris',orb:float=2.0)->dict:
    if not (1900<=year<=2100 and 1<=month<=12):
        raise ValueError('Mois hors période prise en charge par cette version.')
    ref=natal(profile,mode)
    date0=date(year,month,1);date1=(date0.replace(day=28)+timedelta(days=4)).replace(day=1)
    d=date0;days=[]
    while d<date1:
        days.append(day_forecast(profile,d,mode,display_timezone,orb,True,ref))
        d+=timedelta(days=1)
    return {'year':year,'month':month,'mode':mode,'natal':ref,'days':days}
