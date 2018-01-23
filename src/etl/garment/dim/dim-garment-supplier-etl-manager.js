'use strict'

// external deps 
var BaseManager = require('module-toolkit').BaseManager;

const DESCRIPTION = "Dim Garment Supplier from MongoDB to Azure DWH";
var moment = require('moment');

// internal deps 
require('mongodb-toolkit');

var GarmentSupplierManager = require('../../../managers/master/garment-supplier-manager');

module.exports = class DimGarmentSupplierEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.garmentSupplierManager = new GarmentSupplierManager(db, user);
        this.migrationLog = this.db.collection("migration-log");

    }
    run() {
        var startedDate = new Date();
        this.migrationLog.insert({
            description: DESCRIPTION,
            start: startedDate,
        })
        return this.getTimeStamp()
            .then((data) => this.extract(data))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then(() => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: DESCRIPTION,
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
                    description: DESCRIPTION,
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
            description: DESCRIPTION,
            status: "Successful"
        }).sort({
            finish: -1
        }).limit(1).toArray()
    }

    extract(times) {
        var time = times.length > 0 ? times[0].start : "1970-01-01";
        var timestamp = new Date(time);
        return this.garmentSupplierManager.collection.find({
            _deleted: false,
            _createdBy: {
                "$nin": ["dev", "unit-test"],
            },
            _updatedDate: {
                "$gt": timestamp
            }
        }, { "code": 1, "name": 1 }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {

            return {
                supplierCode: item.code ? `'${item.code}'` : null,
                supplierName: item.name ? `'${item.name.replace(/'/g, '"')}'` : null
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
                                var queryString = `insert into DL_Dim_Garment_Supplier_Temp(Kode_Supplier, Nama_Supplier) values(${item.supplierCode}, ${item.supplierName});\n`;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 == 0) {
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
                                request.execute("DL_UPSERT_DIM_GARMENT_SUPPLIER").then((execResult) => {
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
