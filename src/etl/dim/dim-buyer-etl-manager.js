'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");


// internal deps 
require('mongodb-toolkit');

var BuyerManager = require('../../managers/master/buyer-manager');

module.exports = class DimBuyerEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.buyerManager = new BuyerManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date();
        this.migrationLog.insert({
            description: "Dim Buyer from MongoDB to Azure DWH",
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
                    description: "Dim Buyer from MongoDB to Azure DWH",
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
                    description: "Dim Buyer from MongoDB to Azure DWH",
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
            description: "Dim Buyer from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({
            finishedDate: -1
        }).limit(1).toArray()
    }

    extract(times) {
        var time = times.length > 0 ? times[0].start : "1970-01-01";
        var timestamp = new Date(time);
        return this.buyerManager.collection.find({
            _updatedDate: {
                "$gt": timestamp
            },
            _deleted: false
        }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {
            return {
                buyerAddress: item.address ? `'${item.address.replace(/'/g, '"')}'` : null,
                buyerCity: item.city ? `'${item.city.replace(/'/g, '"')}'` : null,
                buyerCode: item.code ? `'${item.code.replace(/'/g, '"')}'` : null,
                buyerContact: item.contact ? `'${item.contact.replace(/'/g, '"')}'` : null,
                buyerCountry: item.country ? `'${item.country.replace(/'/g, '"')}'` : null,
                buyerName: item.name ? `'${item.name.replace(/'/g, '"')}'` : null,
                buyerNPWP: item.NPWP ? `'${item.NPWP.replace(/'/g, '"')}'` : null,
                buyerType: item.type ? `'${item.type.replace(/'/g, '"')}'` : null 
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
                                var queryString = `INSERT INTO [DL_Dim_Buyer_Temp]([Nama Buyer], [Kode Buyer], [Jenis Buyer], [Kontak Buyer], [NPWP Buyer], [Alamat Buyer], [Negara Buyer], [Kota Buyer]) VALUES(${item.buyerName}, ${item.buyerCode}, ${item.buyerType}, ${item.buyerContact}, ${item.buyerNPWP}, ${item.buyerAddress}, ${item.buyerCountry}, ${item.buyerCity}) ;\n`;
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
                                request.execute("DL_UPSERT_DIM_BUYER").then((execResult) => {
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
