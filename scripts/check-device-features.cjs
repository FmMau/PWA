const assert=require('node:assert/strict');
const fs=require('node:fs');
const server=require('./serve.cjs');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/TheMa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
(async()=>{
 await new Promise(r=>server.listen(4174,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const results=[];const pass=(name)=>{results.push(name);console.log('PASS '+name);};
 fs.mkdirSync('docs/evidencias',{recursive:true});
 try{
  const ctx=await browser.newContext({permissions:['geolocation','clipboard-read','clipboard-write'],geolocation:{latitude:24.1426,longitude:-110.3128,accuracy:12},viewport:{width:1200,height:1000}});
  await ctx.route('https://aquapaz-api-production.up.railway.app/**',r=>r.fulfill({json:[]}));
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4174/');
  await page.evaluate(async()=>{const a=await import('/src/services/apiService.js');await a.writeSetting('session',{token:'test-only',user:{id:7,nombre:'Prueba',colonia:'Centro'}});});
  await page.goto('http://127.0.0.1:4174/#/reportes');await page.locator('#share-report').waitFor();
  assert.equal(await page.locator('#geo-status').innerText(),'');
  pass('Sin solicitud automática de ubicación al abrir');
  await page.locator('#locate-report').click();await page.waitForFunction(()=>document.querySelector('#geo-status').textContent.includes('Ubicación agregada'));
  assert.match(await page.locator('#share-preview').innerText(),/24.14260, -110.31280/);
  pass('Permiso concedido: coordenadas y precisión en vista previa');
  await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});});
  await page.locator('#share-report').click();await page.waitForFunction(()=>document.querySelector('#share-status').textContent.includes('copiado'));
  assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/24.14260/);
  pass('Sin navigator.share: contenido verificado en portapapeles');
  await page.evaluate(()=>{window.copyCalls=0;Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:async()=>window.copyCalls++});Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Cancelado','AbortError');}});});
  await page.locator('#share-report').click();await page.waitForFunction(()=>document.querySelector('#share-status').textContent.includes('cancelado'));
  assert.equal(await page.evaluate(()=>window.copyCalls),0);pass('AbortError cancela sin copiar');
  await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});});await page.locator('#share-report').click();await page.waitForFunction(()=>window.copyCalls===1);pass('canShare false activa plan B');
  const cdp=await ctx.newCDPSession(page);const browserCdp=await browser.newBrowserCDPSession();const {browserContextIds}=await browserCdp.send('Target.getBrowserContexts');await browserCdp.send('Browser.setPermission',{browserContextId:browserContextIds[0],permission:{name:'geolocation'},setting:'denied',origin:'http://127.0.0.1:4174'});
  await page.locator('#clear-location').click();await page.locator('#locate-report').click();await page.waitForFunction(()=>document.querySelector('#geo-status').textContent.includes('Permiso denegado'));
  await page.locator('#report-address').fill('Calle Prueba 123, Centro');assert.match(await page.locator('#share-preview').innerText(),/Calle Prueba 123/);
  pass('Permiso denegado: dirección manual e instrucciones para habilitar');
  await browserCdp.send('Browser.setPermission',{browserContextId:browserContextIds[0],permission:{name:'geolocation'},setting:'granted',origin:'http://127.0.0.1:4174'});
  // Equivalente CDP de DevTools > Sensors > Location unavailable.
  await cdp.send('Emulation.setGeolocationOverride',{});
  await page.locator('#locate-report').click();await page.waitForFunction(()=>document.querySelector('#geo-status').textContent.includes('Ubicación no disponible'));
  pass('Sensors/CDP: ubicación no disponible (código 2)');
  await page.evaluate(()=>{Object.defineProperty(navigator.geolocation,'getCurrentPosition',{configurable:true,value:(ok,fail)=>fail({code:3})});});
  await page.locator('#locate-report').click();await page.waitForFunction(()=>document.querySelector('#geo-status').textContent.includes('tiempo de espera'));pass('Timeout código 3 con mensaje distinto');
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const cacheVersion=fs.readFileSync('sw.js','utf8').match(/const CACHE_VERSION = '([^']+)'/)[1];
  assert.ok((await page.evaluate(()=>caches.keys())).includes(cacheVersion));
  await ctx.setOffline(true);await page.reload();await page.locator('#share-report').waitFor();
  await page.locator('#report-address').fill('Dirección guardada sin red');await page.locator('#r-comment').fill('Fuga de prueba sin conexión');
  await page.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#outbox-list').textContent.includes('Dirección guardada sin red'));
  pass('Sin conexión: recarga de Reportes y guardado en IndexedDB con dirección');
  await ctx.setOffline(false);await page.evaluate(()=>{Object.defineProperty(navigator,'permissions',{configurable:true,value:undefined});});
  await page.evaluate(async()=>{const {permissionState}=await import('/src/services/geolocationService.js');window.permissionFallback=await permissionState();});
  assert.equal(await page.evaluate(()=>window.permissionFallback),null);pass('Permissions API ausente: alternativa no consultable');
  assert.deepEqual(errors,[]);pass('Sin errores JavaScript');
 }finally{fs.writeFileSync('docs/evidencias/resultados.txt',results.map(x=>'PASS '+x).join('\n')+'\n');await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});


