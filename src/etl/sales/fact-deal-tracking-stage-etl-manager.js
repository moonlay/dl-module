'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");


// internal deps 
require('mongodb-toolkit');

var DealTrackingStageManager = require('../../managers/sales/deal-tracking-stage-manager');
const MIGRATION_LOG_DESCRIPTION = 'Fact Deal Tracking Stage from MongoDB to Azure DWH';
const SELECT = {
    _deleted: 1,
    _id: 1,
    code: 1,
    _createdDate: 1,
    _createdBy: 1,
    boardId: 1,
    name: 1,
    deals: 1
};

module.exports = class FactDealTrackingStageEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.dealTrackingStageManager = new DealTrackingStageManager(db, user);
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
        return this.dealTrackingStageManager.collection.find({
            _updatedDate: {
                "$gt": timestamp                
            },
        }, SELECT).toArray();
    }

    transform(data) {
        var results = data.map((item) => {
            return {
                deleted: `'${item._deleted}'`,
                id: `'${item._id.toString()}'`,
                code: item.code ? `'${item.code.replace(/'/g, '"')}'` : null,
                createdDate: `'${moment(item._createdDate).add(7, "hours").format("YYYY-MM-DD")}'`,
                createdBy: `'${item._createdBy}'`,
                boardId: `'${item.boardId.toString()}'`,
                name: item.name ? `'${item.name.replace(/'/g, '"')}'` : null,
            };
        });
        results = [].concat.apply([], results);

        var resultMap = data.map((item) => {
            var deals = item.deals.map((deal) => {
                return {
                    stageId: `'${item._id.toString()}'`,
                    dealId: `'${deal.toString()}'`
                }
            });

            return deals;
        });

        resultMap = [].concat.apply([], resultMap);

        var trf = {
            stages: results,
            deals: resultMap
        };

        return Promise.resolve(trf);
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

                        var sqlQuery = 'INSERT INTO [DL_Fact_Deal_Tracking_Stage_Temp](deleted, id, code, createdDate, createdBy, boardId, name) ';
                        
                        var count = 1;
                        for (var item of data.stages) {
                            if (item) {
                                var values = `${item.deleted}, ${item.id}, ${item.code}, ${item.createdDate}, ${item.createdBy}, ${item.boardId}, ${item.name}`;
                                var queryString = `\nSELECT ${values} UNION ALL `;
                                
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 4000 === 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "INSERT INTO [DL_Fact_Deal_Tracking_Stage_Temp](deleted, id, code, createdDate, createdBy, title, boardId, name) ";
                                }
                                console.log(`add data to query  : ${count}`);
                                count++;
                            }
                        }

                        var sqlQueryMap = 'INSERT INTO [DL_Fact_Deal_Tracking_Stage_Deal_Temp](stageId, dealId) ';
                        var countMap = 1;
                        for (var deal of data.deals) {
                            if (deal) {
                                var valuesMap = `${deal.stageId}, ${deal.dealId}`;
                                var queryStringMap = `\nSELECT ${valuesMap} UNION ALL `;
                                
                                sqlQueryMap = sqlQueryMap.concat(queryStringMap);
                                if (countMap % 4000 === 0) {
                                    sqlQueryMap = sqlQueryMap.substring(0, sqlQueryMap.length - 10);
                                    command.push(this.insertQuery(request, sqlQueryMap));
                                    sqlQueryMap = "INSERT INTO [DL_Fact_Deal_Tracking_Stage_Deal_Temp](stageId, dealId) ";
                                }
                                console.log(`add data map to query  : ${countMap}`);
                                countMap++;
                            }
                        }

                        if (sqlQuery !== "") {
                            sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                            command.push(this.insertQuery(request, `${sqlQuery}`));
                        }

                        if (sqlQueryMap !== "") {
                            sqlQueryMap = sqlQueryMap.substring(0, sqlQueryMap.length - 10);
                            command.push(this.insertQuery(request, `${sqlQueryMap}`));
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
                                request.execute("DL_Upsert_Fact_Deal_Tracking_Stage").then((execResult) => {
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
