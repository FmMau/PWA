const assert=require('node:assert/strict');
const server=require('./serve.cjs');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/TheMa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
(async()=>{
 await new Promise(resolve=>server.listen(4175,'127.0.0.1',resolve));const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('https://aquapaz-api-production.up.railway.app/**',route=>route.fulfill({json:[]}));
  await context.addInitScript(()=>{window.locationRequests=0;window.locationFailure=null;Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,failure){window.locationRequests++;if(window.locationFailure)return failure({code:window.locationFailure});success({coords:{latitude:24.12,longitude:-110.32,accuracy:20},timestamp:Date.now()});}}});});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4175');await page.locator('#login').waitFor();
  await page.evaluate(async()=>{const api=await import('/src/services/apiService.js');await api.writeSetting('session',{token:'device-test',user:{id:7,nombre:'Prueba',colonia:'Centro'}});location.hash='/pipas';});
  await page.locator('[data-locate-delivery]').waitFor();assert.equal(await page.evaluate(()=>window.locationRequests),0);
  assert.equal(await page.locator('#delivery-coordinates').evaluate(element=>element.open),false);
  await page.locator('[data-locate-delivery]').click();await page.waitForFunction(()=>document.querySelector('[name=latitud]').value==='24.12');
  assert.equal(await page.locator('[name=longitud]').inputValue(),'-110.32');
  for(const [code,message]of [[1,/Permiso denegado/],[2,/Ubicación no disponible/],[3,/tiempo de espera/]]){
   await page.evaluate(value=>window.locationFailure=value,code);const previous=await page.locator('[data-feedback]').innerText();await page.locator('[data-locate-delivery]').click();await page.waitForFunction(text=>document.querySelector('[data-feedback]').textContent!==text,previous);assert.match(await page.locator('[data-feedback]').innerText(),message);
  }
  await page.locator('#delivery-coordinates summary').click();assert.equal(await page.locator('[name=latitud]').isVisible(),true);
  await page.locator('[name=latitud]').fill('24.13');assert.equal(await page.locator('[name=latitud]').inputValue(),'24.13');
  assert.doesNotMatch(await page.locator('body').innerText(),/Solicitudes locales anteriores|centavos|versión/);
  await page.goto('http://127.0.0.1:4175/#/reportes');await page.locator('#reporte-form').waitFor();
  assert.equal(await page.locator('#locate-report,#share-report,#share-preview').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS GPS solo por clic en Pipas, permisos denegados, señal y timeout, punto manual y Reportes sin controles de actividades antiguas');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
