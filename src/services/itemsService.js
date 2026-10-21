import {resource, escapeHTML as e} from './apiService.js';
export default class ItemsService {
  async getAll() {
    const {data} = await resource('/api/reportes');
    return data.map(r=>({...r, title:e(r.tipo), description:e(r.comentario), colonia:e(r.colonia), tipo:e(r.tipo), estado:e(r.estado)}));
  }
  async getById(id) { return (await this.getAll()).find(r=>String(r.id)===String(id)) || null; }
}
