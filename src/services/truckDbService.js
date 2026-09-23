import { openDB } from "https://esm.sh/idb@8";

// Base independiente para conservar los reportes ciudadanos existentes.
const STORE = "solicitudes";
async function getDB() {
  return openDB("aquapaz-pipas", 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      store.createIndex("by-prioridad", "prioridad");
    },
  });
}
async function operation(action) {
  const db = await getDB();
  try { return await action(db); }
  finally { db.close(); }
}
export async function addSolicitud(data) {
  return operation(db => db.put(STORE, data));
}
export async function getAllSolicitudes() {
  return operation(db => db.getAll(STORE));
}
export async function getSolicitudesByPrioridad(prioridad) {
  return operation(db => db.getAllFromIndex(STORE, "by-prioridad", prioridad));
}
export async function deleteSolicitud(id) {
  return operation(db => db.delete(STORE, id));
}
