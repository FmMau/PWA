import Router from "./router/router.js";
import { LoginView, RegisterView } from './views/AuthView.js';
import { NotificationsView, OperatorView, AvailableView } from './views/apiViews.js';
import { initReportSync } from './pwa/reportSync.js';
import { context as apiContext, writeSetting } from './services/apiService.js';
import { initConnectionStatus } from './pwa/connectionStatus.js';
import { registerSW } from "./pwa/registerSW.js";
import { initInstallPrompt } from "./pwa/installPrompt.js";
import { initInstallButton } from "./pwa/installButton.js";
window.addEventListener("load", registerSW, { once: true });

import DashboardView from "./views/DashboardView.js";
import ReportsView from "./views/ReportsView.js";
import SupplyView from "./views/SupplyView.js";
import TrucksView from "./views/TrucksView.js";
import StatisticsView from "./views/StatisticsView.js";
import ItemDetailView from "./views/ItemDetailView.js";
import { initTheme } from "./utils/theme.js";
import {
  registerVisit,
} from "./utils/visitCookie.js";

const routes = [
  { path: '/login', view: LoginView },
  { path: '/registro', view: RegisterView },
  { path: '/notificaciones', view: NotificationsView },
  { path: '/operador', view: OperatorView },
  { path: '/disponibles', view: AvailableView },
  {
    path: "/",
    view: DashboardView,
  },
  {
    path: "/reportes",
    view: ReportsView,
  },
  {
    path: "/suministro",
    view: SupplyView,
  },
  {
    path: "/pipas",
    view: TrucksView,
  },
  {
    path: "/estadisticas",
    view: StatisticsView,
  },
  {
    path: "/item/:id",
    view: ItemDetailView,
  },
];

const app = document.getElementById("app");

const router = new Router(routes, app);

registerVisit();
initTheme();
initConnectionStatus();
initInstallPrompt();
initInstallButton();
router.init();
initReportSync();
async function updateAccountHeader() {
  const {session} = await apiContext();
  const profile = document.querySelector('.user-info');
  if (profile) {
    const name = profile.querySelector('strong');
    const detail = profile.querySelector('div > span');
    if (name) name.textContent = session?.user.nombre || 'Sin sesión';
    if (detail) detail.textContent = session?.user.colonia || 'Conecta tu cuenta';
    const avatar = profile.querySelector('.user-avatar');
    if (avatar) avatar.textContent = session?.user.nombre?.trim().charAt(0).toUpperCase() || 'A';
  }
}
window.addEventListener('auth-change', updateAccountHeader);
updateAccountHeader().catch(console.error);
document.querySelector('.notification-button').addEventListener('click', () => router.navigate('/notificaciones'));

document.getElementById('logout-button').addEventListener('click', async () => {
  await writeSetting('session', null);
  window.dispatchEvent(new Event('auth-change'));
});
