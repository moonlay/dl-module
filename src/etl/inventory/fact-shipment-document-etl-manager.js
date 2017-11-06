'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var FPShipmentDocumentManager = require("../../managers/inventory/finishing-printing/fp-shipment-document-manager");
const MIGRATION_LOG_DESCRIPTION = "Fact Shipment Document from MongoDB to Azure DWH";
const SELECTED_FIELDS = {
    "buyerCode": 1,
    "buyerName": 1,
    "buyerType": 1,
    "code": 1,
    "deliveryDate": 1,
    "isVoid": 1,
    "details.designCode": 1,
    "details.designNumber": 1,
    "details.productionOrderNo": 1,
    "details.productionOrderType": 1,
    "details.items.colorType": 1,
    "details.items.length": 1,
    "details.items.productCode": 1,
    "details.items.productName": 1,
    "details.items.quantity": 1,
    "details.items.uomUnit": 1,
    "details.items.weight": 1
};

module.exports = class FPShipmentDocumentEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.fpShipmentDocumentManager = new FPShipmentDocumentManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date()
        this.migrationLog.insert({
            description: MIGRATION_LOG_DESCRIPTION,
            start: startedDate,
        })
        return this.timestamp()
            .then((time) => this.extract(time))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then((results) => {
                console.log("Success!")
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
    };

    timestamp() {
        return this.migrationLog.find({
            description: MIGRATION_LOG_DESCRIPTION,
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extract(times) {
        var time = times.length > 0 ? times[0].start : "1970-01-01";
        var timestamp = new Date(time);
        return this.fpShipmentDocumentManager.collection.find({
            _updatedDate: {
                $gt: timestamp
            }
        }, SELECTED_FIELDS).toArray();
    }

    transform(shipments) {
        var result = shipments.map((shipment) => {
            var results = shipment.details.map((detail) => {
                var resultss = detail.items.map((item) => {
                    return {
                        buyerCode: shipment.buyerCode ? `'${shipment.buyerCode}'` : null,
                        buyerName: shipment.buyerName ? `'${shipment.buyerName}'` : null,
                        buyerType: shipment.buyerType ? `'${shipment.buyerType}'` : null,
                        shipmentCode: shipment.code ? `'${shipment.code}'` : null,
                        deliveryDate: shipment.deliveryDate ? `'${moment(shipment.deliveryDate).subtract(7, "hours").format("L")}'` : null,
                        isVoid: `'${shipment.isVoid}'`,
                        designCode: detail.designCode ? `'${detail.designCode}'` : null,
                        designNumber: detail.designNumber ? `'${detail.designNumber}'` : null,
                        productionOrderNo: detail.productionOrderNo ? `'${detail.productionOrderNo}'` : null,
                        productionOrderType: detail.productionOrderType ? `'${detail.productionOrderType}'` : null,
                        colorType: item.colorType ? `'${item.colorType}'` : null,
                        length: item.length ? `${item.length}` : null,
                        productCode: item.productCode ? `'${item.productCode}'` : null,
                        productName: item.productName ? `'${item.productName}'` : null,
                        quantity: item.quantity ? `${item.quantity}` : null,
                        uomUnit: item.uomUnit ? `'${item.uomUnit}'` : null,
                        weight: item.weight ? `${item.weight}` : null
                    }
                });
                return [].concat.apply([], resultss);
            });
            return [].concat.apply([], results);
        })
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

                        var sqlQuery = 'INSERT INTO [DL_Fact_Shipment_Document] ';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `\nSELECT ${item.buyerCode}, ${item.buyerName}, ${item.buyerType}, ${item.shipmentCode}, ${item.deliveryDate}, ${item.isVoid}, ${item.designCode}, ${item.designNumber}, ${item.productionOrderNo}, ${item.productionOrderType}, ${item.colorType}, ${item.length}, ${item.productCode}, ${item.productName}, ${item.quantity}, ${item.uomUnit}, ${item.weight} UNION ALL `;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 === 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "";
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
                                request.execute("DL_UPSERT_FACT_SHIPMENT_DOCUMENT").then((execResult) => {
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