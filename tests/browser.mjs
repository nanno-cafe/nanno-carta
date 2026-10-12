import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(path.join(process.argv[2],'index.mjs')).href);
const base='http://127.0.0.1:8791';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','8791','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://menu-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'test-public-key'},stdio:'pipe',windowsHide:true});
let serverLogs='';server.stdout.on('data',x=>serverLogs+=x);server.stderr.on('data',x=>serverLogs+=x);
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];fs.mkdirSync('tests/screenshots',{recursive:true});
const user={id:'11111111-1111-1111-1111-111111111111',email:'owner@example.test',role:'authenticated'};
let settings={id:true,theme:'classic',animations_enabled:true,whatsapp:'5491123456789',address:'Dirección de prueba 123',hours:'Lunes a sábado · 8 a 20 h',intro:'Elegí algo rico y pasá a buscarlo. Nosotros ponemos el café.',accepting_orders:true};
let categories=[{id:'cat1',name:'Cafecitos',position:0,active:true}];
let products=[{id:'p1',category_id:'cat1',name:'Cappuccino',description:'Café con leche cremosa.',price_cents:350000,image_url:null,position:0,active:true,available:true,featured:true}];
let admin=true,failSave=false,failCatalog=false,uploads=0;
async function mock(page,{signedIn=false}={}){
 page.on('pageerror',e=>errors.push(e.message));
 if(signedIn)await page.addInitScript(user=>{const access_token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'}))+'.fake';localStorage.setItem('nanno-menu-auth',JSON.stringify({access_token,refresh_token:'test-refresh',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,user}));},{...user});
 await page.route('https://menu-test.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());let status=200,result;
  const body=req.headers()['content-type']?.includes('json')?req.postDataJSON():null;
  if(failCatalog&&req.method()==='GET'&&url.pathname.includes('/rest/')){status=503;result={message:'test offline'};}
  else if(url.pathname.endsWith('/menu_is_admin'))result=admin;
  else if(url.pathname.endsWith('/menu_settings')){if(req.method()==='PATCH'){if(failSave){status=403;result={code:'42501',message:'denied'};}else{Object.assign(settings,body);result=[{id:true}];}}else result=settings;}
  else if(url.pathname.endsWith('/menu_categories')){if(req.method()==='POST'){const value={id:'cat'+(categories.length+1),...body};categories.push(value);result=[{id:value.id}];}else if(req.method()==='PATCH'){Object.assign(categories.find(c=>'eq.'+c.id===url.searchParams.get('id')),body);result=[{id:true}];}else result=categories;}
  else if(url.pathname.endsWith('/menu_products')){if(req.method()==='POST'){const value={id:'p'+(products.length+1),...body};products.push(value);result=[{id:value.id}];}else if(req.method()==='PATCH'){Object.assign(products.find(p=>'eq.'+p.id===url.searchParams.get('id')),body);result=[{id:true}];}else result=products;}
  else if(url.pathname.includes('/storage/v1/object/menu-images/')){uploads++;result={Key:'menu-images/products/test.png',Id:'test'};}
  else if(url.pathname.endsWith('/token')){if(body.password==='wrong'){status=400;result={message:'Invalid login credentials'};}else{const access_token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64')+'.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64')+'.fake';result={access_token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,user};}}
  else if(url.pathname.endsWith('/logout'))result={};
  else if(url.pathname.endsWith('/user'))result=user;
  else {status=400;result={message:'Unhandled mock '+url.pathname};}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result)});
 });
}
async function noOverflow(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');}
try{
 for(let i=0;i<80;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));if(i===79)throw new Error(serverLogs);}
 const demo=await browser.newPage({viewport:{width:1280,height:1000}});await mock(demo);await demo.goto(base+'/?demo=1');await demo.locator('.product-card').first().waitFor();
 await demo.waitForFunction(()=>[...document.querySelectorAll('.product-card')].every(x=>getComputedStyle(x).opacity==='1'));
 await demo.screenshot({path:'tests/screenshots/menu-classic-desktop.png',fullPage:true});
 await demo.setViewportSize({width:390,height:844});await noOverflow(demo);
 for(const theme of ['classic','halloween','christmas']){await demo.locator('#demoTheme').selectOption(theme);await demo.screenshot({path:`tests/screenshots/menu-${theme}-mobile.png`,fullPage:true});}
 assert.equal(await demo.locator('.snow').count(),44);await demo.emulateMedia({reducedMotion:'reduce'});await demo.waitForFunction(()=>document.querySelectorAll('.snow').length===0);await demo.emulateMedia({reducedMotion:'no-preference'});
 await demo.locator('.add-button').first().click();await demo.locator('#productForm button[type=submit]').click();await demo.locator('#cartDock').click();assert.equal(await demo.locator('#checkoutButton').isDisabled(),true);await demo.close();
 const page=await browser.newPage({viewport:{width:390,height:844}});await mock(page);await page.goto(base);await page.locator('.add-button').click();await page.locator('[name=quantity]').fill('2');await page.locator('[name=note]').fill('Sin azúcar & bien caliente');await page.locator('#productForm button[type=submit]').click();
 await page.reload();await page.locator('#cartDock').click();assert.match(await page.locator('#cartTotal').textContent(),/7.000/);await page.locator('[name=customer]').fill('Sofía');await page.locator('[name=pickup]').fill('17:30');await page.locator('#checkoutButton').click();await page.locator('#whatsappLink').waitFor();const url=new URL(await page.locator('#whatsappLink').getAttribute('href'));assert.equal(url.pathname,'/5491123456789');assert.match(url.searchParams.get('text'),/2 × Cappuccino/);assert.match(url.searchParams.get('text'),/Sofía/);
 products[0].price_cents=400000;await page.locator('#checkoutButton').click();await page.waitForFunction(()=>document.querySelector('#checkoutStatus').textContent.includes('La carta cambió'));assert.equal(await page.locator('#whatsappLink').isVisible(),false);assert.match(await page.locator('#cartTotal').textContent(),/8.000/);
 await page.locator('#checkoutButton').click();await page.locator('#whatsappLink').waitFor();await page.locator('[name=notes]').fill('Nueva aclaración');assert.equal(await page.locator('#whatsappLink').isVisible(),false);
 products[0].available=false;await page.locator('#checkoutButton').click();await page.waitForFunction(()=>document.querySelector('#checkoutStatus').textContent.includes('La carta cambió'));assert.equal(await page.locator('.cart-line').count(),0);products[0].available=true;
 await page.locator('#cartDialog [data-close]').click();await page.setViewportSize({width:320,height:740});await noOverflow(page);await page.reload();await page.locator('.product-card').waitFor();await page.locator('#search').fill('inexistente');assert.equal(await page.locator('.product-card').count(),0);await page.locator('#search').fill('');
 const panel=await browser.newPage({viewport:{width:1200,height:900}});await mock(panel);await panel.goto(base+'/admin.html');await panel.locator('#loginForm [name=email]').fill('owner@example.test');await panel.locator('#loginForm [name=password]').fill('wrong');await panel.locator('#loginForm button').click();await panel.waitForFunction(()=>document.querySelector('#loginStatus').textContent.includes('tu email'));await panel.locator('#loginForm [name=password]').fill('test-password');await panel.locator('#loginForm button').click();await panel.locator('#dashboard').waitFor();
 await panel.locator('[data-tab=categories]').click();await panel.locator('#newCategory').click();await panel.locator('#categoryForm [name=name]').fill('Algo dulce');await panel.locator('#categoryForm button[type=submit]').click();await panel.waitForFunction(()=>!document.querySelector('#categoryDialog').open);assert.equal(categories.length,2);
 await panel.locator('[data-tab=products]').click();await panel.locator('#newProduct').click();await panel.locator('#productForm [name=name]').fill('Croissant <img onerror=alert(1)>');await panel.locator('#productForm [name=price]').fill('2500,50');await panel.locator('#productForm [name=category_id]').selectOption('cat2');
 await panel.locator('#productForm [name=photo]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=','base64')});await panel.locator('#productForm button[type=submit]').click();await panel.waitForFunction(()=>!document.querySelector('#productDialog').open);assert.equal(products[1].price_cents,250050);assert.equal(uploads,1);assert.equal(await panel.locator('#adminProducts strong img').count(),0);
 await panel.locator('[data-product=p2]').click();await panel.locator('#productForm [name=available]').uncheck();await panel.locator('#productForm button[type=submit]').click();await panel.waitForFunction(()=>!document.querySelector('#productDialog').open);assert.equal(products[1].available,false);
 await panel.locator('[data-tab=settings]').click();await panel.locator('[name=theme][value=halloween]').check();assert.equal(settings.theme,'classic');failSave=true;await panel.locator('#settingsForm button[type=submit]').click();await panel.waitForFunction(()=>document.querySelector('#settingsStatus').textContent.includes('permiso'));assert.equal(settings.theme,'classic');failSave=false;
 await panel.locator('[name=theme][value=christmas]').check();await panel.locator('#settingsForm button[type=submit]').click();await panel.waitForFunction(()=>document.querySelector('#settingsStatus').textContent.includes('publicados'));assert.equal(settings.theme,'christmas');await panel.screenshot({path:'tests/screenshots/admin-design.png',fullPage:true});
 await panel.setViewportSize({width:320,height:740});await noOverflow(panel);await panel.screenshot({path:'tests/screenshots/admin-mobile.png',fullPage:true});
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.theme==='christmas');assert.equal(await page.locator('.snow').count(),44);assert.equal(await page.locator('.product-copy img').count(),0);
 failCatalog=true;await page.reload();await page.locator('#retry').waitFor();assert.match(await page.locator('#menuStatus').textContent(),/No pudimos/);failCatalog=false;await page.locator('#retry').click();await page.locator('.product-card').first().waitFor();
 admin=false;const stranger=await browser.newPage();await mock(stranger,{signedIn:true});await stranger.goto(base+'/admin.html');await stranger.waitForFunction(()=>document.querySelector('#loginStatus').textContent.includes('no tiene acceso'));assert.equal(await stranger.locator('#dashboard').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('OK: demo themes/reduced motion, mobile 320px, cart persistence/quantities/notes, WhatsApp message, stale price/stock recheck, search, admin categories/products/photo upload/availability, theme preview/save/error, nonadmin denial, network recovery, safe rendering. No real requests/orders sent.');
}finally{await browser.close();server.kill();}
