

const ITEMS = [
  {
    id: "1",
    title: "Fuga de agua",
    description:
      "Se reporta una fuga en la calle.",
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
    title: "Baja presión",
    description:
      "Presenta presión muy baja.",
    colonia: "El Centenario",
    tipo: "Baja presión",
    estado: "Pendiente",
  },
  {
    id: "4",
    title: "Fuga en toma domiciliaria",
    description:
      "Se detecto una fuga cerca de una toma domiciliaria.",
    colonia: "Indeco",
    tipo: "Fuga",
    estado: "Atendido",
  },
];

export default class ItemsService {
  async getAll() {
    return ITEMS;
  }

  async getById(id) {
    return ITEMS.find((item) => item.id === id) ?? null;
  }
}
