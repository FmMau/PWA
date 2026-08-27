import ItemCard from "../components/ItemCard.js";

const reports = [
  {
    id: "1",
    title: "Fuga de agua en vía pública",
    description:
      "Se reporta una fuga constante de agua potable en la calle principal.",
    colonia: "Centro",
    tipo: "Fuga",
    estado: "Pendiente",
  },
  {
    id: "2",
    title: "Falta de suministro de agua",
    description:
      "Vecinos reportan falta de agua potable desde hace dos días.",
    colonia: "Camino Real",
    tipo: "Desabasto",
    estado: "En revisión",
  },
  {
    id: "3",
    title: "Baja presión de agua",
    description:
      "El suministro presenta presión muy baja durante gran parte del día.",
    colonia: "El Centenario",
    tipo: "Baja presión",
    estado: "Pendiente",
  },
  {
    id: "4",
    title: "Fuga en toma domiciliaria",
    description:
      "Se detectó una fuga cerca de una toma domiciliaria.",
    colonia: "Indeco",
    tipo: "Fuga",
    estado: "Atendido",
  },
];

export default async function ReportsView() {
  return `
    <section class="page">

      <div class="page-header">
        <div>
          <span class="page-eyebrow">
            Operación
          </span>

          <h2>Reportes ciudadanos</h2>

          <p>
            Consulta y da seguimiento a las incidencias
            relacionadas con el suministro de agua.
          </p>
        </div>
      </div>

      <div class="grid">
        ${reports
          .map((report) => ItemCard(report))
          .join("")}
      </div>

    </section>
  `;
}