'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");


// internal deps 
require('mongodb-toolkit');

var DealTrackingDealManager = require('../../managers/sales/deal-tracking-deal-manager');
const MIGRATION_LOG_DESCRIPTION = 'Fact Deal Tracking Deal from MongoDB to Azure DWH';
const SELECT = {
    _deleted: 1,
    _id: 1,
    code: 1,
    _createdDate: 1,
    _createdBy: 1,
    name: 1,
    amount: 1,
    "company.code": 1,
    "company.name": 1,
    "company.city": 1,
    "contact.code": 1,
    "contact.firstName": 1,
    "contact.lastName": 1,
    closeDate: 1,
    description: 1,
    reason: 1
};

module.exports = class FactDealTrackingDealEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.dealTrackingDealManager = new DealTrackingDealManager(db, user);
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
        return this.dealTrackingDealManager.collection.find({
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
                name: item.name ? `'${item.name.replace(/'/g, '"')}'` : null,
                amount: `'${item.amount}'`,
                companyCode: item.company ? `'${item.company.code.replace(/'/g, '"')}'` : null,
                companyName: item.company ? `'${item.company.name.replace(/'/g, '"')}'` : null,
                companyCity: item.company ? `'${item.company.city.replace(/'/g, '"')}'` : null,
                contactCode: item.contact ? `'${item.contact.code.replace(/'/g, '"')}'` : null,
                contactName: item.contact ? `'${item.contact.firstName.replace(/'/g, '"')} ${item.contact.lastName.replace(/'/g, '"')}'` : null,
                closeDate: item.closeDate ? `'${moment(item.closeDate).add(7, "hours").format("YYYY-MM-DD")}'` : null,
                description: item.description ? `'${item.description.replace(/'/g, '"')}'` : null,
                reason: item.reason ? `'${item.reason.replace(/'/g, '"')}'` : null
            };
        });
        return Promise.resolve([].concat.apply([], results));
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

                        var sqlQuery = 'INSERT INTO [DL_Fact_Deal_Tracking_Deal_Temp](deleted, id, code, createdDate, createdBy, name, amount, companyCode, companyName, contactCode, contactName, closeDate, description, reason, companyCity) ';
                        
                        var count = 1;
                        for (var item of data) {
                            if (item) {
                                var values = `${item.deleted}, ${item.id}, ${item.code}, ${item.createdDate}, ${item.createdBy}, ${item.name}, ${item.amount}, ${item.companyCode}, ${item.companyName}, ${item.contactCode}, ${item.contactName}, ${item.closeDate}, ${item.description}, ${item.reason}, ${item.companyCity}`;
                                var queryString = `\nSELECT ${values} UNION ALL `;
                                
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 4000 === 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "INSERT INTO [DL_Fact_Deal_Tracking_Deal_Temp](deleted, id, code, createdDate, createdBy, name, amount, companyCode, companyName, contactCode, contactName, closeDate, description, reason, companyCity) ";
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
                                request.execute("DL_Upsert_Fact_Deal_Tracking_Deal").then((execResult) => {
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
