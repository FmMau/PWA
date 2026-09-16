import WeatherService from "../services/WeatherService.js";


function getWeatherIcon(code) {
  if (code === 0) return "fa-sun";
  if (code <= 2) return "fa-cloud-sun";
  if (code <= 3) return "fa-cloud";
  if (code <= 48) return "fa-smog";
  if (code <= 57) return "fa-cloud-drizzle";
  if (code <= 67) return "fa-cloud-rain";
  if (code <= 77) return "fa-snowflake";
  if (code <= 82) return "fa-cloud-showers-heavy";
  if (code <= 99) return "fa-bolt";
  return "fa-cloud-sun";
}

function getWeatherDescription(code) {
  if (code === 0) return "Despejado";
  if (code <= 2) return "Parcialmente nublado";
  if (code <= 3) return "Nublado";
  if (code <= 48) return "Neblina";
  if (code <= 57) return "Llovizna";
  if (code <= 67) return "Lluvia";
  if (code <= 77) return "Nieve";
  if (code <= 82) return "Chubascos";
  if (code <= 99) return "Tormenta";
  return "Variable";
}


function skeletonCard() {
  return `
    <article class="weather-card weather-card--skeleton">
      <div class="skeleton-icon skeleton-pulse"></div>
      <div class="weather-card-content">
        <span class="skeleton-text skeleton-text--sm skeleton-pulse"></span>
        <span class="skeleton-text skeleton-text--lg skeleton-pulse"></span>
      </div>
    </article>
  `;
}


function template() {
  const skeletons = Array.from({ length: 4 }, skeletonCard).join("");

  return `
    <section class="page weather-page">

      <div class="page-header">
        <span class="page-eyebrow">Información ambiental</span>
        <h2>Clima en La Paz</h2>
        <p>
          Consulta de las condiciones meteorológicas actuales
          para apoyar el monitoreo del entorno de AquaPaz.
        </p>
      </div>

      <section class="weather-summary weather-summary--skeleton" id="weather-summary">
        <div class="weather-summary-main">
          <div class="skeleton-icon skeleton-icon--lg skeleton-pulse"></div>
          <div style="flex:1">
            <span class="skeleton-text skeleton-text--sm skeleton-pulse" style="width:10rem"></span>
            <span class="skeleton-text skeleton-text--xl skeleton-pulse" style="width:7rem; margin-top:0.5rem"></span>
            <span class="skeleton-text skeleton-text--sm skeleton-pulse" style="width:14rem; margin-top:0.5rem"></span>
          </div>
        </div>
      </section>

      <div class="weather-grid" id="weather-grid">
        ${skeletons}
      </div>

    </section>
  `;
}


async function init(container) {
  const summaryEl = container.querySelector("#weather-summary");
  const gridEl    = container.querySelector("#weather-grid");

  try {

    const data    = await WeatherService.getCurrentWeather();
    const weather = data.current;
    const units   = data.current_units;


    const weatherItems = [
      {
        icon:  "fa-temperature-half",
        label: "Temperatura",
        value: weather.temperature_2m,
        unit:  units.temperature_2m,
      },
      {
        icon:  "fa-droplet",
        label: "Humedad relativa",
        value: weather.relative_humidity_2m,
        unit:  units.relative_humidity_2m,
      },
      {
        icon:  "fa-cloud-rain",
        label: "Precipitación",
        value: weather.precipitation,
        unit:  units.precipitation,
      },
      {
        icon:  "fa-wind",
        label: "Velocidad del viento",
        value: weather.wind_speed_10m,
        unit:  units.wind_speed_10m,
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
              <span class="weather-card-label">${item.label}</span>
              <strong class="weather-card-value">
                ${item.value}
                <small>${item.unit}</small>
              </strong>
            </div>
          </article>
        `
      )
      .join("");

    const weatherIcon = getWeatherIcon(weather.weather_code);
    const weatherDesc = getWeatherDescription(weather.weather_code);


    summaryEl.classList.remove("weather-summary--skeleton");
    summaryEl.innerHTML = `
      <div class="weather-summary-main">
        <div class="weather-summary-icon">
          <i class="fa-solid ${weatherIcon}"></i>
        </div>
        <div>
          <span class="weather-location">La Paz, Baja California Sur</span>
          <div class="weather-main-temperature">
            ${weather.temperature_2m}
            <small>${units.temperature_2m}</small>
          </div>
          <p>
            ${weatherDesc} &mdash;
            Sensación térmica: ${weather.apparent_temperature}${units.apparent_temperature}
          </p>
        </div>
      </div>
    `;


    gridEl.innerHTML = cards;

  } catch (error) {
    console.error("Error al obtener el clima:", error);


    let title   = "No se pudo cargar la información";
    let message = "Ocurrió un problema inesperado al consultar el clima.";

    if (error.name === "AbortError") {
      title   = "La solicitud tardó demasiado";
      message = "El servidor no respondió dentro del tiempo esperado. Intenta nuevamente.";
    } else if (error instanceof TypeError) {
      title   = "Problema de conexión";
      message = "No fue posible conectarse al servicio meteorológico. Revisa tu conexión a Internet.";
    } else if (error.name === "HttpError") {
      title   = "Error del servidor";
      message = `El servidor respondió con el código ${error.status}. Intenta nuevamente más tarde.`;
    }

    summaryEl.classList.remove("weather-summary--skeleton");
    summaryEl.innerHTML = `
      <div class="api-error">
        <div class="api-error-icon">
          <i class="fa-solid fa-circle-exclamation"></i>
        </div>
        <h3>${title}</h3>
        <p>${message}</p>
        <button class="retry-button" id="btn-retry-weather">
          Intentar nuevamente
        </button>
      </div>
    `;

    gridEl.innerHTML = "";

    summaryEl.querySelector("#btn-retry-weather").addEventListener("click", () => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  }
}


export default { template, init };
