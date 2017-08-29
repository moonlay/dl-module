'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var FPPackingReceiptManager = require("../../managers/inventory/finishing-printing/fp-packing-receipt-manager");
const MIGRATION_LOG_DESCRIPTION = "Fact FP Packing Receipt from MongoDB to Azure DWH"
const SELECT = {
    _deleted: 1,
    code: 1,
    date: 1,
    packingCode: 1,
    accepted: 1,
    declined: 1,
    referenceNo: 1,
    referenceType: 1,
    type: 1,
    productionOrderNo: 1,
    buyer: 1,
    colorName: 1,
    construction: 1,
    packingUom: 1,
    orderType: 1,
    colorType: 1,
    designCode: 1,
    designNumber: 1,
    "items.product": 1,
    "items.quantity": 1,
    "items.length": 1,
    "items.weight": 1
};

module.exports = class FactFPPackingReceiptEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.fpPackingReceiptManager = new FPPackingReceiptManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date();
        this.migrationLog.insert({
            description: MIGRATION_LOG_DESCRIPTION,
            start: startedDate,
        });
        return this.timestamp()
            .then((time) => this.extract(time))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then((results) => {
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
        return this.fpPackingReceiptManager.collection.find({
            _updatedDate: {
                $gt: timestamp
            }
        }, SELECT).toArray();
    }

    transform(data) {
        var results = data.map((fpPackingReceipt) => {
            var fpPackingReceiptItems = fpPackingReceipt.items && fpPackingReceipt.items.length > 0 ? fpPackingReceipt.items : null;
            
            if (fpPackingReceiptItems) {
                var items = fpPackingReceiptItems.map((item) => {
                    return {
                        deleted: `'${fpPackingReceipt._deleted}'`,
                        code: fpPackingReceipt.code ? `'${fpPackingReceipt.code}'` : null,
                        date: fpPackingReceipt.date ? `'${moment(fpPackingReceipt.date).format("L")}'` : null,
                        packingCode: fpPackingReceipt.packingCode ? `'${fpPackingReceipt.packingCode}'` : null,
                        accepted: `'${fpPackingReceipt.accepted}'`,
                        declined: `'${fpPackingReceipt.declined}'`,
                        referenceNo: fpPackingReceipt.referenceNo ? `'${fpPackingReceipt.referenceNo}'` : null,
                        referenceType: fpPackingReceipt.referenceType ? `'${fpPackingReceipt.referenceType}'` : null,
                        type: fpPackingReceipt.type ? `'${fpPackingReceipt.type}'` : null,
                        productionOrderNo: fpPackingReceipt.productionOrderNo ? `'${fpPackingReceipt.productionOrderNo}'` : null,
                        buyer: fpPackingReceipt.buyer ? `'${fpPackingReceipt.buyer}'` : null,
                        colorName: fpPackingReceipt.colorName ? `'${fpPackingReceipt.colorName}'` : null,
                        construction: fpPackingReceipt.construction ? `'${fpPackingReceipt.construction}'` : null,
                        packingUom: fpPackingReceipt.packingUom ? `'${fpPackingReceipt.packingUom}'` : null,
                        orderType: fpPackingReceipt.orderType ? `'${fpPackingReceipt.orderType}'` : null,
                        colorType: fpPackingReceipt.colorType ? `'${fpPackingReceipt.colorType}'` : null,
                        designCode: fpPackingReceipt.designCode ? `'${fpPackingReceipt.designCode}'` : null,
                        designNumber: fpPackingReceipt.designNumber ? `'${fpPackingReceipt.designNumber}'` : null,
                        product: item.product ? `'${item.product}'` : null,
                        quantity: item.quantity ? `'${item.quantity}'` : null,
                        length: item.length ? `'${item.length}'` : null,
                        weight: item.weight ? `'${item.weight}'` : null
                    }
                });

                return [].concat.apply([], items);
            }
        });
        return Promise.resolve([].concat.apply([], results));
    }

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

                        var sqlQuery = 'INSERT INTO [dbo].[DL_Fact_FPPackingReceipt_Temp]([deleted], [code], [date], [packingCode], [accepted], [declined], [referenceNo], [referenceType], [type], [productionOrderNo], [buyer], [colorName], [construction], [packingUOM], [orderType], [colorType], [designCode], [designNumber], [product], [quantity], [length], [weight]) ';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `\nSELECT ${item.deleted}, ${item.code}, ${item.date}, ${item.packingCode}, ${item.accepted}, ${item.declined}, ${item.referenceNo}, ${item.referenceType}, ${item.type}, ${item.productionOrderNo}, ${item.buyer}, ${item.colorName}, ${item.construction}, ${item.packingUom}, ${item.orderType}, ${item.colorType}, ${item.designCode}, ${item.designNumber}, ${item.product}, ${item.quantity}, ${item.length}, ${item.weight} UNION ALL `;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 4000 === 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "INSERT INTO [dbo].[DL_Fact_FPPackingReceipt_Temp]([deleted], [code], [date], [packingCode], [accepted], [declined], [referenceNo], [referenceType], [type], [productionOrderNo], [buyer], [colorName], [construction], [packingUOM], [orderType], [colorType], [designCode], [designNumber], [product], [quantity], [length], [weight]) ";
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
                        // var path = "C:\\Users\\IttaAndLeslie\\Desktop\\kanban.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_Upsert_Fact_FPPackingReceipt").then((execResult) => {
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