'use strict'

const MIGRATION_LOG = "Fact Inspection Lot Color from MongoDB to Azure DWH";
// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");
const SELECTED_FIELDS = {
    "_deleted": 1,
    "code": 1,
    "fabricQualityControlCode": 1,
    "productionOrderNo": 1,
    "productionOrderType": 1,
    "cartNo": 1,
    "construction": 1,
    "color": 1,
    "orderQuantity": 1,
    "uom": 1,
    "date": 1,
    "items.pcsNo": 1,
    "items.grade": 1,
    "items.lot": 1,
    "items.status": 1,
    "kanbanCode": 1
}

// internal deps 
require("mongodb-toolkit");

var InspectionLotManager = require("../../managers/production/finishing-printing/inspection-lot-color-manager");

module.exports = class FactInspectionLotETLManagerEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.inspectionLotManager = new InspectionLotManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date()
        this.migrationLog.insert({
            description: MIGRATION_LOG,
            start: startedDate,
        })
        return this.timestamp()
            .then((time) => this.extract(time))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then((results) => {
                console.log("Success!");
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                   description: MIGRATION_LOG,
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
                    description: MIGRATION_LOG,
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: err
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            });
    };

    timestamp() {
        return this.migrationLog.find({
            description: MIGRATION_LOG,
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extract(times) {
        var time = times.length > 0 ? times[0].start : "1970-01-01";
        var timestamp = new Date(time);
        return this.inspectionLotManager.collection.find({
            "_updatedDate": {
                $gte: timestamp
            }
        }, SELECTED_FIELDS).toArray();
    }

    transform(data) {
        var result = data.map((inspectionLotColor) => {
            var detail = inspectionLotColor.items && inspectionLotColor.items.length > 0 ? inspectionLotColor.items : [];

            if (detail) {
                var inspectionLotColorData = detail.map((item) => {
                    return {
                        deleted: `'${inspectionLotColor._deleted}'`,
                        code: inspectionLotColor.code ? `'${inspectionLotColor.code}'` : null,
                        fabricQualityControlCode: inspectionLotColor.fabricQualityControlCode ? `'${inspectionLotColor.fabricQualityControlCode}'` : null,
                        productionOrderNo: inspectionLotColor.productionOrderNo ? `'${inspectionLotColor.productionOrderNo}'` : null,
                        productionOrderType: inspectionLotColor.productionOrderType ? `'${inspectionLotColor.productionOrderType.replace(/'/g, '"')}'` : null,
                        cartNo: inspectionLotColor.cartNo ? `'${inspectionLotColor.cartNo.replace(/'/g, '"')}'` : null,
                        construction: inspectionLotColor.construction ? `'${inspectionLotColor.construction.replace(/'/g, '"')}'` : null,
                        color: inspectionLotColor.color ? `'${inspectionLotColor.color.replace(/'/g, '"')}'` : null,
                        orderQuantity: inspectionLotColor.orderQuantity ? `'${inspectionLotColor.orderQuantity}'` : null,
                        uom: inspectionLotColor.uom ? `'${inspectionLotColor.uom.replace(/'/g, '"')}'` : null,
                        date: inspectionLotColor.date ? `'${moment(inspectionLotColor.dateStart).add(7, "hours").format("YYYY-MM-DD")}'` : null,
                        pcsNo: item.pcsNo ? `'${item.pcsNo.replace(/'/g, '"')}'` : null,
                        grade: item.grade ? `'${item.grade.replace(/'/g, '"')}'` : null,
                        lot: item.lot ? `'${item.lot.replace(/'/g, '"')}'` : null,
                        status: item.status ? `'${item.status.replace(/'/g, '"')}'` : null,
                        kanbanCode: inspectionLotColor.kanbanCode ? `'${inspectionLotColor.kanbanCode}'` : null
                    }
                });
                return [].concat.apply([], inspectionLotColorData);
            }
        });
        return Promise.resolve([].concat.apply([], result));
    };

    insertQuery(sql, query) {
        return new Promise((resolve, reject) => {
            sql.query(query, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                };
            });
        });
    };

    load(data) {
        return new Promise((resolve, reject) => {
            this.sql.startConnection()
                .then(() => {

                    var transaction = this.sql.transaction();

                    transaction.begin((err) => {

                        var request = this.sql.transactionRequest(transaction);

                        var command = [];

                        var sqlQuery = 'INSERT INTO [DL_Fact_InspectionLotColor_Temp] ';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `\nSELECT ${item.deleted}, ${item.code}, ${item.fabricQualityControlCode}, ${item.productionOrderNo}, ${item.productionOrderType}, ${item.cartNo}, ${item.construction}, ${item.color}, ${item.orderQuantity}, ${item.uom}, ${item.date}, ${item.pcsNo}, ${item.grade}, ${item.lot}, ${item.status}, ${item.kanbanCode} UNION ALL `;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 === 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "INSERT INTO [DL_Fact_InspectionLotColor_Temp] ";
                                }
                                console.log(`add data to query  : ${count}`);
                                count++;
                            }
                        }

                        if (sqlQuery != "") {
                            sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                            command.push(this.insertQuery(request, `${sqlQuery}`));
                        }

                        this.sql.multiple = true;

                        // var fs = require("fs");
                        // var path = "C:\\Users\\jacky.rusly\\Desktop\\inspection.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_UPSERT_FACT_INSPECTIONLOTCOLOR").then((execResult) => {
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