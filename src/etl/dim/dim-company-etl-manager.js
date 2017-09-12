'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");


// internal deps 
require('mongodb-toolkit');

var CompanyManager = require('../../managers/master/company-manager');
const MIGRATION_LOG_DESCRIPTION = 'Dim Company from MongoDB to Azure DWH';
const SELECT = {
    _deleted: 1,
    code: 1,
    name: 1,
    website: 1,
    industry: 1,
    phoneNumber: 1,
    city: 1,
    information: 1
};

module.exports = class DimCompanyEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.companyManager = new CompanyManager(db, user);
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
        return this.companyManager.collection.find({
            _updatedDate: {
                "$gt": timestamp                
            },
        }, SELECT).toArray();
    }

    transform(data) {
        var result = data.map((item) => {
            return {
                deleted: `'${item._deleted}'`,
                code: item.code ? `'${item.code.replace(/'/g, '"')}'` : null,
                name: item.name ? `'${item.name.replace(/'/g, '"')}'` : null,
                website: item.website ? `'${item.website.replace(/'/g, '"')}'` : null,
                industry: item.industry ? `'${item.industry.replace(/'/g, '"')}'` : null,
                phoneNumber: item.phoneNumber ? `'${item.phoneNumber.replace(/'/g, '"')}'` : null,
                city: item.city ? `'${item.city.replace(/'/g, '"')}'` : null,
                information: item.information ? `'${item.information.replace(/'/g, '"')}'` : null
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

                        var sqlQuery = 'INSERT INTO [DL_Dim_Company_Temp](deleted, code, name, website, industry, phoneNumber, city, information) ';

                        var count = 1;
                        for (var item of data) {
                            if (item) {
                                var values = `${item.deleted}, ${item.code}, ${item.name}, ${item.website}, ${item.industry}, ${item.phoneNumber}, ${item.city}, ${item.information}`;
                                var queryString = `\nSELECT ${values} UNION ALL `;
                                
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 4000 === 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "INSERT INTO [DL_Dim_Company_Temp](deleted, code, name, website, industry, phoneNumber, city, information) ";
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
                                request.execute("DL_Upsert_Dim_Company").then((execResult) => {
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
