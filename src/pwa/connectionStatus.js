export function initConnectionStatus() {
  const badge = document.getElementById('connection-status');
  const paint = () => {
    badge.textContent = navigator.onLine ? 'Conexión disponible' : 'Sin internet · trabajando con datos guardados';
    badge.dataset.offline = String(!navigator.onLine);
  };
  window.addEventListener('online', paint);
  window.addEventListener('offline', paint);
  paint();
}
