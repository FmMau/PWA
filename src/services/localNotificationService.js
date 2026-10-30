import { context } from './apiService.js';
import { getPermission, showLocalNotification } from '../pwa/notifications.js';

export async function showReportSyncNotification({ count, owner, base }) {
  if (!Number.isSafeInteger(count) || count < 1) return false;
  if (getPermission() !== 'granted') return false;

  try {
    const current = await context();

    if (current.base !== base || current.session?.user?.id !== owner) return false;

    return await showLocalNotification('AquaPaz · Reportes sincronizados', {
      body: count === 1
        ? 'Tu reporte pendiente fue confirmado por el servidor. Ya no quedan reportes por enviar de esta cuenta.'
        : `Se confirmaron ${count} reportes pendientes. Ya no quedan reportes por enviar de esta cuenta.`,
      tag: 'aquapaz-reportes-sincronizados',
    });
  } catch (error) {
    console.info('[Avisos] No se pudo mostrar el aviso local:', error.name);
    return false;
  }
}
