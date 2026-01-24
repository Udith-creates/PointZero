const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../data.json');

// Initialize DB file if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ events: [], tickets: [], listings: [] }, null, 2));
}

class JsonDb {
    constructor(collectionName) {
        this.collectionName = collectionName;
    }

    _readDb() {
        if (!fs.existsSync(DB_FILE)) {
            return { events: [], tickets: [], listings: [] };
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error("Error parsing DB file:", e);
            return { events: [], tickets: [], listings: [] };
        }
    }

    _writeDb(data) {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    }

    async find(query = {}) {
        const db = this._readDb();
        const collection = db[this.collectionName] || [];
        return collection.filter(item => {
            for (let key in query) {
                // strict equality for simplicity
                if (item[key] != query[key]) return false;
            }
            return true;
        });
    }

    async findOne(query) {
        const results = await this.find(query);
        return results.length > 0 ? results[0] : null;
    }

    async create(data) {
        const db = this._readDb();
        if (!db[this.collectionName]) db[this.collectionName] = [];
        const newItem = { _id: Date.now().toString(), ...data }; // Add simple _id
        db[this.collectionName].push(newItem);
        this._writeDb(db);
        return newItem;
    }

    // Mongoose-like updateOne
    async updateOne(query, updateData) {
        const db = this._readDb();
        let collection = db[this.collectionName] || [];
        let found = false;

        collection = collection.map(item => {
            if (found) return item; // Update only first match

            let match = true;
            for (let key in query) {
                if (item[key] != query[key]) {
                    match = false;
                    break;
                }
            }

            if (match) {
                found = true;
                // Handle $inc, $set if needed, but for now assuming simple merge or special keys
                // Basic $inc support
                if (updateData.$inc) {
                    for (let k in updateData.$inc) {
                        if (typeof item[k] === 'number') {
                            item[k] += updateData.$inc[k];
                        }
                    }
                    delete updateData.$inc; // Remove processed $inc
                }
                return { ...item, ...updateData };
            }
            return item;
        });

        if (found) {
            db[this.collectionName] = collection;
            this._writeDb(db);
        }
        return { matchedCount: found ? 1 : 0 };
    }
}

module.exports = JsonDb;
