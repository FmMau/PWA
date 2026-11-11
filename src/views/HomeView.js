import { context, resource, escapeHTML as e } from '../services/apiService.js';
import { loadCommunity, summarize, WATER_STATES, dateLabel } from '../services/communityService.js';
import { records } from '../services/outboxService.js';
import { retryReports } from '../pwa/reportSync.js';

const states = { solicitada: 'Solicitud enviada', asignada: 'Pipa asignada', en_camino: 'Tu pipa está en camino', en_sitio: 'La pipa llegó', completada: 'Entrega completada', cancelada: 'Pedido cancelado' };
const icon = name => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;
export default {
  template: () => `<section class="page home-page" data-api-page><div class="page-header home-heading"><div><span class="page-eyebrow">TU COMUNIDAD, CONECTADA</span><h2 data-greeting>Hola, bienvenido</h2><p>El agua de tu colonia y tus pedidos, en un solo lugar.</p></div><button class="btn-secondary" data-refresh>${icon('rotate')} Actualizar</button></div><p data-source role="status" aria-live="polite">Consultando tu comunidad…</p><div data-home></div></section>`,
  async init(container) {
    const page = container.querySelector('.home-page');
    const { session, base } = await context();
    const firstName = session.user.nombre?.trim().split(/\s+/)[0];
    page.querySelector('[data-greeting]').textContent = firstName ? `Hola, ${firstName}` : 'Tu comunidad, conectada';
    let busy = false;
    async function refresh() {
      if (busy || !page.isConnected) return;
      busy = true; page.querySelector('[data-refresh]').disabled = true;
      const results = await Promise.allSettled([loadCommunity(), resource('/api/pipas/pedidos'), resource('/api/pipas/operador'), resource('/api/notificaciones'), records('outbox')]);
      if (!page.isConnected) return;
      const value = i => results[i].status === 'fulfilled' ? results[i].value : null;
      const community = value(0), orders = value(1), operator = value(2), notices = value(3);
      const mine = summarize(community?.data.colonias.find(row => row.colonia === session.user.colonia));
      const state = WATER_STATES[mine.state];
      const pending = value(4)?.filter(row => row.owner === session.user.id && row.base === base);
      const active = Array.isArray(orders?.data) ? orders.data.find(order => !['completada','cancelada'].includes(order.estado)) : null;
      page.querySelector('[data-source]').textContent = community ? `${community.cached ? 'Consulta guardada · no se pudo actualizar' : 'Datos comunitarios'} · ${dateLabel(community.date)}` : 'No pudimos consultar la comunidad. Intenta actualizar.';
      page.querySelector('[data-home]').innerHTML = `<div class="home-columns"><div class="home-primary"><article class="water-hero"><div class="section-title"><span class="page-eyebrow">AGUA EN TU COLONIA</span><span class="live-label">Últimas 24 horas</span></div><h3 class="home-colony">${icon('location-dot')} ${e(session.user.colonia || 'Tu colonia')}</h3><div class="water-status" data-water-state="${mine.state}"><span class="water-status-icon" style="background:${state.color}">${icon('droplet')}</span><div><strong>${community ? state.label : 'Sin información'}</strong><span>Estado más reportado</span></div></div><p>${!community ? 'No hay una consulta disponible. Esto no indica que el suministro sea normal.' : mine.total ? `${mine.total} ${mine.total === 1 ? 'vecino reportó' : 'vecinos reportaron'} en las últimas 24 horas.` : 'Aún no hay reportes vigentes. Comparte cómo está el agua en tu domicilio.'}</p><div class="water-counts">${Object.entries(mine.counts).map(([key,count])=>`<div><strong style="color:${WATER_STATES[key].color}">${community ? count : '—'}</strong><span>${WATER_STATES[key].label}</span></div>`).join('')}</div><p class="home-caption">Cuenta el último reporte de cada vecino en 24 h. No es una medición del suministro de toda la colonia.</p><a class="home-report-button" href="#/reportes" data-link>${icon('circle-plus')} Reportar estado del agua <span>→</span></a></article>
      <div class="home-actions"><a href="#/pipas" data-link>${icon('truck-droplet')}<strong>Solicitar pipa</strong><span>Agua a tu domicilio →</span></a><a href="#/mapa" data-link>${icon('map-location-dot')}<strong>Ver mapa</strong><span>Explora las colonias →</span></a></div>
      <article class="home-card aquahome-promo"><div class="home-feature-icon">${icon('house-chimney')}</div><div><span class="page-eyebrow">EL AGUA, TAMBIÉN EN CASA</span><h3>AquaHome</h3><p>Consulta el nivel de tu recipiente conectado.</p><a class="text-link" href="#/aquahome" data-link>Abrir AquaHome →</a></div></article>
      ${active ? `<article class="home-card"><span class="page-eyebrow">TU PEDIDO ACTIVO</span><h3>${e(states[active.estado] || active.estado)}</h3><p>${e(active.litros)} litros · Pedido #${e(active.id)}${orders.cached ? ' · Consulta guardada' : ''}</p><a class="text-link" href="#/pipas" data-link>Ver mi pedido →</a></article>` : !orders ? '<article class="home-card"><h3>Consulta tus pedidos</h3><p>No pudimos verificar si tienes una entrega activa.</p><a href="#/pipas" data-link>Revisar pedidos →</a></article>' : ''}
      ${operator?.data?.perfil ? `<article class="home-card"><span class="page-eyebrow">MI PIPA</span><h3>${e(operator.data.perfil.nombre)}</h3><p>${operator.data.pedido ? e(states[operator.data.pedido.estado]) : operator.data.perfil.disponible ? 'Disponible para recibir solicitudes' : 'Fuera de servicio'}${operator.cached ? ' · Consulta guardada' : ''}</p><a href="#/operador" data-link class="text-link">Ver mis entregas →</a></article>` : ''}</div>
      <div class="home-secondary"><article class="home-card community-promo"><span class="page-eyebrow">LA PAZ, BAJA CALIFORNIA SUR</span><div class="community-art" aria-hidden="true">${icon('map-location-dot')}</div><h3>Tu colonia y sus alrededores</h3><p>Conoce lo que reportan tus vecinos. Cada observación ayuda a entender nuestra ciudad.</p><a class="btn-secondary" href="#/mapa" data-link>Explorar el mapa →</a></article>
      ${pending?.length ? `<article class="home-card pending-notice"><h3>${icon('cloud-arrow-up')} Por enviar</h3><p>${pending.length} reportes guardados en este dispositivo.</p><button class="btn-secondary" data-sync>Reintentar envío</button></article>` : ''}
      <article class="home-card"><div class="section-title"><h3>Avisos recientes</h3><a href="#/notificaciones" data-link>Ver todos</a></div>${Array.isArray(notices?.data) ? notices.data.slice(0,3).map(n=>`<a class="home-notice" href="#/notificaciones" data-link><span class="notice-dot"></span><div><strong>${e(n.titulo || 'Aviso de tu comunidad')}</strong><p>${e(n.mensaje)}</p><small>${dateLabel(n.fecha)}</small></div></a>`).join('') || '<p>Aquí aparecerán los avisos de tu comunidad y de tus pedidos.</p>' : '<p>No pudimos actualizar tus avisos.</p>'}</article></div></div>`;
      busy = false; page.querySelector('[data-refresh]').disabled = false;
    }
    page.querySelector('[data-refresh]').addEventListener('click', refresh);
    page.addEventListener('click', async event => { const button = event.target.closest('[data-sync]'); if (!button) return; button.disabled = true; try { await retryReports(); } catch(error) { page.querySelector('[data-source]').textContent = error.message; } await refresh(); });
    await refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); },60000);
    return () => clearInterval(timer);
  },
};
