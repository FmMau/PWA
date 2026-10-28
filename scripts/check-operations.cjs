const assert = require('node:assert/strict');
const fs = require('node:fs');
const server = require('./serve.cjs');
let chromium;
try { ({chromium} = require('playwright')); } catch { ({chromium} = require('C:/Users/TheMa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }

(async () => {
  await new Promise(resolve=>server.listen(4177,'127.0.0.1',resolve));
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const ctx = await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
    const now = Date.now(), stamp = offset => new Date(now+offset*3600000).toISOString();
    let role = 'gestor', failSummary = false, mapOffline = false, emptySummary = false;
    const report = {id:21,colonia:'Centro',tipo:'agua',estado:'no_agua',comentario:'Sin servicio desde ayer',estado_atencion:'nuevo',responsable_id:null,responsable_nombre:null,version_atencion:0,fecha:stamp(-12)};
    const active = {...report,id:22,colonia:'Otra',estado_atencion:'en_atencion',responsable_id:7,responsable_nombre:'María'};
    const queries = [];
    await ctx.route('https://aquapaz-api-production.up.railway.app/**', async route => {
      const url = new URL(route.request().url()), path = url.pathname;
      const reply = (json,status=200)=>route.fulfill({status,json});
      if (path.startsWith('/api/gestion/')) {
        if (role==='ciudadano') return reply({error:'Sin permiso'},403);
        if (path.endsWith('/contexto')) return reply({permisos:{consultar:true,gestionar:role==='gestor'},responsables:[{id:7,nombre:'María'}],colonias:['Centro','Otra']});
        if (path.endsWith('/resumen')) {
          if (failSummary) return reply({error:'No disponible'},503);
          return reply({resumen:emptySummary?{total:0,pendientes:0,sin_responsable:0,en_revision:0,en_atencion:0,resueltos:0,descartados:0}:{total:30,pendientes:15,sin_responsable:6,en_revision:4,en_atencion:8,resueltos:10,descartados:5},pendientes:emptySummary?[]:[report],en_atencion:emptySummary?[]:[active],actualizado:stamp(0)});
        }
        if (/\/\d+$/.test(path)) return reply({reporte:report,historial:[]});
        queries.push(Object.fromEntries(url.searchParams));
        const records = url.searchParams.get('estado_atencion')==='en_atencion' ? [active] : [report];
        return reply({reportes:records,resumen:{total:1,nuevos:1,en_proceso:0,resueltos:0,descartados:0},pagina:1,limite:20});
      }
      if (path==='/api/reportes/mapa') {
        if (mapOffline) return route.abort('internetdisconnected');
        return reply({colonias:[
          {colonia:'Centro',no_agua:3,baja_presion:2,tengo_agua:1,ultima_actualizacion:stamp(-1),expira:stamp(4)},
          {colonia:'Otra',no_agua:0,baja_presion:0,tengo_agua:4,ultima_actualizacion:stamp(-2),expira:stamp(2)},
          {colonia:'Vencida',no_agua:9,baja_presion:0,tengo_agua:0,ultima_actualizacion:stamp(-26),expira:stamp(-2)},
        ],ventana_horas:24,actualizado:stamp(0)});
      }
      return reply([report]);
    });
    await ctx.route('**/data/colonias.json',route=>route.fulfill({json:['Centro','Otra','Vencida','Sin Datos','Árboles']}));
    const page = await ctx.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:4177');await page.locator('#login').waitFor();
    await page.evaluate(async()=>{const a=await import('/src/services/apiService.js');await a.writeSetting('session',{token:'test',user:{id:7,nombre:'María',colonia:'Centro'}});window.dispatchEvent(new Event('auth-change'));location.hash='/';});
    await page.locator('.ops-stats .stat-value').first().waitFor();
    assert.deepEqual(await page.locator('.ops-stats .stat-value').allTextContents(),['15','6','4','8']);
    assert.equal(await page.locator('.sidebar-nav a').count(),6);
    assert.equal(await page.locator('.sidebar-nav a[href="#/mapa"]').count(),0);
    fs.mkdirSync('test-results',{recursive:true});
    await page.screenshot({path:'test-results/resumen-gestor.png',fullPage:true});
    await page.locator('.ops-stats').getByRole('link',{name:/Sin responsable.*6/}).click();
    await page.locator('.inbox-row').waitFor();
    assert.equal(queries.at(-1).pendientes,'true');assert.equal(queries.at(-1).responsable_id,'sin_asignar');
    assert.equal(await page.locator('[name=estado_atencion]').inputValue(),'pendientes');
    assert.equal(await page.locator('[name=responsable_id]').inputValue(),'sin_asignar');
    await page.reload();await page.locator('.inbox-row').waitFor();
    assert.equal(queries.at(-1).pendientes,'true');
    await page.goto('http://127.0.0.1:4177/#/');await page.locator('.ops-panels').waitFor();
    await page.getByRole('link',{name:/#21 · Centro/}).click();
    await page.locator('#attention-form').waitFor();
    assert.equal(await page.locator('#report-detail').evaluate(el=>el.open),true);
    await page.getByRole('button',{name:'Cerrar detalle',exact:true}).click();
    await page.goto('http://127.0.0.1:4177/#/mapa?colonia=Centro');
    await page.locator('.colony-card').waitFor();
    assert.match(page.url(),/#\/suministro\?colonia=Centro$/);
    assert.equal(await page.locator('.sidebar-nav [aria-current]').innerText(),'Suministro por colonia');
    assert.equal(await page.locator('.colony-card').count(),1);
    await page.getByRole('link',{name:'Ver reportes →',exact:true}).click();await page.locator('.inbox-row').waitFor();
    assert.equal(queries.at(-1).colonia,'Centro');
    await page.goto('http://127.0.0.1:4177/#/suministro');await page.locator('.colony-card').first().waitFor();
    assert.deepEqual(await page.locator('[data-colony-stats] .stat-value').allTextContents(),['2','1','1','2']);
    assert.equal(await page.locator('.colony-card').count(),3);
    await page.locator('[name=vista]').selectOption('incidencias');
    assert.equal(await page.locator('.colony-card').count(),1);
    assert.equal(await page.locator('.colony-card h3').innerText(),'Centro');
    await page.locator('[name=vista]').selectOption('vencidas');
    assert.equal(await page.locator('.colony-card h3').innerText(),'Vencida');
    assert.match(await page.locator('.colony-status').innerText(),/Requiere actualización/);
    await page.locator('[name=vista]').selectOption('sin_datos');
    assert.equal(await page.locator('.colony-card').count(),2);
    assert.match(await page.locator('.colony-card').first().innerText(),/No se puede determinar/);
    await page.locator('[name=q]').fill('arboles');
    assert.equal(await page.locator('.colony-card h3').innerText(),'Árboles');
    await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click();
    await page.screenshot({path:'test-results/suministro-colonias.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'test-results/suministro-colonias-mobile.png',fullPage:true});
    mapOffline=true;
    await page.getByRole('button',{name:'Actualizar suministro'}).click();
    await page.waitForFunction(()=>document.querySelector('[data-source]').textContent.includes('Copia guardada'));
    assert.equal(await page.locator('.colony-card').count(),3);
    await page.evaluate(future => { Date.now = () => future; }, now+5*3600000);
    await page.locator('[name=vista]').selectOption('incidencias');
    assert.deepEqual(await page.locator('[data-colony-stats] .stat-value').allTextContents(),['0','0','3','2']);
    assert.equal(await page.locator('.colony-card').count(),0);
    mapOffline=false;
    role='consulta';
    await page.goto('http://127.0.0.1:4177/#/');await page.locator('.ops-panels').waitFor();
    assert.deepEqual(await page.locator('.ops-stats .stat-value').allTextContents(),['15','6','4','8']);
    await page.screenshot({path:'test-results/resumen-gestor-mobile.png',fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    failSummary=true;
    await page.locator('[data-refresh]').click();
    await page.waitForFunction(()=>document.querySelector('[data-content]').textContent.includes('Resumen no disponible'));
    assert.equal(await page.locator('.ops-stats').count(),0);
    failSummary=false;emptySummary=true;
    await page.locator('[data-refresh]').click();await page.locator('.ops-stats').waitFor();
    assert.deepEqual(await page.locator('.ops-stats .stat-value').allTextContents(),['0','0','0','0']);
    role='ciudadano';
    await page.reload();await page.getByRole('heading',{name:'Resumen del suministro',exact:true}).waitFor();
    assert.equal(await page.locator('.ops-stats').count(),0);
    await page.goto('http://127.0.0.1:4177/#/suministro');await page.locator('.colony-card').first().waitFor();
    assert.equal(await page.getByRole('link',{name:'Ver reportes →',exact:true}).count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS resumen global, filtros y detalle enlazados, permisos, estados vacíos, error sin datos antiguos, ruta Mapa, búsqueda de colonias, vigencia, catálogo, caché y móvil');
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
