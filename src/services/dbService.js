import { openDB } from "../vendor/idb.js";

const DB_NAME    = "aquapaz-db";
const DB_VERSION = 2;
const STORE      = "reportes";

export function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath:       "id",
          autoIncrement: true,
        });
        store.createIndex("by-tipo", "tipo");
      }
      for (const name of ['outbox', 'settings', 'snapshots', 'receipts']) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    },
  });
}

export async function addReporte(data) {
  const db = await getDB();
  return db.put(STORE, data);
}

export async function getAllReportes() {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function getReportesByTipo(tipo) {
  const db = await getDB();
  return db.getAllFromIndex(STORE, "by-tipo", tipo);
}

export async function deleteReporte(id) {
  const db = await getDB();
  return db.delete(STORE, id);
}
