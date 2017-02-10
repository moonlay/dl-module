'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var SalesContractManager = require("../managers/sales/sales-contract-manager");

module.exports = class FactSalesContractEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.salesContractManager = new SalesContractManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        return this.extract()
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
    }

    extract() {
        var timestamp = new Date(1970, 1, 1);
        return this.salesContractManager.collection.find({
            _deleted: false,
            _updatedDate: {
                $gt: timestamp
            }
        }).toArray();
    }

    transform(data) {
        var result = data.map((salesContracts) => {
            var salesContract = salesContracts;
            var results = salesContract.productionOrders.map((productionOrder) => {
                return {
                    salesContractNo: salesContract.salesContractNo ? `'${salesContract.salesContractNo.replace(/'/g, '"')}'` : null,
                    productionOrderNo: productionOrder.orderNo ? `'${productionOrder.orderNo.replace(/'/g, '"')}'` : null,
                    orderType: productionOrder.orderType.name ? `'${productionOrder.orderType.name.replace(/'/g, '"')}'` : null,
                    processType: productionOrder.processType.name ? `'${productionOrder.processType.name.replace(/'/g, '"')}'` : null,
                    material: productionOrder.material.name ? `'${productionOrder.material.name.replace(/'/g, '"')}'` : null,
                    materialConstruction: productionOrder.materialConstruction ? `'${productionOrder.materialConstruction.name.replace(/'/g, '"')}'` : null,
                    yarnMaterialNo: productionOrder.yarnMaterial ? `'${productionOrder.yarnMaterial.name.replace(/'/g, '"')}'` : null,
                    materialWidth: productionOrder.materialWidth ? `'${productionOrder.materialWidth}'` : null,
                    orderQuantity: productionOrder.orderQuantity ? `${productionOrder.orderQuantity}` : null,
                    orderUom: productionOrder.uom ? `'${productionOrder.uom.unit.replace(/'/g, '"')}'` : null,
                    buyer: productionOrder.buyer.name ? `'${productionOrder.buyer.name.replace(/'/g, '"')}'` : null,
                    buyerType: productionOrder.buyer.type ? `'${productionOrder.buyer.type.replace(/'/g, '"')}'` : null,
                    deliveryDate: productionOrder.deliveryDate ? `'${moment(productionOrder.deliveryDate).format("L")}'` : null,
                    createdDate: productionOrder._createdDate ? `'${moment(productionOrder._createdDate).format("L")}'` : null
                }
            });
            return [].concat.apply([], results);
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
                                var queryString = `INSERT INTO DL_Fact_Sales_Contract([Nomor Sales Contract], [Nomor Order Produksi], [Jenis Order], [Jenis Proses], [Material], [Konstruksi Material], [Nomor Benang Material], [Lebar Material], [Jumlah Order Produksi], [Satuan], [Buyer], [Jenis Buyer], [Tanggal Delivery], [Created Date]) VALUES(${item.salesContractNo}, ${item.productionOrderNo}, ${item.orderType}, ${item.processType}, ${item.material}, ${item.materialConstruction}, ${item.yarnMaterialNo}, ${item.materialWidth}, ${item.orderQuantity}, ${item.orderUom}, ${item.buyer}, ${item.buyerType}, ${item.deliveryDate}, ${item.createdDate});\n`;
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

                        var fs = require("fs");
                        var path = "C:\\Users\\leslie.aula\\Desktop\\tttt.txt";

                        fs.writeFile(path, sqlQuery, function (error) {
                            if (error) {
                                console.log("write error:  " + error.message);
                            } else {
                                console.log("Successful Write to " + path);
                            }
                        });

                        return Promise.all(command)
                            .then((results) => {
                                transaction.commit((err) => {
                                    if (err)
                                        reject(err);
                                    else
                                        resolve(results);
                                });
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
                    });
                })
                .catch((err) => {
                    reject(err);
                })
        });
    }
}