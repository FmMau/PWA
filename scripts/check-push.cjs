const assert = require('node:assert/strict');
const server = require('./serve.cjs');
let chromium;
try { ({chromium} = require('playwright')); }
catch { ({chromium} = require('C:/Users/TheMa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
(async () => {
  await new Promise(resolve => server.listen(4181,'127.0.0.1',resolve));
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const context = await browser.newContext({serviceWorkers:'block'});
    await context.route('https://aquapaz-api-production.up.railway.app/**', route => route.fulfill({json:[]}));
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4181/');
    await page.locator('#login').waitFor();
    const result = await page.evaluate(async () => {
      const api = await import('/src/services/apiService.js');
      await api.writeSetting('session',{token:'push-test',user:{id:7,colonia:'Centro'}});
      const requests = [], calls = [];
      let subscription = null;
      const key = new Uint8Array(65); key[0]=4;
      const publicKey = btoa(String.fromCharCode(...key)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      Object.defineProperty(Notification,'permission',{configurable:true,get:()=> 'granted'});
      navigator.serviceWorker.getRegistration = async () => ({active:true,pushManager:{
        async getSubscription(){return subscription;},
        async subscribe(options){
          calls.push({userVisibleOnly:options.userVisibleOnly,key:Array.from(options.applicationServerKey)});
          subscription = {endpoint:'https://fcm.googleapis.com/test',options:{applicationServerKey:key.buffer},
            toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'test',auth:'test'}};},
            async unsubscribe(){subscription=null;return true;}};
          return subscription;
        },
      }});
      window.fetch = async (url,options) => {
        requests.push({url,method:options.method,authorization:options.headers.Authorization,cache:options.cache});
        return new Response(JSON.stringify(url.endsWith('/public-key')?{publicKey}:{success:true}),{status:200});
      };
      const push = await import('/src/pwa/pushSubscription.js');
      await push.subscribeToPush(); await push.syncSubscription(); await push.unsubscribeFromPush();
      const {handlePush} = await import('/src/pwa/pushMessage.js');
      const notices=[];
      for(const data of [{json:()=>({title:'Pipa',body:'En camino',url:'#/mis-pedidos'})},
        {json(){throw Error('text');},text:()=> 'Aviso en texto'},
        {json:()=>({url:'https://evil.example/'})}]) {
        let lifetime;
        handlePush({data,waitUntil(promise){lifetime=promise;}},{async showNotification(title,options){notices.push({title,...options});}});
        await lifetime;
      }
      return {requests,calls,notices,unsubscribed:!subscription};
    });
    assert.equal(result.calls.length,1); assert.equal(result.calls[0].userVisibleOnly,true);
    assert.equal(result.calls[0].key.length,65); assert.equal(result.unsubscribed,true);
    assert.deepEqual(result.requests.map(r=>new URL(r.url).pathname),['/api/push/public-key','/api/push/subscribe','/api/push/subscribe','/api/push/unsubscribe']);
    for(const request of result.requests.slice(1)) {assert.equal(request.authorization,'Bearer push-test');assert.equal(request.cache,'no-store');}
    assert.equal(result.notices[0].data.url,'http://127.0.0.1:4181/#/mis-pedidos');
    assert.equal(result.notices[1].body,'Aviso en texto');
    assert.equal(result.notices[2].data.url,'http://127.0.0.1:4181/#/notificaciones');
    assert.equal(result.notices[0].icon,'http://127.0.0.1:4181/icons/manifest-icon-192.png');
    console.log('PASS suscripción VAPID, sesión, resincronización, baja, JSON/texto y rutas seguras de push');
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
