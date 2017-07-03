"use strict"

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var MachineManager = require("../../managers/master/machine-manager");

module.exports = class DimMachineEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.machineManager = new MachineManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date();
        this.migrationLog.insert({
            description: "Dim Machine from MongoDB to Azure DWH",
            start: startedDate,
        })
        return this.getTimestamp()
            .then((time) => this.extract(time))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then(() => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Dim Machine from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: "Successful"
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            }).catch((err) => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Dim Machine from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: err
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            })
    }

    getTimestamp() {
        return this.migrationLog.find({
            status: "Successful",
            description: "Dim Machine from MongoDB to Azure DWH"
        }).sort({ finish: -1 }).limit(1).toArray();
    }

    extract(times) {
        var time = times.length > 0 ? times[0].start : "1970-01-01";
        var timestamp = new Date(time);
        return this.machineManager.collection.find({
            _updatedDate: {
                "$gt": timestamp
            },
            "unit.division.name": "FINISHING & PRINTING"
        }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {
            return {
                machineCode: `'${item.code}'`,
                machineName: `'${item.name}'`,
                machineManufacture: `'${item.manufacture}'`,
                machineYear: `'${item.year}'`,
                machineProcess: `'${item.process}'`,
                machineCondition: `'${item.condition}'`,
                monthlyCapacity: item.monthlyCapacity ? `${item.monthlyCapacity}` : null,
                deleted: `'${item._deleted}'`
            }
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
                                var queryString = `insert into [DL_Dim_Mesin_Temp]([Kode Mesin], [Nama Mesin], [Manufaktur Mesin], [Tahun Mesin], [Proses Mesin], [Kondisi Mesin], [Kapasitas Mesin], [deleted]) values(${item.machineCode}, ${item.machineName}, ${item.machineManufacture}, ${item.machineYear}, ${item.machineProcess}, ${item.machineCondition}, ${item.monthlyCapacity}, ${item.deleted});\n`;
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
                                request.execute("DL_UPSERT_DIM_MESIN").then((execResult) => {
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


