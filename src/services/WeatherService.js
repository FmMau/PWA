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

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Error al consultar el clima. Código: ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.current) {
      throw new Error("La API no regresó información meteorológica.");
    }

    return data;
  }
}