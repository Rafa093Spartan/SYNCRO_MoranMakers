"""Pruebas automatizadas del prototipo local SYNCRO.
Ejecutar desde la carpeta del proyecto: python -m unittest discover -s tests -v
"""
import base64
import io
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

class TestSyncro(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workdir=tempfile.TemporaryDirectory(prefix='syncro-test-')
        cls.old_db=server.DB
        server.DB=Path(cls.workdir.name)/'test.sqlite3'
        server.init()
        cls.httpd=ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        cls.port=cls.httpd.server_port
        cls.thread=threading.Thread(target=cls.httpd.serve_forever,daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.thread.join(timeout=3)
        server.DB=cls.old_db
        cls.workdir.cleanup()

    @classmethod
    def request(cls,route,payload=None):
        url=f'http://127.0.0.1:{cls.port}{route}'
        data=None if payload is None else json.dumps(payload).encode()
        req=urllib.request.Request(url,data=data,headers={'Content-Type':'application/json'} if data else {})
        try:
            with urllib.request.urlopen(req,timeout=4) as resp:return resp.status,json.loads(resp.read())
        except urllib.error.HTTPError as ex:return ex.code,json.loads(ex.read())

    @staticmethod
    def xlsx(name):
        raw=(ROOT/'ejemplos'/name).read_bytes()
        return {'contenido':base64.b64encode(raw).decode()}

    def test_01_initial_version_and_search_data(self):
        code,data=self.request('/api/bootstrap')
        self.assertEqual(code,200)
        self.assertEqual(data['version']['period'],'2027-A')
        self.assertGreaterEqual(len(data['sections']),10)
        self.assertTrue(any(x['subject']=='Bases de Datos' for x in data['sections']))

    def test_02_invalid_excel_blocked(self):
        payload=self.xlsx('SYNCRO_ejemplo_con_errores.xlsx')
        status,data=self.request('/api/validate',payload)
        self.assertEqual(status,200)
        self.assertFalse(data['valido'])
        self.assertTrue(any('Cruce' in x['problema'] for x in data['errores']))
        status,data=self.request('/api/import',payload)
        self.assertEqual(status,200)
        self.assertFalse(data['valido'])
        self.assertNotIn('propuesta_id',data)

    def test_03_valid_file_and_publication(self):
        p=self.xlsx('SYNCRO_ejemplo_valido.xlsx')
        status,val=self.request('/api/validate',p)
        self.assertEqual(status,200)
        self.assertTrue(val['valido'])
        status,imp=self.request('/api/import',p)
        self.assertTrue(imp['valido']);self.assertIn('propuesta_id',imp)
        _,before=self.request('/api/bootstrap')
        old_version=before['version']['id']
        self.assertEqual(before['version']['id'],1)
        status,pub=self.request('/api/publish',{'id':imp['propuesta_id']})
        self.assertEqual(status,200)
        self.assertTrue(pub['ok'])
        _,after=self.request('/api/bootstrap')
        self.assertEqual(after['version']['id'],old_version+1)
        self.assertEqual(after['versions'][1]['id'],old_version)
        status,second=self.request('/api/publish',{'id':imp['propuesta_id']})
        self.assertEqual(status,400)

    def test_04_plan_conflict_and_campus_warning(self):
        _,d=self.request('/api/bootstrap')
        ids={r['subject']:r['id'] for r in d['sections']}
        status,res=self.request('/api/save-plan',{'ids':[ids['Bases de Datos'],ids['Redes de Computadoras']]})
        self.assertEqual(status,400)
        self.assertTrue(any(x['tipo']=='error' for x in res['avisos']))
        status,res=self.request('/api/save-plan',{'ids':[ids['Bases de Datos'],ids['Desarrollo Web']]})
        self.assertEqual(status,200)
        self.assertTrue(res['ok'])
        self.assertTrue(any(x['tipo']=='aviso' for x in res['avisos']))
        _,after=self.request('/api/bootstrap')
        self.assertEqual(len(after['saved']),2)
        self.assertGreater(len(after['stats']),0)

    def test_05_file_validation_rules(self):
        wb=Workbook();s=wb.active;s.append(server.COLS)
        s.append(['2027-A','Carrera',3,'3A','A','Docente','Aula','Campus','Lunes','09:00','10:00',30])
        s.append(['2027-A','Carrera',3,'3B','B','Docente','Otro','Campus','Lunes','09:30','10:30',30])
        _,err=server.parse_sheet(wb)
        self.assertTrue(any('docente' in x['problema'] for x in err))
        self.assertFalse(server.intersects({'inicio':'08:00','fin':'09:00'},{'inicio':'09:00','fin':'10:00'}))

if __name__=='__main__':unittest.main()
