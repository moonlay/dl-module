'use strict'

// external deps 
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");


// internal deps 
require('mongodb-toolkit');

var ProcessTypeManager = require('../managers/master/process-type-manager');

module.exports = class ProcessTypeEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.processTypeManager = new ProcessTypeManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date();
        this.migrationLog.insert({
            description: "Dim Process Type from MongoDB to Azure DWH",
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
                    description: "Dim Process Type from MongoDB to Azure DWH",
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
                    description: "Dim Process Type from MongoDB to Azure DWH",
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
            description: "Dim Process Type from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({
            finishedDate: -1
        }).limit(1).toArray()
    }

    extract(times) {
        var time = times.length > 0 ? time[0].start : "1970-01-01";
        var timestamp = new Date(time);
        return this.processTypeManager.collection.find({
            _updatedDate: {
                "$gt": timestamp
            },
            _deleted: false
        }, {
                code: 1,
                name: 1
            }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {
            return {
                code: item.code ? `'${item.code}'` : null,
                name: item.name ? `'${item.name}'` : null
            };
        });
        return Promise.resolve([].concat.apply([], result));
    }

    insertQuery(sql, query) {
        return new Promise((resolve, reject) => {
            sql.query(query, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            })
        })
    }

    newInsert(query) {
        var queryString = query;
        return new Promise((resolve, reject) => {
            this.sql.startConnection()
                .then(() => {
                    var transaction = this.sql.transaction();
                    transaction.begin((err) => {
                        var request = this.sql.transactionRequest(transaction);
                        var command = [];
                        command.push(this.insertQuery(request, queryString))
                        return Promise.all(command)
                            .then((result) => {
                                transaction.commit((err) => {
                                    if (err) {
                                        reject(err)
                                    } else {
                                        resolve(result)
                                    }
                                })
                            })
                            .catch((error) => {
                                transaction.rollback((err) => {
                                    console.log("rollback");
                                    if (err) {
                                        reject(err);
                                    } else {
                                        reject(error)
                                    }
                                })
                            })
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
                                var queryString = `INSERT INTO [DL_Dim_Process_Type_Temp](code, [name]) VALUES(${item.code}, ${item.name});\n`;
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
                                request.execute("[DL_Upsert_Dim_Process_Type]").then((execResult) => {
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
