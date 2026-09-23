import { openDB } from "https://esm.sh/idb@8";

const DB_NAME    = "aquapaz-db";
const DB_VERSION = 1;
const STORE      = "reportes";

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath:       "id",
          autoIncrement: true,
        });
        store.createIndex("by-tipo", "tipo");
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
