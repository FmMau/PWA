import { slugify } from "../utils/slugify.js";

export default function ItemCard(item) {
  const slug = slugify(item.title);

  return `
    <article class="card" data-slug="${slug}">
      <h3>${item.title}</h3>
      <p>${item.description}</p>

      <p><strong>Colonia:</strong> ${item.colonia}</p>
      <p><strong>Tipo:</strong> ${item.tipo}</p>
      <p><strong>Estado:</strong> ${item.estado}</p>

      <a href="/item/${item.id}" data-link>
        Ver reporte →
      </a>
    </article>
  `;
}