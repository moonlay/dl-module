'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

const DESCRIPTION = "Fact Packing from MongoDB to Azure DWH";

const SELECTED_FIELDS = {
    "_deleted": 1,
    "_createdBy": 1,
    "_createdDate": 1,
    "code": 1,
    "productionOrderId": 1,
    "productionOrderNo": 1,
    "orderType": 1,
    "salesContractNo": 1,
    "designCode": 1,
    "designNumber": 1,
    "buyerId": 1,
    "buyerCode": 1,
    "buyerName": 1,
    "buyerAddress": 1,
    "buyerType": 1,
    "date": 1,
    "packingUom": 1,
    "colorCode": 1,
    "colorName": 1,
    "colorType": 1,
    "materialConstructionFinishId": 1,
    "materialConstructionFinishName": 1,
    "materialId": 1,
    "material": 1,
    "materialWidthFinish": 1,
    "construction": 1,
    "deliveryType": 1,
    "finishedProductType": 1,
    "motif": 1,
    "items.lot": 1,
    "items.grade": 1,
    "items.weight": 1,
    "items.length": 1,
    "items.quantity": 1,
    "items.remark": 1,
    "status": 1,
    "accepted": 1,
    "declined": 1
};

// internal deps 
require("mongodb-toolkit");

var PackingManager = require("../../managers/production/finishing-printing/packing-manager");

module.exports = class FactPackingEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.packingManager = new PackingManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date()
        this.migrationLog.insert({
            description: DESCRIPTION,
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
                    description: DESCRIPTION,
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: "Successful"
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            })
            .catch((err) => {
                console.log("Failed!");
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
    };

    timestamp() {
        return this.migrationLog.find({
            description: DESCRIPTION,
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extract(times) {
        var time = times.length > 0 ? times[0].start : "1970-01-01";
        var timestamp = new Date(time);
        return this.packingManager.collection.find({
            "_updatedDate": {
                $gte: timestamp
            }
        }, SELECTED_FIELDS).toArray();
    }

    transform(data) {
        var result = data.map((datum) => {
            var packing = datum.items && datum.items.length > 0 ? datum : null;

            if (packing) {

                var index = 0;
                var packingData = packing.items.map((packingItem) => {
                    return {
                        deleted: `'${packing._deleted}'`,
                        createdBy: packing._createdBy ? `'${packing._createdBy}'` : null,
                        createdDate: packing._createdDate ? `'${moment(packing._createdDate).add(7, 'hours').format('YYYY-MM-DD')}'` : null,
                        code: packing.code ? `'${packing.code}'` : null,
                        productionOrderId: packing.productionOrderId ? `'${packing.productionOrderId}'` : null,
                        productionOrderNo: packing.productionOrderNo ? `'${packing.productionOrderNo}'` : null,
                        orderType: packing.orderType ? `'${packing.orderType}'` : null,
                        salesContractNo: packing.salesContractNo ? `'${packing.salesContractNo}'` : null,
                        designCode: packing.designCode ? `'${packing.designCode.replace(/'/g, '"')}'` : null,
                        designNumber: packing.designNumber ? `'${packing.designNumber.replace(/'/g, '"')}'` : null,
                        buyerId: packing.buyerId ? `'${packing.buyerId}'` : null,
                        buyerCode: packing.buyerCode ? `'${packing.buyerCode}'` : null,
                        buyerName: packing.buyerName ? `'${packing.buyerName.replace(/'/g, '"')}'` : null,
                        buyerAddress: packing.buyerAddress ? `'${packing.buyerAddress.replace(/'/g, '"')}'` : null,
                        buyerType: packing.buyerType ? `'${packing.buyerType}'` : null,
                        date: packing.date ? `'${moment(packing.date).add(7, 'hours').format('YYYY-MM-DD')}'` : null,
                        packingUom: packing.packingUom ? `'${packing.packingUom}'` : null,
                        colorCode: packing.colorCode ? `'${packing.colorCode.replace(/'/g, '"')}'` : null,
                        colorName: packing.colorName ? `'${packing.colorName.replace(/'/g, '"')}'` : null,
                        colorType: packing.colorType ? `'${packing.colorType.replace(/'/g, '"')}'` : null,
                        materialConstructionFinishId: packing.materialConstructionFinishId ? `'${packing.materialConstructionFinishId}'` : null,
                        materialConstructionFinishName: packing.materialConstructionFinishName ? `'${packing.materialConstructionFinishName.replace(/'/g, '"')}'` : null,
                        materialId: packing.materialId ? `'${packing.materialId}'` : null,
                        material: packing.material ? `'${packing.material.replace(/'/g, '"')}'` : null,
                        materialWidthFinish: packing.materialWidthFinish ? `'${packing.materialWidthFinish.replace(/'/g, '"')}'` : null,
                        construction: packing.construction ? `'${packing.construction.replace(/'/g, '"')}'` : null,
                        deliveryType: packing.deliveryType ? `'${packing.deliveryType.replace(/'/g, '"')}'` : null,
                        finishedProductType: packing.finishedProductType ? `'${packing.finishedProductType.replace(/'/g, '"')}'` : null,
                        motif: packing.motif ? `'${packing.motif.replace(/'/g, '"')}'` : null,
                        lot: packingItem.lot ? `'${packingItem.lot.replace(/'/g, '"')}'` : null,
                        grade: packingItem.grade ? `'${packingItem.grade.replace(/'/g, '"')}'` : null,
                        weight: packingItem.weight ? `${packingItem.weight}` : null,
                        length: packingItem.length ? `${packingItem.length}` : null,
                        quantity: packingItem.quantity ? `${packingItem.quantity}` : null,
                        remark: packingItem.remark ? `'${packingItem.remark.replace(/'/g, '"')}'` : null,
                        status: packing.status ? `'${packing.status.replace(/'/g, '"')}'` : null,
                        accepted: `'${packing.accepted}'`,
                        declined: `'${packing.declined}'`
                    }
                });
                return [].concat.apply([], packingData);
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

                        var sqlQuery = 'INSERT INTO [DL_Fact_Packing_Temp] ';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `\nSELECT ${item.deleted}, ${item.createdBy}, ${item.createdDate}, ${item.code}, ${item.productionOrderId}, ${item.productionOrderNo}, ${item.orderType}, ${item.salesContractNo}, ${item.designCode}, ${item.designNumber}, ${item.buyerId}, ${item.buyerCode}, ${item.buyerName}, ${item.buyerAddress}, ${item.buyerType}, ${item.date}, ${item.packingUom}, ${item.colorCode}, ${item.colorName}, ${item.colorType}, ${item.materialConstructionFinishId}, ${item.materialConstructionFinishName}, ${item.materialId}, ${item.material}, ${item.materialWidthFinish}, ${item.construction}, ${item.deliveryType}, ${item.finishedProductType}, ${item.motif}, ${item.lot}, ${item.grade}, ${item.weight}, ${item.length}, ${item.quantity}, ${item.remark}, ${item.status}, ${item.accepted}, ${item.declined} UNION ALL `;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 === 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "INSERT INTO [DL_Fact_Packing_Temp] ";
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
                        // var path = "C:\\Users\\leslie.aula\\Desktop\\kanban.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_UPSERT_FACT_PACKING").then((execResult) => {
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