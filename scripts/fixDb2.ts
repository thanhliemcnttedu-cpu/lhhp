import { loadDatabase } from './server/database.js';
const db = loadDatabase();
console.log(JSON.stringify(db.schools, null, 2));
