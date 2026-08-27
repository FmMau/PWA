export default function StatisticsView() {
  return `
    <section class="page">

      <div class="page-header">
        <div>
          <span class="page-eyebrow">
            Análisis
          </span>

          <h2>Estadísticas</h2>

          <p>
            Indicadores y tendencias para apoyar
            la toma de decisiones sobre el suministro.
          </p>
        </div>
      </div>

      <div class="empty-state">
        <span class="empty-icon">
            <i class="fa-solid fa-chart-line"></i>
        </span>

        <h3>Análisis del servicio</h3>

        <p>
          Aquí se mostrarán gráficas, tendencias
          e indicadores de AquaPaz.
        </p>
      </div>

    </section>
  `;
}