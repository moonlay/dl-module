'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");


// internal deps 
require('mongodb-toolkit');

var DealTrackingActivityManager = require('../../managers/sales/deal-tracking-activity-manager');
const MIGRATION_LOG_DESCRIPTION = 'Fact Deal Tracking Activity from MongoDB to Azure DWH';
const SELECT = {
    _deleted: 1,
    _id: 1,
    code: 1,
    _createdDate: 1,
    _createdBy: 1,
    dealId: 1,
    type: 1,
    "field.notes": 1,
    "field.title": 1,
    "field.dueDate": 1,
    "field.status": 1,
    "field.assignedTo.username": 1,
    "field.sourceStageId": 1,
    "field.sourceTargetId": 1
};

module.exports = class FactDealTrackingActivityEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.dealTrackingActivityManager = new DealTrackingActivityManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date();
        this.migrationLog.insert({
            description: MIGRATION_LOG_DESCRIPTION,
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
                    description: MIGRATION_LOG_DESCRIPTION,
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
                    description: MIGRATION_LOG_DESCRIPTION,
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
            description: MIGRATION_LOG_DESCRIPTION,
            status: "Successful"
        }).sort({
            finish: -1
        }).limit(1).toArray()
    }

    extract(times) {
        var time = times.length > 0 ? times[0].start : "1970-01-01";
        var timestamp = new Date(time);
        return this.dealTrackingActivityManager.collection.find({
            _updatedDate: {
                "$gt": timestamp                
            },
        }, SELECT).toArray();
    }

    transform(data) {
        var result = data.map((item) => {
            return {
                deleted: `'${item._deleted}'`,
                id: `'${item._id.toString()}'`,
                code: item.code ? `'${item.code.replace(/'/g, '"')}'` : null,
                createdDate: `'${moment(item._createdDate).add(7, "hours").format("YYYY-MM-DD")}'`,
                createdBy: `'${item._createdBy}'`,
                dealId: item.dealId ? `'${item.dealId.toString()}'` : null,
                type: item.type ? `'${item.type.replace(/'/g, '"')}'` : null,
                notes: item.field ? item.field.notes ? `'${item.field.notes.replace(/'/g, '"')}'` : null : null,
                title: item.field ? item.field.title ? `'${item.field.title.replace(/'/g, '"')}'` : null : null,
                dueDate: item.field ? item.field.dueDate ? `'${moment(item.field.dueDate).add(7, "hours").format("YYYY-MM-DD")}'` : null : null,
                status: item.field ? item.field.status != undefined ? `'${item.field.status}'` : null : null,
                sourceStageId: item.field ? item.field.sourceStageId ? `'${item.field.sourceStageId.toString().replace(/'/g, '"')}'` : null : null,
                targetStageId: item.field ? item.field.targetStageId ? `'${item.field.targetStageId.toString().replace(/'/g, '"')}'` : null : null,
                assignedTo: item.field ? item.field.assignedTo ? `'${item.field.assignedTo.username.replace(/'/g, '"')}'` : null : null
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

                        var sqlQuery = 'INSERT INTO [DL_Fact_Deal_Tracking_Activity_Temp](deleted, id, code, createdDate, createdBy, dealId, type, notes, title, dueDate, status, sourceStageId, targetStageId, assignedTo) ';

                        var count = 1;
                        for (var item of data) {
                            if (item) {
                                var values = `${item.deleted}, ${item.id}, ${item.code}, ${item.createdDate}, ${item.createdBy}, ${item.dealId}, ${item.type}, ${item.notes}, ${item.title}, ${item.dueDate}, ${item.status}, ${item.sourceStageId}, ${item.targetStageId}, ${item.assignedTo}`;
                                var queryString = `\nSELECT ${values} UNION ALL `;
                                
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 4000 === 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "INSERT INTO [DL_Fact_Deal_Tracking_Activity_Temp](deleted, id, code, createdDate, createdBy, dealId, type, notes, title, dueDate, status, sourceStageId, targetStageId, assignedTo) ";
                                }
                                console.log(`add data to query  : ${count}`);
                                count++;
                            }
                        }


                        if (sqlQuery !== "") {
                            sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                            command.push(this.insertQuery(request, `${sqlQuery}`));
                        }
                            
                        this.sql.multiple = true;

                        // var fs = require("fs");
                        // var path = "C:\\Users\\jacky.rusly\\Desktop\\Log.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_Upsert_Fact_Deal_Tracking_Activity").then((execResult) => {
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
