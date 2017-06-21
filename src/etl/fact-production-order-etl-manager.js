'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var ProductionOrderManager = require("../managers/sales/production-order-manager");
var KanbanManager = require("../managers/production/finishing-printing/kanban-manager")

module.exports = class FactProductionOrderEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.productionOrderManager = new ProductionOrderManager(db, user);
        this.kanbanManager = new KanbanManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date()
        this.migrationLog.insert({
            description: "Fact Production Order from MongoDB to Azure DWH",
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
                    description: "Fact Production Order from MongoDB to Azure DWH",
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
                    description: "Fact Production Order from MongoDB to Azure DWH",
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
            description: "Fact Production Order from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extract(times) {
        var time = times.length > 0 ? times[0].start : "1970-01-01";
        var timestamp = new Date(time);
        return this.productionOrderManager.collection.find({
            _updatedDate: {
                $gt: timestamp
            }
        }).toArray()
            .then((productionOrder) => {
                return this.joinKanban(productionOrder);
            })
    }

    joinKanban(productionOrders) {
        var joinKanbans = productionOrders.map((productionOrder) => {
            return this.kanbanManager.collection.find({
                productionOrderId: productionOrder._id
            }).toArray()
                .then((kanbans) => {
                    var arr = kanbans.map((kanban) => {
                        return {
                            productionOrder: productionOrder,
                            kanban: kanban
                        };
                    });

                    if (arr.length === 0)
                        arr.push({
                            productionOrder: productionOrder,
                            kanban: null
                        });

                    return Promise.resolve(arr);
                })
                .catch((e) => {
                    console.log(e);
                    reject(e);
                });
        });
        return Promise.all(joinKanbans)
            .then((joinKanban) => {
                return Promise.resolve([].concat.apply([], joinKanban));
            }).catch((e) => {
                console.log(e);
                reject(e);
            });
    }

    orderQuantityConvertion(uom, quantity) {
        if (uom.toLowerCase() === "met" || uom.toLowerCase() === "mtr" || uom.toLowerCase() === "pcs") {
            return quantity;
        } else if (uom.toLowerCase() === "yard" || uom.toLowerCase() === "yds") {
            return quantity * 0.9144;
        } else {
            return quantity;
        }
    }

    joinConstructionString(material, materialConstruction, yarnMaterialNo, materialWidth) {
        if (material !== null && materialConstruction !== null && yarnMaterialNo !== null && materialWidth !== null) {
            return `'${material.replace(/'/g, '"') + " " + materialConstruction.replace(/'/g, '"') + " " + yarnMaterialNo.replace(/'/g, '"') + " " + materialWidth.replace(/'/g, '"')}'`;
        } else {
            return null;
        }
    }

    transform(data) {
        var result = data.map((items) => {
            var item = items.productionOrder;
            var kanban = items.kanban;
            var orderUom = item.uom ? item.uom.unit : null;
            var orderQuantity = item.orderQuantity ? item.orderQuantity : null;
            var material = item.material ? item.material.name.replace(/'/g, '"') : null;
            var materialConstruction = item.materialConstruction ? item.materialConstruction.name.replace(/'/g, '"') : null;
            var yarnMaterialNo = item.yarnMaterial ? item.yarnMaterial.name.replace(/'/g, '"') : null;
            var materialWidth = item.materialWidth ? item.materialWidth : null;

            return {
                salesContractNo: item.salesContractNo ? `'${item.salesContractNo}'` : null,
                productionOrderNo: item.orderNo ? `'${item.orderNo}'` : null,
                orderType: item.orderType ? `'${item.orderType.name}'` : null,
                processType: item.processType ? `'${item.processType.name.replace(/'/g, '"')}'` : null,
                material: item.material ? `'${item.material.name.replace(/'/g, '"')}'` : null,
                materialConstruction: item.materialConstruction ? `'${item.materialConstruction.name.replace(/'/g, '"')}'` : null,
                yarnMaterialNo: item.yarnMaterial ? `'${item.yarnMaterial.name.replace(/'/g, '"')}'` : null,
                materialWidth: item.materialWidth ? `'${item.materialWidth}'` : null,
                orderQuantity: item.orderQuantity ? `${item.orderQuantity}` : null,
                orderUom: item.uom ? `'${item.uom.unit.replace(/'/g, '"')}'` : null,
                buyer: item.buyer ? `'${item.buyer.name.replace(/'/g, '"')}'` : null,
                buyerType: item.buyer ? `'${item.buyer.type.replace(/'/g, '"')}'` : null,
                deliveryDate: item.deliveryDate ? `'${moment(item.deliveryDate).format("L")}'` : null,
                createdDate: item._createdDate ? `'${moment(item._createdDate).format("L")}'` : null,
                totalOrderConvertion: item.orderQuantity ? `${this.orderQuantityConvertion(orderUom, orderQuantity)}` : null,
                construction: this.joinConstructionString(material.replace(/'/g, '"'), materialConstruction.replace(/'/g, '"'), yarnMaterialNo.replace(/'/g, '"'), materialWidth),
                buyerCode: item.buyer ? `'${item.buyer.code}'` : null,
                cartQuantity: kanban && kanban.cart && kanban.cart.qty ? `${kanban.cart.qty}` : null,
                kanbanCode: kanban && kanban.code ? `'${kanban.code}'` : null,
                deleted: `'${item._deleted}'`
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
                                var queryString = `INSERT INTO DL_Fact_Production_Order_Temp([Nomor Sales Contract], [Nomor Order Produksi], [Jenis Order], [Jenis Proses], [Material], [Konstruksi Material], [Nomor Benang Material], [Lebar Material], [Jumlah Order Produksi], [Satuan], [Buyer], [Jenis Buyer], [Tanggal Delivery], [Created Date], [Jumlah Order Konversi], [Konstruksi], [Kode Buyer], [Jumlah Order(Kanban)], [Kode Kanban], [deleted]) VALUES(${item.salesContractNo}, ${item.productionOrderNo}, ${item.orderType}, ${item.processType}, ${item.material}, ${item.materialConstruction}, ${item.yarnMaterialNo}, ${item.materialWidth}, ${item.orderQuantity}, ${item.orderUom}, ${item.buyer}, ${item.buyerType}, ${item.deliveryDate}, ${item.createdDate}, ${item.totalOrderConvertion}, ${item.construction}, ${item.buyerCode}, ${item.cartQuantity}, ${item.kanbanCode}, ${item.deleted});\n`;
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
                        // var path = "C:\\Users\\Itta And Leslie\\Desktop\\order.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_UPSERT_FACT_PRODUCTION_ORDER").then((execResult) => {
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