'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var FinishingPrintingSalesContractManager = require("../managers/sales/finishing-printing-sales-contract-manager");

module.exports = class FactFinishingPrintingSalesContractManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.finishingPrintingSalesContractManager = new FinishingPrintingSalesContractManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date()
        this.migrationLog.insert({
            description: "Fact Finishing Printing Sales Contract from MongoDB to Azure DWH",
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
                    description: "Fact Finishing Printing Sales Contract from MongoDB to Azure DWH",
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
                    description: "Fact Finishing Printing Sales Contract from MongoDB to Azure DWH",
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
            description: "Fact Finishing Printing Sales Contract from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extract(time) {
        var timestamp = new Date(1970, 1, 1);
        return this.finishingPrintingSalesContractManager.collection.find({
            _deleted: false,
            _updatedDate: {
                $gt: timestamp
            }
        }).toArray();
    }

    orderQuantityConvertion(uom, quantity) {
        if (uom.toLowerCase() === "met" || uom.toLowerCase() === "mtr" || uom.toLowerCase() === "pcs") {
            return quantity * 109361 / 100000;
        } else if (uom.toLowerCase() === "yard" || uom.toLowerCase() === "yds") {
            return quantity;
        }
    }

    joinConstructionString(material, materialConstruction, yarnMaterialNo, materialWidth) {
        if (material !== null && materialConstruction !== null && yarnMaterialNo !== null && materialWidth !== null) {
            return `'${material + " " + materialConstruction + " " + yarnMaterialNo + " " + materialWidth}'`;
        } else {
            return null;
        }
    }

    transform(data) {
        var result = data.map((item) => {
            var orderUom = item.uom ? item.uom.unit : null;
            var orderQuantity = item.orderQuantity ? item.orderQuantity : null;
            var material = item.material ? item.material.name.replace(/'/g, '"') : null;
            var materialConstruction = item.materialConstruction ? item.materialConstruction.name.replace(/'/g, '"') : null;
            var yarnMaterialNo = item.yarnMaterial ? item.yarnMaterial.name.replace(/'/g, '"') : null;
            var materialWidth = item.materialWidth ? item.materialWidth : null;

            return {
                salesContractNo: item.salesContractNo ? `'${item.salesContractNo}'` : null,
                salesContractDate: item._createdDate ? `'${moment(item._createdDate).format("L")}'` : null,
                buyer: item.buyer ? `'${item.buyer.name.replace(/'/g, '"')}'` : null,
                buyerType: item.buyer ? `'${item.buyer.type.replace(/'/g, '"')}'` : null,
                orderType: item.orderType ? `'${item.orderType.name}'` : null,
                orderQuantity: item.orderQuantity ? `${item.orderQuantity}` : null,
                orderUom: item.uom ? `'${item.uom.unit.replace(/'/g, '"')}'` : null,
                totalOrderConvertion: item.orderQuantity ? `${this.orderQuantityConvertion(orderUom, orderQuantity)}` : null,
                buyerCode: item.buyer ? `'${item.buyer.code}'` : null,
                productionType: `'${"Finishing Printing"}'`,
                construction: this.joinConstructionString(material, materialConstruction, yarnMaterialNo, materialWidth),
                materialConstruction: item.materialConstruction ? `'${item.materialConstruction.name.replace(/'/g, '"')}'` : null,
                materialWidth: item.materialWidth ? `'${item.materialWidth}'` : null,
                material: item.material ? `'${item.material.name.replace(/'/g, '"')}'` : null
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

                        var sqlQuery = '';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `INSERT INTO [DL_Fact_Sales_Contract_Temp]([Nomor Sales Contract], [Tanggal Sales Contract], [Buyer], [Jenis Buyer], [Jenis Order], [Jumlah Order], [Satuan], [Jumlah Order Konversi], [Kode Buyer], [Jenis Produksi], [Konstruksi], [Konstruksi Material], [Lebar Material], [Material]) VALUES(${item.salesContractNo}, ${item.salesContractDate}, ${item.buyer}, ${item.buyerType}, ${item.orderType}, ${item.orderQuantity}, ${item.orderUom}, ${item.totalOrderConvertion}, ${item.buyerCode}, ${item.productionType}, ${item.construction}, ${item.materialConstruction}, ${item.materialWidth}, ${item.material});\n`;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 === 0) {
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

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_UPSERT_FACT_Sales_Contract").then((execResult) => {
                                    request.execute("DL_INSERT_DIMTIME").then((execResult) => {
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