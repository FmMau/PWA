// TODO (Ejercicio - Parte A, punto 2): completa esta vista.
//
// Esta función recibirá el objeto "params" que tu Router extraiga de la
// URL, por ejemplo params = { id: "2" } para la ruta "/item/2".
//
// Pasos sugeridos:
//   1. Dentro de esta función (NO como import estático arriba del
//      archivo), haz: const { default: ItemsService } = await
//      import("../services/itemsService.js");
//   2. Crea una instancia: const service = new ItemsService();
//   3. Usa service.getById(params.id) para obtener el elemento.
//   4. Si no existe, devuelve un HTML simple indicando "no encontrado".
//   5. Si existe, devuelve un <div class="card"> con sus campos
//      (título, descripción, meta...).
//
// TODO: una vez que funcione, ajusta qué campos mostrar y cómo
// se llaman en pantalla, según tu tema.

export default async function ItemDetailView(params) {
  const { default: ItemsService } = await import(
    "../services/itemsService.js"
  );

  const service = new ItemsService();

  const report = await service.getById(params.id);

  if (!report) {
    return `
      <div class="card">
        <h2>Reporte no encontrado</h2>
        <p>No existe un reporte con el identificador solicitado.</p>
        <a href="/" data-link>← Volver a los reportes</a>
      </div>
    `;
  }

  return `
    <div class="card">
      <h2>${report.title}</h2>

      <p>${report.description}</p>

      <p>
        <strong>Colonia:</strong>
        ${report.colonia}
      </p>

      <p>
        <strong>Tipo de reporte:</strong>
        ${report.tipo}
      </p>

      <p>
        <strong>Estado:</strong>
        ${report.estado}
      </p>

      <a href="/" data-link>
        ← Volver a los reportes
      </a>
    </div>
  `;
}