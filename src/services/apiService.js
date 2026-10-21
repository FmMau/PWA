import { getDB } from './dbService.js';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function readSetting(id) {
  const db = await getDB();
  try { return (await db.get('settings', id))?.value; } finally { db.close(); }
}
export async function writeSetting(id, value) {
  const db = await getDB();
  try { await db.put('settings', { id, value }); } finally { db.close(); }
}
export function normalizeBase(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Usa HTTPS o localhost.');
  if (url.username || url.password || url.search || url.hash) throw new Error('La URL no debe incluir credenciales, parámetros ni fragmentos.');
  return url.href.replace(/\/$/, '').replace(/\/api$/, '');
}
export async function context() {
  return { base: await readSetting('apiBase') || 'https://aquapaz-api-production.up.railway.app', session: await readSetting('session') };
}
export async function request(path, { method = 'GET', body, publicAccess = false, base, session } = {}) {
  const current = await context();
  base ??= current.base;
  session ??= current.session;
  if (!publicAccess && !session?.token) throw new Error('Inicia sesión para continuar.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}${path}`, {
      method, cache: 'no-store', signal: controller.signal,
      headers: { ...(body ? {'Content-Type': 'application/json'} : {}), ...(!publicAccess ? {Authorization: `Bearer ${session.token}`} : {}) },
      ...(body ? {body: JSON.stringify(body)} : {}),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 && !publicAccess && typeof window !== 'undefined') {
        const active = await readSetting('session');
        if (active?.token === session.token) {
          await writeSetting('session', null);
          window.dispatchEvent(new Event('auth-change'));
        }
      }
      throw new Error(`${response.status}: ${data.error || 'Error del servidor'}`);
    }
    return data;
  } finally { clearTimeout(timer); }
}
export async function resource(path) {
  const {base, session} = await context();
  if (!session) throw new Error('Inicia sesión para continuar.');
  const id = `${base}|${session.user.id}|${session.user.colonia}|${path}`;
  const db = await getDB();
  try {
    const data = await request(path);
    const saved = {id, data, date: new Date().toISOString()};
    await db.put('snapshots', saved);
    return {...saved, cached: false};
  } catch (error) {
    const saved = await db.get('snapshots', id);
    if (!saved || /^(401|403):/.test(error.message)) throw error;
    return {...saved, cached: true, error: error.message};
  } finally { db.close(); }
}
