'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");

// internal deps 
require('mongodb-toolkit');

var UnitReceiptNoteManager = require('../managers/purchasing/unit-receipt-note-manager');
var UnitPaymentOrderManager = require('../managers/purchasing/unit-payment-order-manager');

module.exports = class FactTotalHutang extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.unitReceiptNoteManager = new UnitReceiptNoteManager(db, user);
        this.unitPaymentOrderManager = new UnitPaymentOrderManager(db, user);
        this.migrationLog = this.db.collection("migration-log");

    }

    run() {
        var startedDate = new Date()
        this.migrationLog.insert({
            description: "Fact Total Hutang from MongoDB to Azure DWH",
            start: startedDate,
        })
        return this.timestamp()
            .then((time) => this.extract(time))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then((results) => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "AG Fact Total Hutang from MongoDB to Azure DWH",
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
                    description: "AG Fact Total Hutang from MongoDB to Azure DWH",
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
            description: "AG Fact Total Hutang from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extract(time) {
        var timestamp = new Date(time[0].finish);
        return this.unitReceiptNoteManager.collection.find({
            _deleted: false,
            _createdBy: {
                "$nin": ["dev", "unit-test"]
            },
            _updatedDate: {
                "$gt": timestamp,
                // "$gt": new Date(1970, 1, 1)
            }
        }).toArray()
            .then((unitReceiptNotes) => {
                return this.joinUnitPaymentOrder(unitReceiptNotes);
            })
    }

    joinUnitPaymentOrder(data) {
        var joinUnitPaymentOrders = data.map((unitReceiptNote) => {
            return this.unitPaymentOrderManager.collection.find({
                items: {
                    "$elemMatch": {
                        unitReceiptNoteId: unitReceiptNote._id
                    }
                }
            }).toArray()
                .then((unitPaymentOrders) => {
                    var arr = unitPaymentOrders.map((unitPaymentOrder) => {
                        return {
                            unitPaymentOrder: unitPaymentOrder,
                            unitReceiptNote: unitReceiptNote
                        };
                    });

                    return Promise.resolve(arr);
                })
                .catch((e) => {
                    console.log(e);
                    reject(e);
                })
        });
        return Promise.all(joinUnitPaymentOrders)
            .then((joinUnitPaymentOrder) => {
                return Promise.resolve([].concat.apply([], joinUnitPaymentOrder));
            })
            .catch((e) => {
                console.log(e);
                reject(e);
            })
    }

    transform(data) {
        var result = data.map((item) => {
            var unitPaymentOrder = item.unitPaymentOrder;
            var unitReceiptNote = item.unitReceiptNote;

            if (unitReceiptNote)

            var results = unitReceiptNote.items.map((unitReceiptNoteItem) => {

                return {
                    unitPaymentOrderNo: `'${unitPaymentOrder.no}'`,
                    unitPaymentOrderDate: `'${moment(unitPaymentOrder.date).format('L')}'`,
                    unitPaymentOrderDueDate: `'${moment(unitPaymentOrder.dueDate).format('L')}'`,
                    supplierName: `'${unitPaymentOrder.supplier.name.replace(/'/g, '"')}'`,
                    categoryName: `'${unitPaymentOrder.category.name}'`,
                    categoryType: `'${unitPaymentOrder.category.name.toLowerCase() === "bahan baku" ? "BAHAN BAKU" : "NON BAHAN BAKU"}'`,
                    divisionName: `'${unitPaymentOrder.division.name}'`,
                    unitName: `'${unitReceiptNote.unit.name}'`,
                    invoicePrice: `${unitReceiptNoteItem.pricePerDealUnit}`,
                    unitReceiptNoteQuantity: `${unitReceiptNoteItem.deliveredQuantity}`,
                    purchaseOrderExternalCurrencyRate: `${unitReceiptNoteItem.currencyRate}`,
                    total: `${unitReceiptNoteItem.pricePerDealUnit * unitReceiptNoteItem.deliveredQuantity * unitReceiptNoteItem.currencyRate}`,
                    unitReceiptNoteNo: `'${unitReceiptNote.no}'`,
                    productName: `'${unitReceiptNoteItem.product.name.replace(/'/g, '"')}'`,
                    productCode: `'${unitReceiptNoteItem.product.code}'`,
                    deletedUnitRecipe:`'${unitReceiptNote._deleted}'`,
                    deletedPaymentOrder:`'${unitPaymentOrder._deleted}'`
                };
            });

            return [].concat.apply([], results);
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
    };

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
                                var queryString = `insert into AG_fact_total_hutang_temp([ID Fact Total Hutang], [Nomor Nota Intern], [Tanggal Nota Intern], [Nama Supplier], [Jenis Kategori], [Harga Sesuai Invoice], [Jumlah Sesuai Bon Unit], [Rate Yang Disepakati], [Total Harga Nota Intern], [Nama Kategori], [Nama Divisi], [Nama Unit], [nomor bon unit], [nama produk], [kode produk],[deleted Unit Receipt Note],[deleted Unit Payment Order]) values(${count}, ${item.unitPaymentOrderNo}, ${item.unitPaymentOrderDate}, ${item.supplierName}, ${item.categoryType}, ${item.invoicePrice}, ${item.unitReceiptNoteQuantity}, ${item.purchaseOrderExternalCurrencyRate}, ${item.total}, ${item.categoryName}, ${item.divisionName}, ${item.unitName}, ${item.unitReceiptNoteNo}, ${item.productName}, ${item.productCode},${item.deletedUnitRecipe},${item.deletedPaymentOrder});\n`;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 == 0) {
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "";
                                }
                                console.log(`add data to query  : ${count}`);
                                count++;
                            }
                        }

                        if (sqlQuery != "")
                            command.push(this.insertQuery(request, `${sqlQuery}`));

                        this.sql.multiple = true;

                        // var fs = require("fs");

                        // var path = "C:\\Users\\aditya.henanda\\Desktop\\fact.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("AG_UPSERT_FACT_TOTAL_HUTANG").then((execResult) => {
                                    request.execute("AG_INSERT_DIMTIME").then((execResult) => {
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
