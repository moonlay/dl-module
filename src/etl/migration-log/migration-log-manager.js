'use strict'

var BaseManager = require('module-toolkit').BaseManager;

module.exports = class MigrationLogManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use("migration-log");

    }

    _validate(valid) {

        //undifined validation

        return new Promise((resolve, reject) => {

            resolve(valid);
        })


    }

    getData(info) {

        return this.collection.aggregate(
            [
                { "$match": { "$and": [{ "status": "Successful" }, { "description": new RegExp(info.keyword, "i") }] } },
                { "$group": { "_id": { "description": "$description" }, "latestDate": { "$max": "$start" } } }
            ]
        ).toArray()

    };

    _createIndexes() {
        var dateIndex = {
            name: `migration log`,
            key: {
                _updatedDate: -1
            }
        };

        return this.collection.createIndexes([dateIndex]);
    }
};