#!/usr/bin/env python3
"""SYNCRO, demostracion academica local. No usar con datos reales."""
import base64, io, json, os, re, sqlite3, sys, threading
from collections import Counter, defaultdict
from itertools import product
from contextlib import contextmanager
from datetime import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

try:
    from openpyxl import load_workbook, Workbook
except ImportError:
    print("Falta openpyxl. Ejecuta: python -m pip install -r requirements.txt")
    sys.exit(1)

ROOT=Path(__file__).resolve().parent
WEB=ROOT/'web'
DB=ROOT/'data'/'syncro_demo.sqlite3'
PORT=int(os.environ.get('SYNCRO_PORT','8765'))
DAYS=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
COLS=['periodo','carrera','semestre','grupo','materia','docente','salon','campus','dia','inicio','fin','capacidad']
lock=threading.RLock()

@contextmanager
def connection():
    DB.parent.mkdir(parents=True,exist_ok=True)
    c=sqlite3.connect(str(DB), timeout=10)
    c.row_factory=sqlite3.Row
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()

def init():
    with connection() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS versions(id INTEGER PRIMARY KEY AUTOINCREMENT, period TEXT, published_at TEXT, label TEXT);
        CREATE TABLE IF NOT EXISTS sections(id INTEGER PRIMARY KEY AUTOINCREMENT, version_id INTEGER, period TEXT, career TEXT, semester INTEGER, group_name TEXT, subject TEXT, teacher TEXT, room TEXT, campus TEXT, day TEXT, start TEXT, end TEXT, capacity INTEGER);
        CREATE TABLE IF NOT EXISTS proposals(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, state TEXT, period TEXT, rows_json TEXT, summary TEXT);
        CREATE TABLE IF NOT EXISTS plans(id INTEGER PRIMARY KEY AUTOINCREMENT, student TEXT, version_id INTEGER, ids_json TEXT, saved_at TEXT, name TEXT DEFAULT 'Mi horario');
        CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, event TEXT, detail TEXT);
        ''')
        if 'name' not in [x['name'] for x in c.execute('PRAGMA table_info(plans)')]:
            c.execute("ALTER TABLE plans ADD COLUMN name TEXT DEFAULT 'Mi horario'")
        if not c.execute('SELECT 1 FROM versions').fetchone():
            sample=load_workbook(ROOT/'ejemplos'/'SYNCRO_ejemplo_valido.xlsx',data_only=True)
            rows,errs=parse_sheet(sample)
            assert not errs,errs
            publish_rows(c,rows,'2027-A','Versión inicial (datos ficticios)')
            c.execute('INSERT INTO audit(at,event,detail) VALUES(?,?,?)',(now(),'Inicio','Datos ficticios de demostración'))

def now(): return datetime.now().strftime('%d/%m/%Y %H:%M')

def minutes(t):
    if not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d',t):return -1
    h,m=t.split(':');return int(h)*60+int(m)

def normtime(x):
    if isinstance(x,datetime): return x.strftime('%H:%M')
    if hasattr(x,'hour') and hasattr(x,'minute'):return f'{x.hour:02d}:{x.minute:02d}'
    v=str(x or '').strip()
    if re.fullmatch(r'\d:\d\d',v):v='0'+v
    return v[:5]

def intersects(a,b):return minutes(a['inicio']) < minutes(b['fin']) and minutes(b['inicio']) < minutes(a['fin'])

def parse_sheet(wb):
    ws=wb.active; errors=[]; out=[]
    iterator=ws.iter_rows(values_only=True)
    try: heading=next(iterator)
    except StopIteration: return [],[{'fila':1,'problema':'El archivo está vacío'}]
    headers=[str(x or '').strip().lower().replace('ó','o').replace('í','i') for x in heading]
    missing=[x for x in COLS if x not in headers]
    if missing:return [],[{'fila':1,'problema':'Faltan columnas: '+', '.join(missing)}]
    idx={x:headers.index(x) for x in COLS}
    for r,raw in enumerate(iterator,start=2):
        if r>501:return [],[{'fila':1,'problema':'Máximo 500 filas por importación de demostración'}]
        if not any(z is not None and str(z).strip() for z in raw):continue
        obj={x:(raw[i] if i<len(raw) else '') for x,i in idx.items()}
        for x in COLS:
            if x in ['inicio','fin']:obj[x]=normtime(obj[x])
            elif x in ['capacidad','semestre']:
                try:obj[x]=int(obj[x])
                except (ValueError,TypeError):obj[x]=0
            else:obj[x]=str(obj[x] if obj[x] is not None else '').strip()
        bad=[]
        for x in ['periodo','carrera','grupo','materia','docente','salon','campus','dia']:
            if not obj[x]:bad.append('Falta '+x)
        if obj['dia'] not in DAYS:bad.append('Día inválido')
        if obj['semestre']<1 or obj['semestre']>15:bad.append('Semestre fuera de rango')
        if obj['capacidad']<1:bad.append('Capacidad debe ser positiva')
        if minutes(obj['inicio'])<0 or minutes(obj['fin'])<0 or minutes(obj['inicio'])>=minutes(obj['fin']):bad.append('Hora inicial/final inválida')
        if bad:
            for msg in bad:errors.append({'fila':r,'problema':msg})
        obj['_fila']=r;out.append(obj)
    if not out:errors.append({'fila':1,'problema':'El archivo no contiene horarios'})
    periods={o['periodo'] for o in out if o['periodo']}
    if len(periods)>1:errors.append({'fila':1,'problema':'Una publicación debe corresponder a un solo periodo'})
    # Consistencia de las propuestas: un docente, aula (por campus) o grupo no puede solaparse.
    for i,a in enumerate(out):
        if minutes(a['inicio'])<0 or minutes(a['fin'])<0:continue
        for b in out[i+1:]:
            if a['periodo']!=b['periodo'] or a['dia']!=b['dia'] or not intersects(a,b):continue
            clashes=[]
            if a['docente'].casefold()==b['docente'].casefold() and a['docente']:clashes.append('docente')
            if a['campus'].casefold()==b['campus'].casefold() and a['salon'].casefold()==b['salon'].casefold() and a['salon']:clashes.append('salón')
            if a['carrera'].casefold()==b['carrera'].casefold() and a['semestre']==b['semestre'] and a['grupo'].casefold()==b['grupo'].casefold():clashes.append('grupo')
            if clashes:errors.append({'fila':b['_fila'],'problema':f"Cruce de {', '.join(clashes)} con fila {a['_fila']} ({a['dia']} {a['inicio']}-{a['fin']})"})
    # Duplicados exactos representan una asignación errónea, no una segunda clase.
    seen=set()
    for row in out:
        key=tuple(str(row[k]).casefold() for k in COLS)
        if key in seen:errors.append({'fila':row['_fila'],'problema':'Asignación duplicada en el archivo'})
        seen.add(key)
    for row in out:row.pop('_fila',None)
    return out,errors

def get_rows_from_payload(payload):
    x=payload.get('contenido','')
    if not isinstance(x,str) or len(x)>5500000:raise ValueError('Archivo vacío o demasiado grande (máximo 3 MB).')
    raw=base64.b64decode(x,validate=True)
    if len(raw)>3*1024*1024:raise ValueError('Archivo demasiado grande (máximo 3 MB).')
    if not raw.startswith(b'PK'):raise ValueError('Solo se aceptan archivos .xlsx válidos.')
    wb=load_workbook(io.BytesIO(raw),read_only=True,data_only=True)
    return parse_sheet(wb)

def publish_rows(c,rows,period,label):
    v=c.execute('INSERT INTO versions(period,published_at,label) VALUES(?,?,?)',(period,now(),label)).lastrowid
    for a in rows:
        c.execute('''INSERT INTO sections(version_id,period,career,semester,group_name,subject,teacher,room,campus,day,start,end,capacity) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)''',(
            v,a['periodo'],a['carrera'],a['semestre'],a['grupo'],a['materia'],a['docente'],a['salon'],a['campus'],a['dia'],a['inicio'],a['fin'],a['capacidad']))
    return v

def official(c):
    v=c.execute('SELECT * FROM versions ORDER BY id DESC LIMIT 1').fetchone()
    rows=c.execute('SELECT * FROM sections WHERE version_id=? ORDER BY career,semester,day,start',(v['id'],)).fetchall() if v else []
    return dict(v) if v else None,[dict(x) for x in rows]

def section_key(row):
    """Una materia con varios días se escoge como sección completa."""
    return tuple(str(row[k]).strip().casefold() for k in ('career','semester','subject','group_name','teacher'))

def check_plan(rows,ids):
    byid={x['id']:x for x in rows}
    if len(ids)!=len(set(ids)) or any(i not in byid for i in ids):
        return [{'tipo':'error','texto':'La selección contiene registros repetidos o de otra versión.'}]
    chosen=[byid[i] for i in ids]
    issues=[]
    # Cuando una asignatura ocupa más de un día, todos los bloques deben elegirse juntos.
    groups=defaultdict(set)
    for r in rows:groups[section_key(r)].add(r['id'])
    for k in {section_key(x) for x in chosen}:
        if not groups[k].issubset(set(ids)):
            issues.append({'tipo':'error','texto':'Faltan sesiones de una asignatura; selecciona la sección completa.'})
    for i,a in enumerate(chosen):
        for b in chosen[i+1:]:
            same_subject=(a['career'].casefold(),a['subject'].casefold())==(b['career'].casefold(),b['subject'].casefold())
            if same_subject and section_key(a)!=section_key(b):
                issues.append({'tipo':'error','texto':f"Se eligieron dos grupos diferentes de {a['subject']}."})
            if a['day']!=b['day']:continue
            if minutes(a['start'])<minutes(b['end']) and minutes(b['start'])<minutes(a['end']):
                issues.append({'tipo':'error','texto':f"Cruce: {a['subject']} y {b['subject']} ({a['day']})."})
            elif a['campus'].casefold()!=b['campus'].casefold():
                if minutes(a['end'])<=minutes(b['start']):gap=minutes(b['start'])-minutes(a['end'])
                elif minutes(b['end'])<=minutes(a['start']):gap=minutes(a['start'])-minutes(b['end'])
                else:continue
                if gap<20:
                    issues.append({'tipo':'aviso','texto':f"Traslado: solo {gap} min entre {a['subject']} y {b['subject']} en campus distintos."})
    return [dict(x) for x in { (x['tipo'],x['texto']):x for x in issues }.values()]

def plan_metrics(rows):
    days={r['day'] for r in rows}
    total=sum(minutes(r['end'])-minutes(r['start']) for r in rows)
    gaps=0
    for day in days:
        dayrows=sorted([r for r in rows if r['day']==day],key=lambda r:r['start'])
        gaps+=sum(max(0,minutes(b['start'])-minutes(a['end'])) for a,b in zip(dayrows,dayrows[1:]))
    return {'dias':len(days),'minutos_clase':total,'minutos_libres':gaps}

def suggest_plans(rows,career,subjects,objective='libres'):
    if not isinstance(subjects,list) or not 1<=len(subjects)<=7 or any(not isinstance(x,str) for x in subjects):
        raise ValueError('Selecciona entre 1 y 7 nombres de asignaturas.')
    if objective not in ('libres','dias','temprano'):raise ValueError('Preferencia no reconocida.')
    options=[]
    for subject in subjects:
        groups=defaultdict(list)
        for r in rows:
            if r['career']==career and r['subject'].casefold()==subject.casefold():groups[section_key(r)].append(r)
        if not groups:return []
        options.append(list(groups.values())[:8])
    combinations=[]
    checked=0
    for combo in product(*options):
        checked+=1
        if checked>15000:break
        sections=[r for group in combo for r in group]
        if any(a['tipo']=='error' for a in check_plan(rows,[r['id'] for r in sections])):continue
        metrics=plan_metrics(sections)
        earliest=min(minutes(r['start']) for r in sections)
        score={'libres':(metrics['minutos_libres'],metrics['dias'],earliest),
               'dias':(metrics['dias'],metrics['minutos_libres'],earliest),
               'temprano':(earliest,metrics['minutos_libres'],metrics['dias'])}[objective]
        combinations.append((score,sections,metrics))
    combinations.sort(key=lambda x:x[0])
    return [{'ids':[r['id'] for r in combo],'metricas':metric,'advertencias':[x['texto'] for x in check_plan(rows,[r['id'] for r in combo]) if x['tipo']=='aviso']} for _,combo,metric in combinations[:3]]

def bootstrap(student='ALUMNO-DEMO'):
    with connection() as c:
        v,rows=official(c)
        prop=[dict(x) for x in c.execute('SELECT id,created_at,state,period,summary FROM proposals ORDER BY id DESC LIMIT 20')]
        vers=[dict(x) for x in c.execute('SELECT * FROM versions ORDER BY id DESC LIMIT 20')]
        recent=c.execute("""SELECT * FROM plans WHERE student=? AND name=? ORDER BY id DESC LIMIT 1""",(student,'Mi horario')).fetchone()
        saved=json.loads(recent['ids_json']) if recent and v and recent['version_id']==v['id'] else []
        drafts=[]
        for r in c.execute("""SELECT p.* FROM plans p INNER JOIN
            (SELECT student,name,MAX(id) latest_id FROM plans WHERE student=? GROUP BY student,name) x
            ON p.id=x.latest_id ORDER BY p.id DESC""",(student,)):
            drafts.append({'name':r['name'],'ids':json.loads(r['ids_json']),'version_id':r['version_id'],'saved_at':r['saved_at'],'vigente':bool(v and r['version_id']==v['id'])})
        all_drafts=c.execute("""SELECT p.* FROM plans p INNER JOIN
            (SELECT student,name,MAX(id) latest_id FROM plans GROUP BY student,name) x
            ON p.id=x.latest_id WHERE p.version_id=?""",(v['id'],)).fetchall()
        stats=Counter()
        for r in all_drafts:
            for sid in json.loads(r['ids_json']):stats[sid]+=1
        log=[dict(x) for x in c.execute('SELECT * FROM audit ORDER BY id DESC LIMIT 18')]
        return {'version':v,'sections':rows,'proposals':prop,'versions':vers,'saved':saved,
                'drafts':drafts,'stats':dict(stats),'stats_drafts':len(all_drafts),'audit':log,
                'days':DAYS,'demo':True,'student':student}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(WEB),**kwargs)
    def log_message(self,format,*args):sys.stderr.write('[SYNCRO] %s %s\n'%(self.log_date_time_string(),format%args))
    def send_json(self,data,status=200):
        b=json.dumps(data,ensure_ascii=False).encode('utf-8')
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
    def do_GET(self):
        p=urlparse(self.path).path
        if p=='/api/bootstrap':
            query=parse_qs(urlparse(self.path).query)
            student=query.get('student',['ALUMNO-DEMO'])[0]
            if student not in ('ALUMNO-DEMO','ALUMNO-DEMO-2','ALUMNO-DEMO-3'):student='ALUMNO-DEMO'
            return self.send_json(bootstrap(student))
        if p=='/api/version':
            try:
                vid=int(parse_qs(urlparse(self.path).query).get('id',['0'])[0])
                with connection() as c:
                    version=c.execute('SELECT * FROM versions WHERE id=?',(vid,)).fetchone()
                    if not version:return self.send_json({'error':'Versión no encontrada'},404)
                    rows=[dict(x) for x in c.execute('SELECT * FROM sections WHERE version_id=? ORDER BY career,day,start',(vid,))]
                return self.send_json({'version':dict(version),'sections':rows})
            except (ValueError,TypeError):return self.send_json({'error':'Identificador de versión inválido'},400)
        if p=='/api/health':return self.send_json({'ok':True,'proyecto':'SYNCRO demo'})
        if p in ['/api/template','/api/sample-valid','/api/sample-errors','/api/sample-extended']:
            names={'/api/template':'SYNCRO_plantilla.xlsx','/api/sample-valid':'SYNCRO_ejemplo_valido.xlsx','/api/sample-errors':'SYNCRO_ejemplo_con_errores.xlsx','/api/sample-extended':'SYNCRO_ejemplo_ampliado.xlsx'}
            t=ROOT/'ejemplos'/names[p]
            return self.binary_file(t,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        if p=='/':self.path='/index.html'
        return super().do_GET()
    def binary_file(self,path,ctype):
        data=Path(path).read_bytes();self.send_response(200);self.send_header('Content-Type',ctype);self.send_header('Content-Disposition',f'attachment; filename="{Path(path).name}"');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def do_POST(self):
        p=urlparse(self.path).path
        if p not in ['/api/validate','/api/import','/api/publish','/api/save-plan','/api/delete-plan','/api/cancel-proposal','/api/suggest','/api/reset']:
            return self.send_json({'error':'Ruta desconocida'},404)
        try:
            l=int(self.headers.get('Content-Length','0'))
            if l<0 or l>6000000:raise ValueError('Solicitud demasiado grande')
            payload=json.loads(self.rfile.read(l).decode('utf-8') or '{}')
            if not isinstance(payload,dict):raise ValueError('Solicitud inválida')
            with lock:
                if p in ['/api/validate','/api/import']:
                    rows,errors=get_rows_from_payload(payload)
                    result={'valido':not bool(errors),'errores':errors[:30],'total_errores':len(errors),'filas':len(rows),'muestra':rows[:6]}
                    if p=='/api/import' and not errors:
                        with connection() as c:
                            pid=c.execute('INSERT INTO proposals(created_at,state,period,rows_json,summary) VALUES(?,?,?,?,?)',(now(),'pendiente',rows[0]['periodo'],json.dumps(rows,ensure_ascii=False),f'{len(rows)} asignaciones validadas')).lastrowid
                            c.execute('INSERT INTO audit(at,event,detail) VALUES(?,?,?)',(now(),'Carga validada',f'Propuesta {pid}: {len(rows)} filas'))
                        result['propuesta_id']=pid
                    return self.send_json(result)
                if p=='/api/publish':
                    pid=int(payload.get('id',0))
                    with connection() as c:
                        proposal=c.execute('SELECT * FROM proposals WHERE id=? AND state=?',(pid,'pendiente')).fetchone()
                        if not proposal:raise ValueError('No existe propuesta pendiente válida.')
                        rows=json.loads(proposal['rows_json']);v=publish_rows(c,rows,proposal['period'],f'Publicación aprobada de propuesta {pid}')
                        c.execute('UPDATE proposals SET state=? WHERE id=?',('publicada',pid))
                        c.execute('INSERT INTO audit(at,event,detail) VALUES(?,?,?)',(now(),'Publicación',f'Versión {v}, propuesta {pid}'))
                    return self.send_json({'ok':True,'version_id':v,'mensaje':'Nueva versión oficial publicada. Se conservó historial.'})
                if p=='/api/suggest':
                    with connection() as c:_,rows=official(c)
                    return self.send_json({'alternativas':suggest_plans(rows,str(payload.get('career','')),payload.get('subjects',[]),str(payload.get('objective','libres')))})
                if p=='/api/cancel-proposal':
                    pid=int(payload.get('id',0))
                    with connection() as c:
                        found=c.execute('UPDATE proposals SET state=? WHERE id=? AND state=?',('cancelada',pid,'pendiente')).rowcount
                        if not found:raise ValueError('La propuesta no está pendiente.')
                        c.execute('INSERT INTO audit(at,event,detail) VALUES(?,?,?)',(now(),'Cancelación',f'Propuesta {pid}'))
                    return self.send_json({'ok':True,'mensaje':'Propuesta cancelada; no se afectó la versión publicada.'})
                if p=='/api/delete-plan':
                    student=str(payload.get('student','ALUMNO-DEMO'));name=str(payload.get('name',''))
                    if student not in ('ALUMNO-DEMO','ALUMNO-DEMO-2','ALUMNO-DEMO-3') or not name or len(name)>32:raise ValueError('Borrador no válido')
                    with connection() as c:
                        c.execute('DELETE FROM plans WHERE student=? AND name=?',(student,name))
                    return self.send_json({'ok':True,'mensaje':'Borrador eliminado.'})
                if p=='/api/save-plan':
                    ids=payload.get('ids',[])
                    student=str(payload.get('student','ALUMNO-DEMO'))
                    name=str(payload.get('name','Mi horario')).strip()
                    if student not in ('ALUMNO-DEMO','ALUMNO-DEMO-2','ALUMNO-DEMO-3'):raise ValueError('Perfil de demo no permitido')
                    if not 1<=len(name)<=32:raise ValueError('El nombre del borrador debe tener de 1 a 32 caracteres.')
                    if not isinstance(ids,list) or len(ids)>20 or any(not isinstance(i,int) for i in ids) or len(ids)!=len(set(ids)):raise ValueError('Selección inválida.')
                    with connection() as c:
                        v,rows=official(c)
                        issues=check_plan(rows,ids)
                        if any(e['tipo']=='error' for e in issues):return self.send_json({'ok':False,'avisos':issues},400)
                        c.execute('INSERT INTO plans(student,version_id,ids_json,saved_at,name) VALUES(?,?,?,?,?)',(student,v['id'],json.dumps(ids),now(),name))
                    return self.send_json({'ok':True,'avisos':issues,'mensaje':'Borrador personal guardado; no equivale a inscripción.'})
                if p=='/api/reset':
                    if self.client_address[0] not in ('127.0.0.1','::1'):raise ValueError('Reinicio solo desde la computadora local.')
                    if payload.get('confirmar')!='REINICIAR DEMO':raise ValueError('Falta confirmación explícita.')
                    if DB.exists():DB.unlink()
                    init()
                    return self.send_json({'ok':True})
        except (ValueError,KeyError,TypeError,sqlite3.Error) as e:
            return self.send_json({'error':str(e)},400)
        except Exception as e:
            return self.send_json({'error':'No se pudo procesar el archivo. Revisa que sea .xlsx y siga la plantilla.'},400)

def main():
    init()
    print(f'\nSYNCRO | demostración académica local: http://127.0.0.1:{PORT}\n',flush=True)
    ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()

if __name__=='__main__':main()
