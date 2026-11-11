const assert=require('node:assert/strict');
const fs=require('node:fs');
const server=require('./serve.cjs');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/TheMa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
(async()=>{
 await new Promise(resolve=>server.listen(4179,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const origin='http://127.0.0.1:4179';
 let decision=null,confirmCalls=0,offline=false;
 async function mock(context){await context.route('https://aquapaz-api-production.up.railway.app/**',route=>{
  if(offline)return route.abort('internetdisconnected');
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path==='/api/reportes'&&req.method()==='POST')return route.fulfill({json:{id:42,client_id:req.postDataJSON().client_id}});
  if(path==='/api/reportes/13/confirmar'){confirmCalls++;decision=req.postDataJSON().decision;assert.equal(req.headers().authorization,'Bearer notification-test');return route.fulfill({json:{success:true,confirmaciones:1}});}
  if(path==='/api/notificaciones')return route.fulfill({json:[{id:51,tipo:'reporte',reporte_id:13,reporte_estado:'no_agua',titulo:'Reporte en Centro',mensaje:'Un vecino reportó falta de agua.',fecha:new Date().toISOString(),leido:!!decision,mi_decision:decision,puede_confirmar:!decision}]});
  return route.fulfill({json:[]});
 });}
 async function signIn(page){await page.locator('#login').waitFor();await page.evaluate(async()=>{const api=await import('/src/services/apiService.js');await api.writeSetting('session',{token:'notification-test',user:{id:7,nombre:'Prueba',colonia:'Centro'}});window.dispatchEvent(new Event('auth-change'));location.hash='/reportes';});await page.locator('#reporte-form').waitFor();}
 try{
  const ui=await browser.newContext({serviceWorkers:'block'});await mock(ui);
  await ui.addInitScript(()=>{
   delete window.PushManager;window.testPermission='default';window.permissionRequests=0;
   Object.defineProperty(Notification,'permission',{configurable:true,get:()=>window.testPermission});
   Object.defineProperty(Notification,'requestPermission',{configurable:true,value:async()=>{window.permissionRequests++;window.hadGesture=navigator.userActivation.isActive;window.testPermission='granted';return 'granted';}});
  });
  const p=await ui.newPage();await p.goto(origin);await signIn(p);assert.equal(await p.evaluate(()=>window.permissionRequests),0);
  await p.locator('#notify-btn').click();await p.waitForFunction(()=>document.querySelector('#notify-btn').dataset.permission==='granted');
  assert.equal(await p.evaluate(()=>window.permissionRequests),1);assert.equal(await p.evaluate(()=>window.hadGesture),true);
  assert.equal(await p.locator('#notification-permission-status').isVisible(),false);
  await p.evaluate(()=>{window.testPermission='denied';window.dispatchEvent(new Event('focus'));});
  assert.equal(await p.locator('#notify-btn').isDisabled(),true);assert.match(await p.locator('#notification-permission-status').innerText(),/permisos del sitio/);
  assert.doesNotMatch(await p.locator('body').innerText(),/\(granted\)|\(denied\)|\(default\)|Background Sync|Registros locales anteriores|Envíos confirmados por el servidor|Vista previa del contenido/);
  await ui.close();
  const context=await browser.newContext({permissions:['notifications'],viewport:{width:390,height:844}});await mock(context);
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/?sync=off');await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await signIn(page);
  await page.evaluate(()=>{window.nativeNotices=0;ServiceWorkerRegistration.prototype.showNotification=async()=>{window.nativeNotices++;};});
  fs.mkdirSync('test-results/report-notifications',{recursive:true});
  await page.screenshot({path:'test-results/report-notifications/report-mobile.png',fullPage:true});
  await page.locator('#r-comment').fill('Desde esta mañana no llega agua.');await page.locator('#reporte-form [type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#report-feedback').textContent.includes('se compartió'));
  assert.equal(await page.evaluate(()=>window.nativeNotices),0,'No obsolete local sync notification');
  await page.goto(origin+'/#/notificaciones?reporte=13');await page.locator('[data-decision=confirmar]').waitFor();
  await page.screenshot({path:'test-results/report-notifications/notices-mobile.png',fullPage:true});
  await page.locator('[data-decision=confirmar]').click();await page.locator('.notice-decision').waitFor();
  assert.equal(confirmCalls,1);assert.equal(await page.locator('[data-decision]').count(),0);
  await page.locator('[data-refresh]').click();await page.waitForFunction(()=>!document.querySelector('[data-refresh]').disabled);assert.equal(confirmCalls,1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.goto(origin+'/?sync=off#/reportes');await page.locator('#reporte-form').waitFor();
  offline=true;await context.setOffline(true);await page.reload();await page.locator('#reporte-form').waitFor();
  await page.locator('#r-comment').fill('Reporte guardado sin conexión.');await page.locator('#reporte-form [type=submit]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-pending]').hidden);
  assert.match(await page.locator('#report-feedback').innerText(),/guardado/);
  assert.equal(await page.evaluate(async()=>{const {records}=await import('/src/services/outboxService.js');return(await records('outbox')).length;}),1);
  offline=false;await context.setOffline(false);await page.waitForFunction(()=>document.querySelector('[data-pending]').hidden);
  assert.match(await page.locator('#report-feedback').innerText(),/se compartió/);
  assert.deepEqual(errors,[]);
  console.log('PASS permiso por clic, sin textos técnicos, reporte sencillo, confirmación desde avisos, sin duplicados, caché offline y reenvío automático sin avisos locales antiguos');
  await context.close();
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
