const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "db", "database.json");

/**
 * Read the entire database from disk.
 */
function readDB() {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
}

/**
 * Write the entire database to disk.
 */
function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Helper – get a single collection by name.
 */
function getCollection(name) {
    const db = readDB();
    return db[name] || [];
}

/**
 * Helper – overwrite a single collection by name.
 */
function setCollection(name, items) {
    const db = readDB();
    db[name] = items;
    writeDB(db);
}

/**
 * Push one document into a collection.
 */
function insertOne(collection, doc) {
    const db = readDB();
    if (!db[collection]) db[collection] = [];
    db[collection].push(doc);
    writeDB(db);
    return doc;
}

/**
 * Find one document that matches a predicate.
 */
function findOne(collection, predicate) {
    const items = getCollection(collection);
    return items.find(predicate) || null;
}

/**
 * Find all documents that match a predicate.
 */
function findMany(collection, predicate) {
    const items = getCollection(collection);
    return items.filter(predicate);
}

/**
 * Update all documents that match a predicate using an updater function.
 * Returns the number of documents updated.
 */
function updateMany(collection, predicate, updater) {
    const db = readDB();
    let count = 0;
    db[collection] = (db[collection] || []).map((doc) => {
        if (predicate(doc)) {
            count++;
            return updater(doc);
        }
        return doc;
    });
    writeDB(db);
    return count;
}

/**
 * Remove documents that match a predicate.
 */
function removeMany(collection, predicate) {
    const db = readDB();
    const before = (db[collection] || []).length;
    db[collection] = (db[collection] || []).filter((doc) => !predicate(doc));
    writeDB(db);
    return before - db[collection].length;
}

module.exports = {
    readDB,
    writeDB,
    getCollection,
    setCollection,
    insertOne,
    findOne,
    findMany,
    updateMany,
    removeMany,
};
