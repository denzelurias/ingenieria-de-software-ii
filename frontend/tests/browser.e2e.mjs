// Pruebas de navegador con CDP nativo: no instalan paquetes ni usan la BD local.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createTestApp } from '../../backend/tests/helpers/testApp.js';

const browserFlag = process.argv.indexOf('--browser');
const browserPath = browserFlag >= 0 ? process.argv[browserFlag + 1] : [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].find(candidate => fs.existsSync(candidate));
if (!browserPath || !fs.existsSync(browserPath)) throw new Error('No se encontró un navegador Chromium. Usa --browser seguido de su ruta.');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'emprendebuho-e2e-'));
const profile = path.join(directory, 'browser'); const downloads = path.join(directory, 'downloads');
fs.mkdirSync(profile); fs.mkdirSync(downloads);
const fixture = createTestApp();
let vite; let browser; let socket; let apiServer;
const failures = []; const traffic = []; const pending = new Map(); let sequence = 0;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP agotó el tiempo: ${method}`)); }, 15000);
  pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const wait = async expression => {
  for (let attempt = 0; attempt < 150; attempt++) { if (await evaluate(expression)) return; await pause(100); }
  throw new Error(`No se cumplió: ${expression}\n${await evaluate('document.body.innerText')}`);
};
const click = async (text, scope = 'main') => {
  const element = `([...document.querySelector(${JSON.stringify(scope)})?.querySelectorAll('button,a')||[]].find(item=>item.textContent.trim()===${JSON.stringify(text)}))`;
  await wait(`${element} && !${element}.disabled`);
  await evaluate(`${element}.click()`);
};
const clickSelector = async selector => { await wait(`document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`); return evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); };
const fill = async (selector, value) => {
  await wait(`document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`);
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await send('Input.insertText', { text: value });
  await wait(`document.querySelector(${JSON.stringify(selector)})?.value===${JSON.stringify(value)}`);
};
const select = (selector, value) => evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}); el.value=${JSON.stringify(value)}; el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
const time = (selector, value) => evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
const upload = selector => evaluate(`(()=>{const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/x1cAAAAASUVORK5CYII='),c=>c.charCodeAt(0));const transfer=new DataTransfer();transfer.items.add(new File([bytes],'prueba.png',{type:'image/png'}));const el=document.querySelector(${JSON.stringify(selector)});el.files=transfer.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
const api = path => evaluate(`fetch('/api'+${JSON.stringify(path)},{headers:{Authorization:'Bearer '+(localStorage.getItem('emprendebuho_token')||'')}}).then(response=>response.json())`);
const apiCondition = (apiPath, predicate) => `fetch('/api'+${JSON.stringify(apiPath)},{headers:{Authorization:'Bearer '+(localStorage.getItem('emprendebuho_token')||'')}}).then(response=>response.json()).then(result=>${predicate})`;
const articleAction = async (text, buttonText) => {
  await wait(`[...document.querySelectorAll('main article')].some(item=>item.textContent.includes(${JSON.stringify(text)})&&[...item.querySelectorAll('button')].some(button=>button.textContent.trim()===${JSON.stringify(buttonText)}&&!button.disabled))`);
  return evaluate(`(()=>{const article=[...document.querySelectorAll('main article')].find(item=>item.textContent.includes(${JSON.stringify(text)}));const button=[...article.querySelectorAll('button')].find(item=>item.textContent.trim()===${JSON.stringify(buttonText)});button.click();})()`);
};
const check = label => console.log(`✓ E2E: ${label}`);
let origin;
const go = async route => {
  await send('Page.navigate', { url: origin + route });
  await wait('document.querySelector("main h1,main h2")!==null');
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
};
const login = async (email, password = 'Buho2026!') => {
  await go('/login'); await wait('document.querySelector("#identificador")!==null');
  await fill('#identificador', email); await fill('#password', password); await click('Iniciar sesión');
};
const logout = async () => {
  await evaluate(`(()=>{const buttons=[...document.querySelectorAll('button[aria-label="Cerrar sesión"]')];const visible=buttons.find(item=>item.getBoundingClientRect().width>0);if(visible)visible.click();})()`);
  await wait('!localStorage.getItem("emprendebuho_token")');
};
const screenshot = async name => { const data = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(directory, name + '.png'), Buffer.from(data.data, 'base64')); };
const viewport = (width, height = 900) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
const noOverflow = async () => assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Desbordamiento horizontal');
const register = async (suffix, enrollment) => {
  await go('/registro'); await wait('document.querySelector("select[name=category_id]").options.length===9');
  for (const [id, value] of Object.entries({ nombre_completo: `Estudiante ${suffix}`, email_institucional: `${suffix}@unison.mx`, matricula_unison: enrollment, password: 'RegistroF42026!', confirmacion: 'RegistroF42026!', nombre_negocio: `Negocio ${suffix}` })) await fill('#' + id, value);
  await select('select[name=category_id]', '2'); await upload('input[name=credencial]'); await click('Enviar solicitud');
  await wait('location.pathname==="/estado-cuenta" && document.body.innerText.includes("Tu solicitud fue enviada")');
};

try {
  apiServer = fixture.app.listen(0, '127.0.0.1'); await new Promise(resolve => apiServer.once('listening', resolve));
  const target = `http://127.0.0.1:${apiServer.address().port}`;
  vite = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { host: '127.0.0.1', port: 0, proxy: { '/api': { target }, '/uploads': { target } } } });
  await vite.listen(); origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
  fixture.config.CORS_ORIGIN = origin;
  browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let launchError; browser.on('error', error => { launchError = error; });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 150 && !fs.existsSync(portFile); i++) { if (launchError) throw launchError; await pause(100); }
  const debugPort = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  const tab = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  socket.addEventListener('close', () => { for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('Conexión CDP cerrada.')); } pending.clear(); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const request = pending.get(message.id); if (!request) return; clearTimeout(request.timer); pending.delete(message.id); message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown' && !JSON.stringify(message.params).includes('chrome-extension://')) failures.push(message.params.exceptionDetails);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error' && !JSON.stringify(message.params).includes('chrome-extension://')) failures.push(message.params.args.map(item => item.value ?? item.description));
    if (message.method === 'Network.requestWillBeSent') { const request = message.params.request; if (request.url.startsWith(origin + '/api')) traffic.push({ path: new URL(request.url).pathname, method: request.method, authenticated: Object.keys(request.headers).some(key => key.toLowerCase() === 'authorization') }); }
  });
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  if (process.argv.includes('--account-only')) {
    await viewport(360, 800); await login('fernanda.demo@unison.mx'); await wait('location.pathname==="/panel"');
    await go('/panel/cuenta'); await click('Cerrar mi negocio y eliminar mi cuenta'); await fill('dialog[open] input[name=password_actual]', 'Buho2026!'); await click('Eliminar mi cuenta', 'dialog[open]');
    await wait('!localStorage.getItem("emprendebuho_token")');
    assert.equal(fixture.db.prepare('SELECT estado_cuenta FROM users WHERE id=2').get().estado_cuenta, 'eliminada');
    await wait('location.pathname==="/"'); check('baja de cuenta y redirección');
  } else {
  await viewport(360, 800); await go('/'); await wait('document.querySelectorAll("main article").length===2'); await noOverflow();
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".bottom-nav")).position'), 'fixed');
  await fill('main input[type=search]', 'limon'); await wait('new URLSearchParams(location.search).get("q")==="limon"'); await wait('document.querySelectorAll("main article").length===1');
  await click('Limpiar filtros'); await wait('location.search===""');
  await click('Repostería y Postres'); await wait('new URLSearchParams(location.search).get("category_id")==="2" && document.querySelectorAll("main article").length===1');
  await click('Todas'); await wait('!new URLSearchParams(location.search).has("category_id") && document.querySelectorAll("main article").length===2');
  await evaluate('document.querySelector("main details").open=true');
  assert.equal(await evaluate('document.querySelectorAll("main svg[role=group] g").length'), 8);
  assert(await evaluate('[...document.querySelectorAll("main svg[role=group] g")].every(item=>item.getBoundingClientRect().width>=44 && item.getBoundingClientRect().height>=44)'));
  await evaluate('document.querySelector("main svg[role=group] g").dispatchEvent(new MouseEvent("click",{bubbles:true}))'); await wait('new URLSearchParams(location.search).get("zone_id")==="1" && document.querySelectorAll("main article").length===1');
  await click('Venta móvil'); await wait('new URLSearchParams(location.search).has("zone_id")'); await click('Limpiar zona'); await wait('!new URLSearchParams(location.search).has("zone_id") && document.querySelector("main details select").value===""');
  await click('Productos'); await wait('document.querySelectorAll("main article").length===7'); await select('main label select', 'price_asc'); await wait('new URLSearchParams(location.search).get("sort")==="price_asc"');
  await fill('main input[type=search]', 'limon'); await wait('new URLSearchParams(location.search).get("q")==="limon" && document.querySelectorAll("main article").length===1');
  await go('/explorar'); await click('Filtros'); await fill('dialog[open] input[type=number]', '30'); await fill('dialog[open] fieldset:first-of-type label:last-of-type input', '40');
  await select('dialog[open] fieldset:last-of-type label select', '1'); await wait('new URLSearchParams(location.search).get("day_of_week")==="1"'); await time('dialog[open] input[type=time]', '15:00'); await wait('new URLSearchParams(location.search).get("time")==="15:00"');
  await click('Ver resultados', 'dialog[open]'); await wait('document.body.innerText.includes("0 negocios encontrados")');
  await go('/explorar'); await select('main label select', 'proximity'); await wait('document.body.innerText.includes("Mi zona de referencia")'); await select('main div.surface label select', '1'); await wait('new URLSearchParams(location.search).get("preferred_zone_id")==="1"');
  await go('/explorar?min_price=30&max_price=40&sort=alpha_asc&limit=1'); await wait('document.querySelectorAll("main article").length===1');
  await clickSelector('main article a'); await wait('location.pathname.startsWith("/negocio/")'); await wait('document.querySelector("main a[href*=wa]")!==null');
  assert(await evaluate('document.querySelector("main a[href*=wa]").getBoundingClientRect().bottom<innerHeight-76'));
  await screenshot('consumidor-360'); await click('Guardar'); await wait('JSON.parse(localStorage.getItem("emprendebuho_favorites")).length===1');
  await click('Foto del menú'); await click('Ampliar menú'); await wait('document.querySelector("dialog[open] img")!==null'); await click('Cerrar', 'dialog[open]');
  await click('Horarios e información'); assert.equal(await evaluate('document.querySelectorAll("main tbody tr").length'), 7);
  await click('¿Información falsa o contenido inapropiado? Reportar este negocio'); await select('dialog[open] select', 'otro'); await click('Enviar reporte', 'dialog[open]'); await wait('document.querySelector("dialog[open]").innerText.includes("al menos 10")');
  await fill('dialog[open] textarea', 'Solicito verificar los datos de este negocio de prueba.'); await click('Enviar reporte', 'dialog[open]'); await wait('document.body.innerText.includes("Tu reporte fue enviado")');
  await go('/favoritos'); await wait('document.querySelectorAll("main article").length===1');
  await go('/explorar?limit=1&page=2'); await wait('document.body.innerText.includes("Página 2 de 2")'); await click('Anterior'); await wait('new URLSearchParams(location.search).get("page")==="1"');
  check('consumidor: búsqueda, filtros, mapa móvil, orden, paginación, contactos, menú, favoritos y reporte');

  await register('f4nuevo', '229000006'); await register('f4rechazo', '229000007');
  await go('/estado-solicitud'); await fill('#email_institucional', 'f4nuevo@unison.mx'); await fill('#matricula_unison', '229000006'); await click('Consultar estado'); await wait('document.body.innerText.includes("Solicitud pendiente de revisión")'); assert.equal(await evaluate('location.search'), '');
  await login('f4nuevo@unison.mx', 'RegistroF42026!'); await wait('location.pathname==="/estado-cuenta"');
  await login('fernanda.demo@unison.mx'); await wait('location.pathname==="/panel"'); await wait('document.body.innerText.includes("Tu negocio, de un vistazo")');
  await go('/panel/perfil'); await wait('document.querySelector("main input[name=nombre_negocio]")!==null');
  await fill('main input[name=nombre_negocio]', 'Búho F4'); await fill('main textarea[name=descripcion]', 'Descripción actualizada durante la prueba F4.'); await click('Guardar perfil'); await wait(apiCondition('/my-business', 'result.data.nombre_negocio==="Búho F4"'));
  await upload('main input[name=foto_perfil]'); await upload('main input[name=foto_menu]'); await click('Guardar imágenes'); await wait(apiCondition('/my-business', 'result.data.foto_perfil_url.endsWith(".png") && result.data.foto_menu_url.includes("/menus/")'));
  await clickSelector('main button[aria-label="Quitar foto de perfil"]'); await click('Eliminar imagen', 'dialog[open]'); await wait(apiCondition('/my-business', 'result.data.foto_perfil_url===null'));
  await click('Agregar contacto'); await fill('main form:last-of-type fieldset fieldset:last-of-type input:not([type=radio])', '6625550123'); await click('Guardar contactos'); await wait(apiCondition('/my-business', 'result.data.contacts.length===3'));
  await go('/panel/catalogo'); await wait('document.body.innerText.includes("Mi catálogo")'); await click('Nuevo producto');
  await fill('dialog[open] input[name=nombre]', 'Producto F4'); await fill('dialog[open] textarea[name=descripcion]', 'Producto creado por la prueba E2E.'); await fill('dialog[open] input[name=precio]', '35.50');
  await click('Guardar producto', 'dialog[open]'); await wait('document.querySelector("dialog[open]").innerText.includes("imagen es obligatoria")'); await upload('dialog[open] input[name=imagen]'); await click('Guardar producto', 'dialog[open]'); await wait(apiCondition('/my-business', 'result.data.products.some(item=>item.nombre==="Producto F4")'));
  await articleAction('Producto F4', 'Editar'); await fill('dialog[open] input[name=precio]', '23.50'); await click('Guardar producto', 'dialog[open]'); await wait(apiCondition('/my-business', 'result.data.products.some(item=>item.nombre==="Producto F4"&&item.precio===23.5)'));
  await evaluate(`[...document.querySelectorAll('main article')].find(item=>item.textContent.includes('Producto F4')).querySelector('[role=switch]').click()`); await wait(apiCondition('/my-business', 'result.data.products.some(item=>item.nombre==="Producto F4"&&item.estado==="pausado")'));
  await go('/panel/horarios'); await wait('document.querySelector("main form:first-of-type select")!==null'); await select('main form:first-of-type select', '2'); await fill('main input[name=ubicacion_detalle]', 'Referencia privada F4'); await click('Guardar ubicación'); await wait(apiCondition('/my-business', 'result.data.campus_zone_id===2'));
  await time('main input[name=apertura_1]', '09:00'); await time('main input[name=cierre_1]', '08:00'); await click('Guardar horarios'); await wait('document.body.innerText.includes("la apertura debe ser anterior")'); await time('main input[name=cierre_1]', '14:30'); await click('Guardar horarios'); await wait(apiCondition('/my-business', 'result.data.schedules.find(item=>item.dia_semana===1).hora_apertura==="09:00"'));
  for (const route of ['/panel', '/panel/perfil', '/panel/catalogo', '/panel/horarios', '/panel/vista-previa', '/panel/notificaciones', '/panel/cuenta']) {
    await go(route); await wait('document.querySelectorAll(".business-controls button[role=switch]:not(:disabled)").length===2');
    const previous = await evaluate('document.querySelector(".business-controls button[role=switch]").getAttribute("aria-checked")==="true"');
    await clickSelector('.business-controls button[role=switch]'); await wait(apiCondition('/my-business', `result.data.esta_abierto===${!previous}`));
    const visible = await evaluate('document.querySelectorAll(".business-controls button[role=switch]")[1].getAttribute("aria-checked")==="true"');
    await evaluate('document.querySelectorAll(".business-controls button[role=switch]")[1].click()'); await wait(apiCondition('/my-business', `result.data.mostrar_ubicacion===${!visible}`));
    await noOverflow();
  }
  await go('/panel/vista-previa'); await wait('document.body.innerText.includes("Modo Vista Previa Consumidor")'); await wait(`document.querySelector(${JSON.stringify('main [aria-label="Contacto directo"]')})!==null`); await screenshot('emprendedor-360');
  assert(!(await evaluate('document.querySelector("main").innerText')).includes('Referencia privada F4'));
  check('emprendedor: registro, consulta, perfil, fotos, contactos, productos, horarios y controles en siete subrutas');

  await logout(); await login('admin@unison.mx', 'AdminUnison2026!'); await wait('location.pathname==="/admin"'); await viewport(1280); await wait('document.body.innerText.includes("Resumen de la plataforma")'); await screenshot('administrador-1280');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".bottom-nav")).display'), 'none');
  await go('/admin/solicitudes'); await wait('document.querySelectorAll("main article").length===3');
  await articleAction('f4nuevo@unison.mx', 'Ver credencial privada'); await wait('document.querySelector("dialog[open] img")?.naturalWidth>0');
  assert((await evaluate('document.querySelector("dialog[open] img").src')).startsWith('blob:')); assert(traffic.some(item=>/\/requests\/\d+\/credential$/.test(item.path)&&item.authenticated)); await click('Cerrar credencial', 'dialog[open]');
  await articleAction('f4nuevo@unison.mx', 'Aprobar'); await click('Aprobar solicitud', 'dialog[open]'); await wait('!document.querySelector("dialog[open]")');
  await articleAction('f4rechazo@unison.mx', 'Rechazar'); await fill('dialog[open] textarea', 'Credencial de prueba no legible.'); await click('Rechazar solicitud', 'dialog[open]'); await wait('!document.querySelector("dialog[open]")');
  await go('/admin/categorias'); await wait('document.body.innerText.includes("Crear categoría")'); await click('Crear categoría'); await fill('dialog[open] input[name=nombre]', 'Categoria F4'); await click('Guardar categoría', 'dialog[open]'); await wait('document.body.innerText.includes("Categoria F4")');
  await evaluate(`[...document.querySelectorAll('main article')].find(item=>item.textContent.includes('Categoria F4')).querySelector('[role=switch]').click()`); await click('Confirmar cambio', 'dialog[open]'); await wait(apiCondition('/admin/categories', 'result.data.some(item=>item.nombre==="Categoria F4"&&!item.activa)'));
  await go('/admin/reportes'); await wait('document.querySelectorAll("main article").length===3'); await articleAction('Reporte #1 ·', 'Revisar reporte'); await select('dialog[open] select', 'ocultar_producto'); await fill('dialog[open] textarea', 'Imagen sujeta a revisión administrativa.'); await click('Confirmar resolución y sanción', 'dialog[open]'); await wait('!document.querySelector("dialog[open]")');
  await articleAction('Reporte #2 ·', 'Revisar reporte'); await select('dialog[open] select', 'suspender_cuenta'); await fill('dialog[open] textarea', 'Cuenta sujeta a revisión administrativa.'); await click('Confirmar resolución y sanción', 'dialog[open]'); await wait('!document.querySelector("dialog[open]")');
  await articleAction('Reporte #3 ·', 'Revisar reporte'); await click('Guardar resolución', 'dialog[open]'); await wait('!document.querySelector("dialog[open]")');
  await go('/admin/solicitudes?status=suspendida'); await wait('document.querySelectorAll("main article").length===1'); await articleAction('orlando.demo@unison.mx', 'Reactivar cuenta'); await click('Reactivar cuenta', 'dialog[open]'); await wait('!document.querySelector("dialog[open]")');
  await go('/admin/moderacion'); await wait('document.querySelectorAll("main article").length>0'); await articleAction('Producto F4', 'Ocultar producto'); await fill('dialog[open] textarea', 'Motivo F4 para corregir el producto.'); await click('Confirmar ocultamiento', 'dialog[open]'); await wait('!document.querySelector("dialog[open]")');
  await logout(); await login('fernanda.demo@unison.mx'); await wait('location.pathname==="/panel"'); await go('/panel/catalogo'); await wait('document.body.innerText.includes("Motivo F4 para corregir")');
  assert(await evaluate(`[...document.querySelectorAll('main article')].find(item=>item.textContent.includes('Producto F4')).querySelector('[role=switch]').disabled`));
  await articleAction('Producto F4', 'Editar'); await fill('dialog[open] textarea[name=descripcion]', 'Producto corregido tras la moderación.'); await click('Guardar producto', 'dialog[open]'); await wait(apiCondition('/my-business', 'result.data.products.some(item=>item.nombre==="Producto F4"&&item.estado==="oculto_admin"&&item.descripcion.includes("corregido"))'));
  await logout(); await login('admin@unison.mx', 'AdminUnison2026!'); await wait('location.pathname==="/admin"'); await go('/admin/moderacion?estado=oculto_admin'); await wait('document.body.innerText.includes("Corregido por el emprendedor")'); await articleAction('Producto F4', 'Restaurar producto'); await click('Confirmar restauración', 'dialog[open]'); await wait('!document.querySelector("dialog[open]")');
  const posts = traffic.filter(item=>item.method==='POST'&&item.path.includes('/maintenance/')).length;
  await go('/admin/mantenimiento'); await wait('document.body.innerText.includes("Todavía no hay respaldos")'); assert.equal(traffic.filter(item=>item.method==='POST'&&item.path.includes('/maintenance/')).length, posts);
  for (const action of ['Ejecutar barrido de inactividad', 'Limpiar archivos huérfanos', 'Crear respaldo SQLite']) { await click(action); await click('Confirmar ejecución', 'dialog[open]'); await wait('!document.querySelector("dialog[open]")'); }
  await wait('document.body.innerText.includes("Descargar .sqlite")'); await click('Descargar .sqlite');
  const backup = (await api('/admin/maintenance/health')).data.backups[0];
  for (let i=0;i<100&&!fs.existsSync(path.join(downloads,backup.filename));i++) await pause(100);
  assert.equal(fs.readFileSync(path.join(downloads,backup.filename)).subarray(0,16).toString(), 'SQLite format 3\0');
  await fill('main input[placeholder="Por ejemplo: resolver_reporte"]', 'respaldo_bd'); await wait('document.body.innerText.includes("respaldo bd")');
  await viewport(360,800); await noOverflow(); await screenshot('administrador-360');
  check('administrador: credencial Blob, aprobar/rechazar, categorías, sanciones, restauración, respaldo descargado y auditoría');

  await logout(); await login('fernanda.demo@unison.mx'); await wait('location.pathname==="/panel"'); await go('/panel/notificaciones'); await wait('document.body.innerText.includes("Marcar como leída")');
  const unread = (await api('/notifications')).data.unread_count; await click('Marcar como leída'); await wait(apiCondition('/notifications', `result.data.unread_count===${unread-1}`)); await wait('document.querySelector("main h2")?.textContent==="Notificaciones"'); await click('Marcar todas como leídas'); await wait(apiCondition('/notifications', 'result.data.unread_count===0'));
  await go('/panel/catalogo'); await wait('document.body.innerText.includes("Producto F4")'); await articleAction('Producto F4', 'Eliminar'); await click('Eliminar producto', 'dialog[open]'); await wait(apiCondition('/my-business', '!result.data.products.some(item=>item.nombre==="Producto F4")'));
  await logout(); await go('/recuperar-password'); await fill('#email_institucional','fernanda.demo@unison.mx'); await click('Solicitar código'); await wait('document.querySelector(".dev-code code")!==null'); const code=await evaluate('document.querySelector(".dev-code code").textContent'); await click('Ya tengo mi código'); await wait('location.pathname==="/restablecer-password"'); await fill('#codigo_recuperacion',code); await fill('#nueva_password','NuevaF42026!'); await fill('#confirmacion','NuevaF42026!'); await click('Cambiar contraseña'); await wait('document.body.innerText.includes("Tu contraseña cambió")');
  await login('fernanda.demo@unison.mx','NuevaF42026!'); await wait('location.pathname==="/panel"'); await go('/panel/cuenta'); await wait('document.body.innerText.includes("Cerrar mi negocio y eliminar mi cuenta")'); await click('Cerrar mi negocio y eliminar mi cuenta'); await fill('dialog[open] input[name=password_actual]','NuevaF42026!'); await click('Eliminar mi cuenta','dialog[open]'); await wait('location.pathname==="/" && !localStorage.getItem("emprendebuho_token")');
  await go('/admin'); await wait('location.pathname==="/login"'); await go('/ruta-inexistente'); await wait('document.body.innerText.includes("No encontramos esta página")');
  await viewport(768); await go('/explorar'); await wait('document.querySelectorAll("main article").length===2'); assert.equal(await evaluate('getComputedStyle(document.querySelector(".navbar-desktop")).display'),'flex'); await noOverflow();
  check('notificaciones, baja, recuperación, rutas protegidas, 404 y punto de quiebre 768px');
  assert.deepEqual(failures, [], 'Errores de la aplicación en consola');
  console.log(`E2E completado. Capturas y descarga de prueba: ${directory}`);
  }
} catch (error) {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await screenshot('fallo'); fs.writeFileSync(path.join(directory, 'fallo.txt'), await evaluate('document.body.innerText')); } catch { /* Se conserva la excepción original. */ }
  }
  console.error(`Evidencia de la prueba fallida: ${directory}`);
  throw error;
} finally {
  if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close'); } catch { /* El proceso puede haberse cerrado. */ } socket.close(); }
  if (browser && browser.exitCode === null) browser.kill();
  for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('Sesión CDP cerrada.')); }
  if (vite) await vite.close();
  if (apiServer) await new Promise(resolve => apiServer.close(resolve));
  fixture.close();
}
