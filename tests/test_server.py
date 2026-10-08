import base64,io,json,math,sys,unittest,urllib.request,urllib.error,threading,platform
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'host'));import server
class Contract(unittest.TestCase):
 def valid(self):return {**{k:'テスト' for k in server.FIELDS},'reading':'いす','sentence_reading':'これはいすです。','template':'everyday','uncertain':False}
 def test_complete_entry(self):self.assertEqual(server.validate_entry(self.valid())['reading'],'いす')
 def test_model_cannot_choose_html_template(self):
  data=self.valid();data['template']='<script>'
  with self.assertRaises(server.ScanError):server.validate_entry(data)
 def test_uncertain_object_rejected(self):
  data=self.valid();data['uncertain']=True
  with self.assertRaises(server.ScanError):server.validate_entry(data)
 def test_bad_reading_rejected(self):
  data=self.valid();data['reading']='椅子'
  with self.assertRaises(server.ScanError):server.validate_entry(data)
 def test_missing_and_extra_fields(self):
  for d in ({**self.valid(),'html':'x'},{k:v for k,v in self.valid().items() if k!='word'}):
   with self.assertRaises(server.ScanError):server.validate_entry(d)
 def test_bounds_enforced(self):
  data=self.valid();data['word']='a'*41
  with self.assertRaises(server.ScanError):server.validate_entry(data)
 def photo(self,point=None):
  b=io.BytesIO();Image.new('RGB',(200,100),'red').save(b,format='PNG');return {'image':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode(),'target':point}
 def test_image_decoded(self):self.assertEqual(server.decode_photo(self.photo())[0].size,(200,100))
 def test_metadata_stripped(self):self.assertEqual(server.decode_photo(self.photo())[0].getexif(),{})
 def test_invalid_images(self):
  for p in [{},{'image':'file:///private/x'},{'image':'data:image/png;base64,bm90YW5pbWFnZQ=='}]:
   with self.assertRaises(server.ScanError):server.decode_photo(p)
 def test_invalid_target(self):
  for point in [{'x':-1,'y':.2},{'x':math.nan,'y':.2},{'x':True,'y':.2},{'x':.2}]:
   with self.assertRaises(server.ScanError):server.decode_photo(self.photo(point))
 def test_valid_target(self):self.assertEqual(server.decode_photo(self.photo({'x':.2,'y':.4}))[1],{'x':.2,'y':.4})
class HTTP(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.host=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler);threading.Thread(target=cls.host.serve_forever,daemon=True).start()
 @classmethod
 def tearDownClass(cls):cls.host.shutdown();cls.host.server_close()
 def request(self,path,data=None,headers={}):return urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{self.host.server_port}'+path,data=data,headers=headers),timeout=30)
 def test_health(self):self.assertEqual(json.load(self.request('/api/health'))['mode'],'local-preview')
 def test_reject_cross_origin(self):
  with self.assertRaises(urllib.error.HTTPError) as e:self.request('/api/scan',b'{}',{'Origin':'https://untrusted.example','Content-Type':'application/json'})
  self.assertEqual(e.exception.code,403)
 def test_invalid_host(self):
  with self.assertRaises(urllib.error.HTTPError) as e:self.request('/api/health',headers={'Host':'untrusted.example'})
  self.assertEqual(e.exception.code,403)
 def test_no_source_serving(self):
  with self.assertRaises(urllib.error.HTTPError) as e:self.request('/server.py')
  self.assertEqual(e.exception.code,404)
 @unittest.skipUnless(platform.system()=='Darwin','macOS speech only')
 def test_speech_returns_audio(self):
  with self.request('/api/speech?text=%E3%81%84%E3%81%99') as r:
   data=r.read();self.assertEqual(r.headers['Content-Type'],'audio/wav');self.assertTrue(data.startswith(b'RIFF'));self.assertGreater(len(data),1000)
if __name__=='__main__':unittest.main()
