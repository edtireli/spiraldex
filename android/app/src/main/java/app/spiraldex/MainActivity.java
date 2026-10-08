package app.spiraldex;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.*;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.Uri;
import android.provider.MediaStore;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.webkit.*;
import android.widget.*;
import android.text.InputType;
import androidx.core.content.FileProvider;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.cert.X509Certificate;
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import javax.net.ssl.*;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

/** A native phone shell around the selected Classic Dex UI. All model work stays on the Mac. */
public class MainActivity extends Activity {
 private static final String ORIGIN="https://appassets.androidplatform.net", KEY="spiraldex-pairing";
 private final ExecutorService io=Executors.newFixedThreadPool(3);
 private final Map<String,HttpsURLConnection> active=new ConcurrentHashMap<>();
 private WebView web; private TextToSpeech tts; private boolean voiceReady=false; private Uri cameraUri; private File cameraFile;
 private final Set<String> cancelled=ConcurrentHashMap.newKeySet();
 private android.content.SharedPreferences prefs;
 private SensorManager sensors; private Sensor tiltSensor;
 private boolean motionWanted=false,motionRegistered=false,resumed=false;
 private long lastMotionNanos=0;
 private final float[] motionMatrix=new float[9];
 private final SensorEventListener motionListener=new SensorEventListener(){
  @Override public void onAccuracyChanged(Sensor sensor,int accuracy){}
  @Override public void onSensorChanged(SensorEvent event){
   if(!resumed||!motionWanted||event.timestamp-lastMotionNanos<50_000_000L)return;
   lastMotionNanos=event.timestamp;SensorManager.getRotationMatrixFromVector(motionMatrix,event.values);
   int angle=getWindowManager().getDefaultDisplay().getRotation()*90;
   js("window.DexMotion?.receive("+Arrays.toString(motionMatrix)+","+angle+")");
  }
 };
 private void updateMotion(){
  boolean wanted=resumed&&motionWanted&&tiltSensor!=null;
  if(wanted&&!motionRegistered){lastMotionNanos=0;motionRegistered=sensors.registerListener(motionListener,tiltSensor,50_000);}
  else if(!wanted&&motionRegistered){sensors.unregisterListener(motionListener);motionRegistered=false;}
 }
 @Override public void onCreate(Bundle state){super.onCreate(state);prefs=getSharedPreferences("dex",MODE_PRIVATE);
  sensors=(SensorManager)getSystemService(SENSOR_SERVICE);
  if(sensors!=null){tiltSensor=sensors.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR);if(tiltSensor==null)tiltSensor=sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);}
  getWindow().setStatusBarColor(Color.rgb(185,40,61));getWindow().setNavigationBarColor(Color.rgb(148,29,52));
  getWindow().setFlags(android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN,android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN);
  if((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0)WebView.setWebContentsDebuggingEnabled(true);
  web=new WebView(this);web.setBackgroundColor(Color.rgb(185,40,61));setContentView(web);
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setMediaPlaybackRequiresUserGesture(true);
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !ORIGIN.equals(r.getUrl().getScheme()+"://"+r.getUrl().getHost());}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
    Uri u=r.getUrl();if(!"https".equals(u.getScheme())||!"appassets.androidplatform.net".equals(u.getHost()))return blocked();
    String path=u.getPath();if(path==null||path.contains("..")||!path.startsWith("/dex/"))return blocked();
    try{String mime=path.endsWith(".html")?"text/html":path.endsWith(".js")?"application/javascript":path.endsWith(".css")?"text/css":path.endsWith(".json")?"application/json":path.endsWith(".png")?"image/png":path.endsWith(".webp")?"image/webp":path.endsWith(".svg")?"image/svg+xml":"application/octet-stream";
     WebResourceResponse result=new WebResourceResponse(mime,"UTF-8",getAssets().open(path.substring(1)));
     Map<String,String> h=new HashMap<>();h.put("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'");result.setResponseHeaders(h);return result;
    }catch(IOException e){return blocked();}
   }
   @Override public void onPageFinished(WebView v,String url){js("document.body.classList.add('native-app')");}
  });
  web.addJavascriptInterface(new Bridge(),"DexNative");
  tts=new TextToSpeech(this,status->new Handler(Looper.getMainLooper()).post(()->{if(status==TextToSpeech.SUCCESS)configureVoice();}));
  web.loadUrl(ORIGIN+"/dex/01-classic.html");
 }
 private void configureVoice(){
  try{if(tts==null||tts.getVoices()==null)return;Voice best=null;for(Voice v:tts.getVoices())if(v.getLocale().getLanguage().equals("ja")&&!v.isNetworkConnectionRequired()&&!v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)&&(best==null||v.getQuality()>best.getQuality()))best=v;
   voiceReady=best!=null&&tts.setVoice(best)==TextToSpeech.SUCCESS;
  }catch(Exception e){voiceReady=false;}
 }
 private WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",403,"Forbidden",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
 private void js(String code){runOnUiThread(()->{if(!isFinishing()&&!isDestroyed())web.evaluateJavascript(code,null);});}
 private void notice(String s){js("window.dexNativeNotice("+JSONObject.quote(s)+")");}
 private void reply(String id,int status,String body){js("window.dexNativeResult("+JSONObject.quote(id)+","+status+","+JSONObject.quote(body)+")");}
 private class Bridge {
  @JavascriptInterface public boolean motionAvailable(){return tiltSensor!=null;}
  @JavascriptInterface public void motion(boolean enabled){runOnUiThread(()->{motionWanted=enabled;updateMotion();});}
  @JavascriptInterface public void camera(){runOnUiThread(()->takePhoto());}
  @JavascriptInterface public void photo(){runOnUiThread(()->{Intent pick=new Intent(Intent.ACTION_GET_CONTENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE);try{startActivityForResult(pick,21);}catch(ActivityNotFoundException e){notice("No photo picker is installed.");}});}
  @JavascriptInterface public void settings(){runOnUiThread(()->pairing());}
  @JavascriptInterface public void speak(String text,boolean slow){if(text==null||text.length()>150||!text.matches("[ぁ-ゖァ-ヶ一-龯ー\\s、。！？・]+"))return;runOnUiThread(()->{if(!voiceReady){new AlertDialog.Builder(MainActivity.this).setTitle("Japanese voice needed").setMessage("Install a Japanese device voice to hear words and kana offline.").setPositiveButton("Voice settings",(d,w)->{try{startActivity(new Intent("com.android.settings.TTS_SETTINGS"));}catch(Exception e){notice("Open Android settings → Text-to-speech.");}}).setNegativeButton("Later",null).show();return;}tts.setSpeechRate(slow?.65f:.85f);tts.speak(text,TextToSpeech.QUEUE_FLUSH,null,"dex-word");});}
  @JavascriptInterface public void cancel(String id){if(id==null||id.length()>24)return;cancelled.add(id);HttpsURLConnection c=active.remove(id);if(c!=null)c.disconnect();}
  @JavascriptInterface public void request(String id,String path,String body){if(id==null||!id.matches("[0-9]{1,16}")||!PairingAddress.allowsPath(path)||body==null||body.length()>9*1024*1024)return;io.submit(()->requestRemote(id,path,body));}
 }
 private void takePhoto(){
  try{File dir=new File(getCacheDir(),"camera");dir.mkdirs();cameraFile=new File(dir,"capture.jpg");cameraUri=FileProvider.getUriForFile(this,getPackageName()+".files",cameraFile);
   Intent camera=new Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT,cameraUri).addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);
   startActivityForResult(camera,20);
  }catch(Exception e){notice("Camera unavailable. Choose a photo instead.");}
 }
 @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(result!=RESULT_OK)return;Uri uri=req==20?cameraUri:req==21&&data!=null?data.getData():null;if(uri==null)return;
  io.submit(()->{try{ImageDecoder.Source source=ImageDecoder.createSource(getContentResolver(),uri);Bitmap bitmap=ImageDecoder.decodeBitmap(source,(decoder,info,src)->{int w=info.getSize().getWidth(),h=info.getSize().getHeight();float scale=Math.min(1f,1600f/Math.max(w,h));decoder.setTargetSize(Math.max(1,(int)(w*scale)),Math.max(1,(int)(h*scale)));decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);});ByteArrayOutputStream out=new ByteArrayOutputStream();bitmap.compress(Bitmap.CompressFormat.JPEG,88,out);bitmap.recycle();String photo="data:image/jpeg;base64,"+android.util.Base64.encodeToString(out.toByteArray(),android.util.Base64.NO_WRAP);js("window.dexAcceptPhoto("+JSONObject.quote(photo)+")");if(req==20&&cameraFile!=null)cameraFile.delete();}catch(Exception e){notice("This photo could not be opened. Try another JPEG or PNG.");}});
 }
 private void pairing(){
  LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);int pad=(int)(22*getResources().getDisplayMetrics().density);box.setPadding(pad,10,pad,10);
  TextView help=new TextView(this);help.setText("Use the HTTPS address, pairing token, and SHA-256 fingerprint shown by your Mac host. A configured gateway address may include a path, such as https://edspiral.duckdns.org:8443/spiraldex.");box.addView(help);
  EditText address=field(box,"HTTPS address, with optional gateway path",prefs.getString("address",""),false);
  EditText token=field(box,"Pairing token",secret("token"),true);
  EditText fingerprint=field(box,"Certificate SHA-256 fingerprint",prefs.getString("fingerprint",""),false);
  AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Pair your Mac").setView(box).setPositiveButton("Save",null).setNegativeButton("Cancel",null).create();dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
   address.setError(null);token.setError(null);fingerprint.setError(null);
   final String base;try{base=PairingAddress.normalize(address.getText().toString());}catch(IllegalArgumentException e){address.setError(e.getMessage());return;}
   String pin=fingerprint.getText().toString().replace(":","").replace(" ","").trim().toLowerCase(Locale.ROOT);String t=token.getText().toString().trim();
   if(t.length()<16){token.setError("Copy the full pairing token from your Mac (at least 16 characters).");return;}
   if(!pin.matches("[0-9a-f]{64}")){fingerprint.setError("Copy the 64-digit SHA-256 fingerprint from your Mac. Colons and spaces are allowed.");return;}
   try{prefs.edit().putString("address",base).putString("fingerprint",pin).putString("token",encrypt(t)).apply();dialog.dismiss();js("window.dexPairingChanged()");
   }catch(Exception e){token.setError("Pairing could not be saved securely. Please try again.");}
  }));dialog.show();
 }
 private EditText field(LinearLayout box,String hint,String value,boolean password){EditText e=new EditText(this);e.setHint(hint);e.setText(value);e.setSingleLine(true);e.setInputType(InputType.TYPE_CLASS_TEXT|(password?InputType.TYPE_TEXT_VARIATION_PASSWORD:InputType.TYPE_TEXT_VARIATION_URI));e.setTextSize(14);box.addView(e,new LinearLayout.LayoutParams(-1,-2));return e;}
 private SecretKey key()throws Exception{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(!ks.containsAlias(KEY)){KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");gen.init(new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());gen.generateKey();}return (SecretKey)ks.getKey(KEY,null);}
 private String encrypt(String text)throws Exception{Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());return Base64.getEncoder().encodeToString(c.getIV())+":"+Base64.getEncoder().encodeToString(c.doFinal(text.getBytes(StandardCharsets.UTF_8)));}
 private String secret(String name){try{String[] parts=prefs.getString(name,"").split(":");if(parts.length!=2)return "";Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.getDecoder().decode(parts[0])));return new String(c.doFinal(Base64.getDecoder().decode(parts[1])),StandardCharsets.UTF_8);}catch(Exception e){return "";}}
 private void requestRemote(String id,String path,String body){HttpsURLConnection c=null;int status=503;String result="{\"error\":\"The Mac could not be reached. Check pairing and keep it awake.\"}";
  try{String address=prefs.getString("address",""),token=secret("token"),pin=prefs.getString("fingerprint","");if(address.isEmpty()||token.isEmpty()||pin.isEmpty()){reply(id,428,"{\"error\":\"Pairing needed. Open Field station settings to link your Mac.\"}");return;}
   final String expected=pin;
   X509TrustManager trust=new X509TrustManager(){public X509Certificate[] getAcceptedIssuers(){return new X509Certificate[0];}public void checkClientTrusted(X509Certificate[] chain,String auth)throws java.security.cert.CertificateException{throw new java.security.cert.CertificateException();}public void checkServerTrusted(X509Certificate[] chain,String auth)throws java.security.cert.CertificateException{try{if(chain.length==0)throw new Exception();chain[0].checkValidity();byte[] hash=MessageDigest.getInstance("SHA-256").digest(chain[0].getEncoded());StringBuilder hex=new StringBuilder();for(byte b:hash)hex.append(String.format("%02x",b));if(!MessageDigest.isEqual(hex.toString().getBytes(StandardCharsets.US_ASCII),expected.getBytes(StandardCharsets.US_ASCII)))throw new Exception();}catch(Exception e){throw new java.security.cert.CertificateException("Pinned certificate does not match",e);}}};
   SSLContext tls=SSLContext.getInstance("TLS");tls.init(null,new TrustManager[]{trust},new SecureRandom());c=(HttpsURLConnection)new URL(PairingAddress.endpoint(address,path)).openConnection();c.setSSLSocketFactory(tls.getSocketFactory());c.setHostnameVerifier((hostname,session)->hostname.equalsIgnoreCase(URI.create(address).getHost()));c.setInstanceFollowRedirects(false);c.setConnectTimeout(10000);c.setReadTimeout(240000);c.setRequestProperty("Authorization","Bearer "+token);active.put(id,c);if(cancelled.remove(id))return;
   if(!body.isEmpty()){c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");byte[] bytes=body.getBytes(StandardCharsets.UTF_8);c.setFixedLengthStreamingMode(bytes.length);try(OutputStream out=c.getOutputStream()){out.write(bytes);}}
   status=c.getResponseCode();
   result=new JSONObject().put("error",status==404?"The address was reached, but the SpiralDex route was not found. Check the gateway path and its routing setup.":status==401||status==403?"The address was reached, but pairing was rejected. Check the pairing token.":"The address was reached, but did not return SpiralDex data. Check the gateway route and Mac host.").toString();
   try(InputStream in=status>=200&&status<300?c.getInputStream():c.getErrorStream()){if(in==null)throw new IOException();ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){if(out.size()+n>10*1024*1024)throw new IOException("Response too large");out.write(buffer,0,n);}String response=out.toString(StandardCharsets.UTF_8.name());new JSONObject(response);result=response;}catch(Exception e){if(status>=200&&status<300)status=502;}
  }catch(SSLException e){result="{\"error\":\"Certificate check failed. Verify the Mac fingerprint in pairing settings.\"}";}catch(Exception e){}finally{active.remove(id);if(c!=null)c.disconnect();}
  if(cancelled.remove(id))return;reply(id,status,result);
 }
 @Override protected void onPause(){resumed=false;updateMotion();super.onPause();if(tts!=null)tts.stop();web.onPause();}
 @Override protected void onResume(){super.onResume();resumed=true;if(web!=null){web.onResume();js("window.DexMotion?.recenter()");}updateMotion();configureVoice();}
 @Override protected void onDestroy(){resumed=false;updateMotion();for(HttpsURLConnection c:active.values())c.disconnect();io.shutdownNow();if(tts!=null)tts.shutdown();web.removeJavascriptInterface("DexNative");web.destroy();super.onDestroy();}
 @Override public void onBackPressed(){js("window.dexBack?.()");}
}
