import { loadDatabase, saveDatabase, DEFAULT_SCHOOLS } from './server/database.js';

const db = loadDatabase();
if (!db.schools) db.schools = [];

for (const school of DEFAULT_SCHOOLS) {
    if (!db.schools.find(s => s.code === school.code)) {
        db.schools.unshift(school);
        console.log('Added school:', school.name);
    }
}
saveDatabase(db);
console.log('Done adding missing default schools.');
