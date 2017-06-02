'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");

// internal deps 
require('mongodb-toolkit');

var StorageManager = require('../managers/master/storage-manager');

module.exports = class DimStorageEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.storageManager = new StorageManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date();
        this.migrationLog.insert({
            description: "Dim Storage from MongoDB to Azure DWH",
            start: startedDate
        })
        return this.getTimeStamp()
            .then((time) => this.extract(time))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then((result) => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Dim Storage from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: "Successful"
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            })
            .catch((err) => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Dim Storage from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: err
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            });
    }

    getTimeStamp() {
        return this.migrationLog.find({
            description: "Dim Storage from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({
            finishedDate: -1
        }).limit(1).toArray()
    }

    extract(time) {
        var timestamp = new Date(time[0].start);
        // var timestamp = new Date(1970, 1, 1);
        return this.storageManager.collection.find({
            _updatedDate: {
                "$gt": timestamp
            },
            _deleted: false
        }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {
            return {
                storageCode: item.code ? `'${item.code.replace(/'/g, '"')}'` : null,
                storageName: item.name ? `'${item.name.replace(/'/g, '"')}'` : null,
                storageDescription: item.description ? `'${item.description.replace(/'/g, '"')}'` : null,
                deleted: `'${item._deleted}'`, 
            };
        });
        return Promise.resolve([].concat.apply([], result));
    }

    insertQuery(sql, query) {
        return new Promise((resolve, reject) => {
            sql.query(query, function(err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            })
        })
    }

    load(data) {
        return new Promise((resolve, reject) => {
            this.sql.startConnection()
                .then(() => {

                    var transaction = this.sql.transaction();

                    transaction.begin((err) => {

                        var request = this.sql.transactionRequest(transaction);

                        var command = [];

                        var sqlQuery = '';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `INSERT INTO [DL_Dim_Storage_Temp]([code], [name], [description], [Deleted]) 
                                                    VALUES(${item.storageCode}, ${item.storageName}, ${item.storageDescription}, ${item.deleted}) ;\n`;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 === 0) {
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "";
                                }
                                console.log(`add data to query  : ${count}`);
                                count++;
                            }
                        }


                        if (sqlQuery !== "")

                            command.push(this.insertQuery(request, `${sqlQuery}`));

                        this.sql.multiple = true;

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_UPSERT_DIM_STORAGE").then((execResult) => {
                                    transaction.commit((err) => {
                                        if (err)
                                            reject(err);
                                        else
                                            resolve(results);
                                    });

                                }).catch((error) => {
                                    transaction.rollback((err) => {
                                        console.log("rollback")
                                        if (err)
                                            reject(err)
                                        else
                                            reject(error);
                                    });
                                })
                            })
                            .catch((error) => {
                                transaction.rollback((err) => {
                                    console.log("rollback");
                                    if (err)
                                        reject(err)
                                    else
                                        reject(error);
                                });
                            });
                    })
                })
                .catch((err) => {
                    reject(err);
                })
        })
            .catch((err) => {
                reject(err);
            })
    }
}
