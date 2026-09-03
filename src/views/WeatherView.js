export default async function WeatherView() {
  try {
    const { default: WeatherService } = await import(
      "../services/WeatherService.js"
    );

    const data = await WeatherService.getCurrentWeather();

    const weather = data.current;
    const units = data.current_units;

    const weatherItems = [
      {
        icon: "fa-temperature-half",
        label: "Temperatura",
        value: weather.temperature_2m,
        unit: units.temperature_2m,
      },
      {
        icon: "fa-droplet",
        label: "Humedad",
        value: weather.relative_humidity_2m,
        unit: units.relative_humidity_2m,
      },
      {
        icon: "fa-cloud-rain",
        label: "Precipitación",
        value: weather.precipitation,
        unit: units.precipitation,
      },
      {
        icon: "fa-wind",
        label: "Velocidad del viento",
        value: weather.wind_speed_10m,
        unit: units.wind_speed_10m,
      },
    ];

    const cards = weatherItems
      .map(
        (item) => `
          <article class="weather-card">
            <div class="weather-card-icon">
              <i class="fa-solid ${item.icon}"></i>
            </div>

            <div class="weather-card-content">
              <span class="weather-card-label">
                ${item.label}
              </span>

              <strong class="weather-card-value">
                ${item.value}
                <small>${item.unit}</small>
              </strong>
            </div>
          </article>
        `
      )
      .join("");

    return `
      <section class="page weather-page">

        <div class="page-header">
          <span class="page-eyebrow">
            Información ambiental
          </span>

          <h2>Clima en La Paz</h2>

          <p>
            Consulta de las condiciones meteorológicas actuales
            para apoyar el monitoreo del entorno de AquaPaz.
          </p>
        </div>


        <section class="weather-summary">

          <div class="weather-summary-main">

            <div class="weather-summary-icon">
              <i class="fa-solid fa-cloud-sun"></i>
            </div>

            <div>
              <span class="weather-location">
                La Paz, Baja California Sur
              </span>

              <div class="weather-main-temperature">
                ${weather.temperature_2m}
                <small>${units.temperature_2m}</small>
              </div>

              <p>
                Sensación térmica:
                ${weather.apparent_temperature}
                ${units.apparent_temperature}
              </p>
            </div>

          </div>
        </section>


        <div class="weather-grid">
          ${cards}
        </div>

      </section>
    `;
  } catch (error) {
    console.error("Error al obtener el clima:", error);

    let title = "No se pudo cargar la información";

    let message =
      "Ocurrió un problema inesperado al consultar el clima.";

    // Timeout
    if (error.name === "AbortError") {
      title = "La solicitud tardó demasiado";

      message =
        "El servidor no respondió dentro del tiempo esperado. Intenta nuevamente.";
    }

    // Error de red o CORS
    else if (error instanceof TypeError) {
      title = "Problema de conexión";

      message =
        "No fue posible conectarse al servicio meteorológico. Revisa tu conexión a Internet.";
    }

    // Error HTTP
    else if (error.name === "HttpError") {
      title = "Error del servidor";

      message =
        `El servidor respondió con el código ${error.status}. Intenta nuevamente más tarde.`;
    }

    return `
      <section class="page">

        <div class="page-header">
          <span class="page-eyebrow">
            Información ambiental
          </span>

          <h2>Clima en La Paz</h2>
        </div>

        <div class="api-error">

          <div class="api-error-icon">
            <i class="fa-solid fa-circle-exclamation"></i>
          </div>

          <h3>
            ${title}
          </h3>

          <p>
            ${message}
          </p>

          <button
            class="retry-button"
            onclick="window.dispatchEvent(
              new PopStateEvent('popstate')
            )"
          >
            Intentar nuevamente
          </button>

        </div>

      </section>
    `;
  }
}