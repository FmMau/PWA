import { resource } from './apiService.js';

export const WATER_STATES = {
  no_agua: { label: 'Sin agua', color: '#dc2626' },
  baja_presion: { label: 'Baja presión', color: '#d97706' },
  tengo_agua: { label: 'Con agua', color: '#059669' },
  sin_datos: { label: 'Sin datos', color: '#64748b' },
};
const aliases = { 'Zona Central': 'Centro', 'Unidad INDECO': 'Indeco', '8 de Octubre 1° Sección': '8 de Octubre', '8 de Octubre 2° Sección': '8 de Octubre' };
let catalogPromise;
export function catalog() {
  catalogPromise ||= fetch(new URL('../../data/colonias-lapaz.json', import.meta.url)).then(async response => {
    if (!response.ok) throw new Error('No se pudo cargar el mapa de colonias.');
    const data = await response.json();
    return data.features.map(feature => ({ ...feature, properties: { ...feature.properties, nombre: aliases[feature.properties.nombre] || feature.properties.nombre } }));
  }).catch(error => { catalogPromise = null; throw error; });
  return catalogPromise;
}
export function summarize(row, now = Date.now()) {
  const timestamp = Date.parse(row?.ultima_actualizacion);
  const expires = Date.parse(row?.expira || (Number.isFinite(timestamp) ? new Date(timestamp + 86400000).toISOString() : ''));
  const valid = Number.isFinite(expires) && expires > now;
  const counts = Object.fromEntries(['no_agua', 'baja_presion', 'tengo_agua'].map(key => [key, valid ? Math.max(0, Number(row?.[key]) || 0) : 0]));
  let state = 'sin_datos', maximum = 0;
  for (const key of Object.keys(counts)) if (counts[key] > maximum) { state = key; maximum = counts[key]; }
  return { counts, state, total: Object.values(counts).reduce((a,b) => a+b,0), updatedAt: row?.ultima_actualizacion };
}
export async function loadCommunity() {
  const snapshot = await resource('/api/reportes/mapa');
  if (!Array.isArray(snapshot.data?.colonias)) throw new Error('No se pudo interpretar el resumen de colonias.');
  return snapshot;
}
export const dateLabel = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha';
