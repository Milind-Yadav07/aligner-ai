import Dexie, { type EntityTable } from 'dexie';

export interface HistoryEntry {
  id?: number;
  jobTitle: string;
  fileName: string;
  timestamp: number;
  fileBlob: Blob;
}

const db = new Dexie('AlignerDB') as Dexie & {
  history: EntityTable<
    HistoryEntry,
    'id' // primary key "id" (for the typings only)
  >;
};

// Schema declaration:
db.version(1).stores({
  history: '++id, jobTitle, fileName, timestamp' // primary key "id" (auto-incremented)
});

export const addToHistory = async (entry: Omit<HistoryEntry, 'id'>) => {
  return await db.history.add(entry);
};

export const getHistory = async () => {
  return await db.history.orderBy('timestamp').reverse().toArray();
};

export const deleteFromHistory = async (id: number) => {
  return await db.history.delete(id);
};

export default db;
