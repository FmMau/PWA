export default async function DashboardView() {
  return `
    <section class="page">

      <div class="page-header">
        <div>
          <span class="page-eyebrow">
            Centro de Control
          </span>

          <h2>Resumen del suministro</h2>

          <p>
            Estado general del servicio de agua y reportes ciudadanos.
          </p>
        </div>
      </div>

      <div class="stats-grid">

        <article class="stat-card">
          <span class="stat-label">
            Reportes activos
          </span>

          <strong class="stat-value">
            47
          </strong>

          <span class="stat-description">
            8 registrados hoy
          </span>
        </article>

        <article class="stat-card">
          <span class="stat-label">
            Colonias afectadas
          </span>

          <strong class="stat-value">
            12
          </strong>

          <span class="stat-description">
            Con problemas de suministro
          </span>
        </article>

        <article class="stat-card">
          <span class="stat-label">
            Casos críticos
          </span>

          <strong class="stat-value">
            8
          </strong>

          <span class="stat-description">
            Requieren atención
          </span>
        </article>

      </div>

      <div class="dashboard-grid">

        <article class="dashboard-card">
          <div class="section-title">
            <div>
              <h3>Estado del suministro</h3>
              <p>Situación actual por zona</p>
            </div>

            <a href="#/mapa" data-link>
              Ver mapa →
            </a>
          </div>

          <div class="placeholder-content">
            Mapa de abastecimiento
          </div>
        </article>

        <article class="dashboard-card">
          <div class="section-title">
            <div>
              <h3>Reportes recientes</h3>
              <p>Últimas incidencias ciudadanas</p>
            </div>

            <a href="#/reportes" data-link>
              Ver todos →
            </a>
          </div>

          <div class="report-preview">
            <strong>Falta de suministro</strong>
            <span>Camino Real</span>
          </div>

          <div class="report-preview">
            <strong>Fuga de agua</strong>
            <span>Centro</span>
          </div>

          <div class="report-preview">
            <strong>Baja presión</strong>
            <span>El Centenario</span>
          </div>

        </article>

      </div>

    </section>
  `;
}