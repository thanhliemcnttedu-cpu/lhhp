import { loadDatabase, saveDatabase, DEFAULT_USERS } from './server/database.ts';

const db = loadDatabase();
if (!db.users) db.users = [];

let added = 0;
for (const user of DEFAULT_USERS) {
    if (!db.users.find(u => u.username === user.username)) {
        db.users.push(user);
        console.log('Added missing user:', user.username);
        added++;
    }
}
if (added > 0) {
    saveDatabase(db);
    console.log('Saved db with', added, 'new users.');
} else {
    console.log('All default users already present. Total users:', db.users.length);
}
