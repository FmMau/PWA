export default class WeatherService {
  static async getCurrentWeather() {
    const latitude = 24.1426;
    const longitude = -110.3128;

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m` +
      `&timezone=America%2FMazatlan`;

    // 1 intento + 1 reintento
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.fetchWithTimeout(url, 5000);
      } catch (error) {
        // Timeout no reintentar
        if (error.name === "AbortError") {
          throw error;
        }

        // Error HTTP no reintentar
        if (error.name === "HttpError") {
          throw error;
        }

        // Errores de red / CORS
        if (error instanceof TypeError) {
          if (attempt < maxAttempts) {
            console.log(
              `Error de red. Reintentando petición... Intento ${attempt + 1}`
            );

            continue;
          }

          throw error;
        }

        throw error;
      }
    }
  }


  static async fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      // Error HTTP del servidor
      if (!response.ok) {
        const error = new Error(
          `El servidor respondió con el código ${response.status}`
        );

        error.name = "HttpError";
        error.status = response.status;

        throw error;
      }

      const data = await response.json();

      if (!data.current) {
        throw new Error(
          "La API no regresó información meteorológica válida."
        );
      }

      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}