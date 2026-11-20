"""Casos complementarios de regresión para SYNCRO 2.0."""
import base64
import json
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import server
from openpyxl import Workbook,load_workbook

class TestVersion2(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory(prefix='syncro-v2-')
        cls.old_db=server.DB
        server.DB=Path(cls.tmp.name)/'demo.sqlite3'
        cls.httpd=ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        cls.port=cls.httpd.server_port
        cls.thread=threading.Thread(target=cls.httpd.serve_forever,daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown();cls.httpd.server_close();cls.thread.join(timeout=4)
        server.DB=cls.old_db;cls.tmp.cleanup()

    def setUp(self):
        if server.DB.exists():server.DB.unlink()
        server.init()

    def request(self,route,payload=None):
        req=urllib.request.Request(f'http://127.0.0.1:{self.port}{route}',data=None if payload is None else json.dumps(payload).encode('utf-8'),headers={'Content-Type':'application/json'} if payload is not None else {})
        try:
            with urllib.request.urlopen(req,timeout=10) as res:return res.status,json.load(res)
        except urllib.error.HTTPError as ex:return ex.code,json.load(ex)

    def excel(self,filename):
        return {'contenido':base64.b64encode((ROOT/'ejemplos'/filename).read_bytes()).decode('ascii')}

    def publish_extended(self):
        code,result=self.request('/api/import',self.excel('SYNCRO_ejemplo_ampliado.xlsx'))
        self.assertTrue(result.get('valido'),result)
        code,result=self.request('/api/publish',{'id':result['propuesta_id']})
        self.assertEqual(code,200)
        return self.request('/api/bootstrap')[1]

    def test_01_extended_excel_valid_and_grouped(self):
        ws=load_workbook(ROOT/'ejemplos'/'SYNCRO_ejemplo_ampliado.xlsx',read_only=True,data_only=True)
        rows,err=server.parse_sheet(ws)
        self.assertFalse(err,err)
        self.assertEqual(len(rows),18)
        data=self.publish_extended()
        self.assertEqual(len(data['sections']),18)
        base=[r for r in data['sections'] if r['subject']=='Bases de Datos' and r['group_name']=='5A']
        self.assertEqual(len(base),2)

    def test_02_multiday_sections_saved_together(self):
        d=self.publish_extended()
        base=[r['id'] for r in d['sections'] if r['subject']=='Bases de Datos' and r['group_name']=='5A']
        self.assertEqual(len(base),2)
        status,issue=self.request('/api/save-plan',{'ids':base[:1],'name':'Plan multi','student':'ALUMNO-DEMO'})
        self.assertEqual(status,400)
        self.assertTrue(any('Faltan sesiones' in a['texto'] for a in issue['avisos']))
        status,ok=self.request('/api/save-plan',{'ids':base,'name':'Plan multi','student':'ALUMNO-DEMO'})
        self.assertEqual(status,200)
        _,after=self.request('/api/bootstrap')
        self.assertTrue(any(x['name']=='Plan multi' and x['ids']==base for x in after['drafts']))

    def test_03_generator_finds_actual_conflict_free_combinations(self):
        d=self.publish_extended()
        code,result=self.request('/api/suggest',{'career':'Ingeniería de Software (DEMO)','subjects':['Bases de Datos','Redes de Computadoras'],'objective':'libres'})
        self.assertEqual(code,200)
        self.assertGreaterEqual(len(result['alternativas']),1)
        for a in result['alternativas']:
            self.assertFalse(any(x['tipo']=='error' for x in server.check_plan(d['sections'],a['ids'])))
        code,impossible=self.request('/api/suggest',{'career':'Ingeniería de Software (DEMO)','subjects':['Materia inexistente'],'objective':'libres'})
        self.assertEqual(impossible['alternativas'],[])

    def test_04_profiles_and_drafts_are_independent(self):
        d=self.publish_extended()
        single=[r['id'] for r in d['sections'] if r['subject']=='Pruebas de Software']
        status,_=self.request('/api/save-plan',{'student':'ALUMNO-DEMO','name':'Mañana','ids':single})
        self.assertEqual(status,200)
        status,_=self.request('/api/save-plan',{'student':'ALUMNO-DEMO-2','name':'Tarde','ids':single})
        self.assertEqual(status,200)
        self.assertEqual(len(self.request('/api/bootstrap?student=ALUMNO-DEMO')[1]['drafts']),1)
        self.assertEqual(len(self.request('/api/bootstrap?student=ALUMNO-DEMO-2')[1]['drafts']),1)
        self.assertEqual(len(self.request('/api/bootstrap?student=ALUMNO-DEMO-3')[1]['drafts']),0)
        code,delres=self.request('/api/delete-plan',{'student':'ALUMNO-DEMO','name':'Mañana'})
        self.assertEqual(code,200)
        self.assertEqual(len(self.request('/api/bootstrap?student=ALUMNO-DEMO')[1]['drafts']),0)
        self.assertEqual(self.request('/api/bootstrap')[1]['stats_drafts'],1)

    def test_05_old_plans_marked_stale_after_publication(self):
        d=self.publish_extended()
        sid=next(r['id'] for r in d['sections'] if r['subject']=='Pruebas de Software')
        self.request('/api/save-plan',{'student':'ALUMNO-DEMO','name':'Mi horario','ids':[sid]})
        second=self.publish_extended()
        self.assertGreater(second['version']['id'],d['version']['id'])
        self.assertEqual(second['saved'],[])
        self.assertTrue(any(x['name']=='Mi horario' and not x['vigente'] for x in second['drafts']))

    def test_06_cancel_and_reject_cancelled_publication(self):
        _,created=self.request('/api/import',self.excel('SYNCRO_ejemplo_valido.xlsx'))
        pid=created['propuesta_id']
        status,_=self.request('/api/cancel-proposal',{'id':pid})
        self.assertEqual(status,200)
        status,_=self.request('/api/publish',{'id':pid})
        self.assertEqual(status,400)
        _,d=self.request('/api/bootstrap')
        self.assertEqual(d['proposals'][0]['state'],'cancelada')
        self.assertTrue(any(x['event']=='Cancelación' for x in d['audit']))

    def test_07_version_lookup_and_error(self):
        d=self.publish_extended()
        status,v=self.request('/api/version?id=1')
        self.assertEqual(status,200)
        self.assertEqual(len(v['sections']),12)
        self.assertEqual(v['version']['id'],1)
        status,_=self.request('/api/version?id=9999')
        self.assertEqual(status,404)

    def test_08_duplicate_row_rejected(self):
        w=Workbook();ws=w.active;ws.append(server.COLS)
        data=['2027-A','Software',5,'5A','BD','Profe','A-101','Centro','Lunes','08:00','10:00',30]
        ws.append(data);ws.append(data)
        _,errors=server.parse_sheet(w)
        self.assertTrue(any('duplicada' in x['problema'] for x in errors))

    def test_09_invalid_payload_and_student(self):
        status,_=self.request('/api/save-plan',{'ids':[9999999],'student':'ALUMNO-DEMO','name':'Mi horario'})
        self.assertEqual(status,400)
        status,_=self.request('/api/save-plan',{'ids':[],'student':'DESCONOCIDO','name':'Mi horario'})
        self.assertEqual(status,400)
        status,_=self.request('/api/suggest',{'subjects':[],'career':'Software'})
        self.assertEqual(status,400)

if __name__=='__main__':unittest.main()
