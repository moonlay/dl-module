'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var GarmentInternNoteManager = require("../../../managers/garment-purchasing/intern-note-manager");
var GarmentPurchaseRequestManager = require("../../../managers/garment-purchasing/purchase-request-manager");
var CurrencyManager = require("../../../managers/garment-purchasing/garment-currency-manager");

const DESCRIPTION = "Fact Total Hutang Garment from MongoDB to Azure DWH";

const INTERN_NOTE_FIELDS = {
    "_updatedDate": 1,
    "_deleted": 1,
    "no": 1,
    "date": 1,
    "supplierId": 1,
    "supplier.code": 1,
    "supplier.name": 1,
    "currencyId": 1,
    "currency.code": 1,
    "currency.name": 1,
    "items.items.deliveryOrderDate": 1,
    "items.items.items.purchaseRequestNo": 1,
    "items.items.items.purchaseRequestId": 1,
    "items.items.items.purchaseRequestRefNo": 1,
    "items.items.items.pricePerDealUnit": 1,
    "items.items.items.deliveredQuantity": 1,
    "items.items.deliveryOrderDate": 1
}

const PURCHASE_REQUEST_FIELDS = {
    "no": 1,
    "items.refNo": 1,
    "items.categoryId": 1,
    "items.category.code": 1,
    "items.category.name": 1,
    "unitId": 1,
    "unit.name": 1,
    "unit.divisionId": 1,
    "unit.division.name": 1
}

module.exports = class FactTotalHutangManager extends BaseManager {

    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.garmentInternNoteManager = new GarmentInternNoteManager(db, user);
        this.garmentPurchaseRequestManager = new GarmentPurchaseRequestManager(db, user);
        this.currencyManager = new CurrencyManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date();
        this.migrationLog.insert({
            description: DESCRIPTION,
            start: startedDate,
        })
        return this.timestamp()
            .then((times) => this.extract(times))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then((results) => {
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

    timestamp() {
        return this.migrationLog.find({
            description: DESCRIPTION,
            status: "Successful"
        }, { "start": 1 }).sort({ finish: -1 }).limit(1).toArray()
    }

    extractInternNote(timestamp) {
        return this.garmentInternNoteManager
            .collection
            .aggregate([
                { "$match": { "_updatedDate": { "$gte": timestamp } } },
                { "$unwind": "$items" },
                { "$unwind": "$items.items" },
                { "$unwind": "$items.items.items" },
                { "$project": INTERN_NOTE_FIELDS }
            ]).toArray()
    }

    joinPurchaseRequest(internNotes) {
        var joinPromises = internNotes.map((internNote) => {
            return this.garmentPurchaseRequestManager
                .collection
                .aggregate([
                    {
                        "$match": {
                            "_deleted": false,
                            "no": internNote.items.items.items.purchaseRequestNo,
                            "items.refNo": internNote.items.items.items.purchaseRequestRefNo
                        }
                    },
                    { "$project": PURCHASE_REQUEST_FIELDS },
                    { "$unwind": "$items" },
                ]).toArray()
                .then((purchaseRequests) => {
                    var result = {};
                    if (purchaseRequests.length > 0) {
                        result = {
                            internNote: internNote,
                            purchaseRequest: purchaseRequests[0]
                        }
                    } else {
                        result = {
                            internNote: internNote,
                            purchaseRequest: null
                        }
                    }

                    return Promise.resolve(result)
                })
        })
        return Promise.all(joinPromises)
            .then((result) => {
                return Promise.resolve(result)
            })
    }

    joinCurrency(data) {
        var joinPromises = data.map((datum) => {
            return this.currencyManager
                .collection
                .find({
                    "_deleted": false,
                    "code": datum.internNote.currency.code,
                    "date": {
                        "$lte": new Date(datum.internNote.items.items.deliveryOrderDate)
                    }
                }, { "rate": 1 })
                .sort({ "date": -1 })
                .limit(1)
                .toArray()
                .then((currencies) => {
                    if (currencies.length > 0) {
                        datum.currency = currencies[0];
                    } else {
                        datum.currency = null;
                    }

                    return Promise.resolve(datum)
                })
        })

        return Promise.all(joinPromises)
            .then((result) => {
                return Promise.resolve(result)
            })
    }

    extract(times) {
        var timestamp = times.length > 0 ? new Date(times[0].start) : new Date("1970-01-01");
        return this.extractInternNote(timestamp)
            .then((internNotes) => {
                return this.joinPurchaseRequest(internNotes)
            })
            .then((data) => {
                return this.joinCurrency(data)
            })
    }

    getCategoryType(categoryCode) {
        var categoryList = ["emb", "wsh", "pls", "prn", "tes", "qlt"];
        var found = categoryList.find((category) => category === categoryCode.toString().toLowerCase());
        if (categoryCode.toString().toLowerCase() === "fab") {
            return "Bahan Baku";
        } else if (found) {
            return "Jasa";
        } else {
            return "Accessories";
        }
    }

    transform(data) {
        var result = data.map((datum) => {
            var kursCurrency = datum.currency && datum.currency.rate ? datum.currency.rate : 1;
            var purchaseRequest = datum.purchaseRequest;
            var internNote = datum.internNote;

            return {
                deleted: `'${internNote._deleted}'`,
                internNoteNo: internNote && internNote.no ? `'${internNote.no}'` : null,
                date: internNote && internNote.date ? `'${moment(internNote.date).add(7, "h").format("YYYY-MM-DD")}'` : null,
                suppllierName: internNote && internNote.supplier && internNote.supplier.name ? `'${internNote.supplier.name.replace(/'/g, '"')}'` : null,
                categoryType: purchaseRequest && purchaseRequest.items && purchaseRequest.items.category && purchaseRequest.items.category.name ? `'${this.getCategoryType(purchaseRequest.items.category.code)}'` : null,
                invoicePrice: internNote && internNote.items && internNote.items.items && internNote.items.items.items.pricePerDealUnit ? `${internNote.items.items.items.pricePerDealUnit}` : null,
                deliveredQuantity: internNote && internNote.items && internNote.items.items && internNote.items.items.items.deliveredQuantity ? `${internNote.items.items.items.deliveredQuantity}` : null,
                dealRate: kursCurrency ? `${kursCurrency}` : null,
                totalPrice: kursCurrency && internNote && internNote.items && internNote.items.items && internNote.items.items.items.deliveredQuantity && internNote.items.items.items.pricePerDealUnit ? `${kursCurrency * internNote.items.items.items.deliveredQuantity * internNote.items.items.items.pricePerDealUnit}` : null,
                totalPayment: null,
                categoryName: purchaseRequest && purchaseRequest.items && purchaseRequest.items.category && purchaseRequest.items.category.name ? `'${purchaseRequest.items.category.name}'` : null,
                divisionName: purchaseRequest && purchaseRequest.unit && purchaseRequest.unit.division && purchaseRequest.unit.division.name ? `'${purchaseRequest.unit.division.name}'` : null,
                unitName: purchaseRequest && purchaseRequest.unit && purchaseRequest.unit.name ? `'${purchaseRequest.unit.name}'` : null,
            }
        });
        return Promise.resolve(result);
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

                        var sqlQuery = 'INSERT INTO [DL_Fact_Total_Hutang_Garment_Temp] ';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `\nSELECT ${item.deleted}, ${item.internNoteNo}, ${item.suppllierName}, ${item.categoryType}, ${item.invoicePrice}, ${item.deliveredQuantity}, ${item.dealRate}, ${item.totalPrice}, ${item.totalPayment}, ${item.categoryName}, ${item.divisionName}, ${item.unitName}, ${item.date} UNION ALL `;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 == 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = 'INSERT INTO [DL_Fact_Total_Hutang_Garment_Temp] ';
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
                        // var path = "C:\\Users\\leslie.aula\\Desktop\\order.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("[DL_UPSERT_FACT_GARMENT_TOTAL_HUTANG]").then((execResult) => {
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