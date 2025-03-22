import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../models/userDatabase.model";
import * as admin from "firebase-admin";

let appCache: Record<string, admin.app.App> = {};

function getFirebaseApp(db: UserDatabase): admin.app.App {
  const key = `${db.user_id}-${db.id}`;
  if (appCache[key]) return appCache[key];

  const credential = admin.credential.cert(JSON.parse(Buffer.from(db.encrypted_password!, "base64").toString()));
  
  const app = admin.initializeApp({ credential }, key);
  appCache[key] = app;
  return app;
}

export const firebaseClient: IDatabaseClient = {
  async connect(db: UserDatabase) {},

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const app = getFirebaseApp(db);
    const firestore = app.firestore();
    const collections = await firestore.listCollections();
    return collections.map(c => c.id);
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const app = getFirebaseApp(db);
    const firestore = app.firestore();
    const snapshot = await firestore.collection(table).limit(1).get();
    if (snapshot.empty) return [];
    return Object.keys(snapshot.docs[0].data());
  },

  async runQuery(db: UserDatabase, query: any): Promise<any> {
    const app = getFirebaseApp(db);
    const firestore = app.firestore();
    const snapshot = await firestore.collection(query.collection || query.table).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};
