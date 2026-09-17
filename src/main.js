import Router from "./router/router.js";

import DashboardView from "./views/DashboardView.js";
import MapView from "./views/MapView.js";
import ReportsView from "./views/ReportsView.js";
import SupplyView from "./views/SupplyView.js";
import TrucksView from "./views/TrucksView.js";
import StatisticsView from "./views/StatisticsView.js";
import AboutView from "./views/AboutView.js";
import ItemDetailView from "./views/ItemDetailView.js";
import WeatherView, {
  initWeatherFilters,
} from "./views/WeatherView.js";
import DiagnosticsView, {
  initDiagnostics,
} from "./views/DiagnosticsView.js";
import { initTheme } from "./utils/theme.js";
import {
  registerVisit,
} from "./utils/visitCookie.js";

const routes = [
  {
    path: "/",
    view: DashboardView,
  },
  {
    path: "/mapa",
    view: MapView,
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
    path: "/acerca",
    view: AboutView,
  },
  {
    path: "/item/:id",
    view: ItemDetailView,
  },
  {
    path: "/clima",
    view: WeatherView,
  },
  {
    path: "/diagnostico",
    view: DiagnosticsView,
  },
];

const app = document.getElementById("app");

const router = new Router(routes, app);

registerVisit();
initTheme();
initWeatherFilters();
initDiagnostics();
router.init();