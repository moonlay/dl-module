'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");

// internal deps 
require('mongodb-toolkit');

var FabricQualityControlManager = require('../managers/production/finishing-printing/fabric-quality-control-manager');

module.exports = class FabricQualityControlEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.fabricQualityControlManager = new FabricQualityControlManager(db, user);
        this.migrationLog = this.db.collection("migration-log");

    }
    run() {
        var startedDate = new Date();
        this.migrationLog.insert({
            description: "Fabric QC from MongoDB to Azure DWH",
            start: startedDate,
        })
        return this.getTimeStamp()
            .then((data) => this.extract(data))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then(() => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Fabric QC from MongoDB to Azure DWH",
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
                    description: "Fabric QC from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: err
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            });
    }

    getTimeStamp() {
        return this.migrationLog.find({
            description: "Fabric QC from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({
            finishedDate: -1
        }).limit(1).toArray()
    }

    extract(times) {
        var time = times.length > 0 ? times[0].start : "1970-01-01";
        var timestamp = new Date(time);
        return this.fabricQualityControlManager.collection.find({
            _updatedDate: {
                "$gt": timestamp
            }
        }).toArray();
    }

    transform(data) {
        var result = data.map((qualityControl) => {
            var results = qualityControl.fabricGradeTests.map((gradeTest) => {
                var resultss = gradeTest.criteria.map((criteria) => {
                    var scoreA = criteria.score.A >= 0 && gradeTest.pointSystem === 10 ? criteria.score.A * 1 : null;
                    var scoreB = criteria.score.B >= 0 && gradeTest.pointSystem === 10 ? criteria.score.B * 3 : null;
                    var scoreC = criteria.score.C >= 0 && gradeTest.pointSystem === 10 ? criteria.score.C * 5 : null;
                    var scoreD = criteria.score.D >= 0 && gradeTest.pointSystem === 10 ? criteria.score.D * 10 : null;
                    var totalScore = scoreA + scoreB + scoreC + scoreD;
                    return {
                        qcCode: qualityControl.code ? `'${qualityControl.code}'` : null,
                        qcpointSystem: qualityControl.pointSystem >= 0 ? `${qualityControl.pointSystem}` : null,
                        dateIm: qualityControl.dateIm ? `'${moment(qualityControl.dateIm).format("L")}'` : null,
                        shiftIm: qualityControl.shiftIm ? `'${qualityControl.shiftIm}'` : null,
                        group: qualityControl.group ? `'${qualityControl.group}'` : null,
                        operatorIm: qualityControl.operatorIm ? `'${qualityControl.operatorIm}'` : null,
                        machineNoIm: qualityControl.machineNoIm ? `'${qualityControl.machineNoIm}'` : null,
                        productionOrderNo: qualityControl.productionOrderNo ? `'${qualityControl.productionOrderNo}'` : null,
                        productionOrderType: qualityControl.productionOrderType ? `'${qualityControl.productionOrderType}'` : null,
                        kanbanCode: qualityControl.kanbanCode ? `'${qualityControl.kanbanCode}'` : null,
                        cartNo: qualityControl.cartNo ? `'${qualityControl.cartNo}'` : null,
                        buyer: qualityControl.buyer ? `'${qualityControl.buyer}'` : null,
                        orderQuantity: qualityControl.orderQuantity >= 0 ? `${qualityControl.orderQuantity}` : null,
                        color: qualityControl.color ? `'${qualityControl.color}'` : null,
                        construction: qualityControl.cartNo ? `'${qualityControl.construction}'` : null,
                        packingInstruction: qualityControl.packingInstruction ? `'${qualityControl.packingInstruction}'` : null,
                        uom: qualityControl.uom ? `'${qualityControl.uom}'` : null,
                        type: gradeTest.type ? `'${gradeTest.type}'` : null,
                        pcsNo: gradeTest.pcsNo ? `'${gradeTest.pcsNo}'` : null,
                        grade: gradeTest.grade ? `'${gradeTest.grade}'` : null,
                        width: gradeTest.width >= 0 ? `${gradeTest.width}` : null,
                        initLength: gradeTest.initLength >= 0 ? `${gradeTest.initLength}` : null,
                        avalLength: gradeTest.avalLength >= 0 ? `${gradeTest.avalLength}` : null,
                        finalLength: gradeTest.finalLength >= 0 ? `${gradeTest.finalLength}` : null,
                        sampleLength: gradeTest.sampleLength >= 0 ? `${gradeTest.sampleLength}` : null,
                        fabricGradeTest: gradeTest.fabricGradeTest >= 0 ? `${gradeTest.fabricGradeTest}` : null,
                        finalGradeTest: gradeTest.finalGradeTest >= 0 ? `${gradeTest.finalGradeTest}` : null,
                        score: gradeTest.score >= 0 ? `${gradeTest.score}` : null,
                        finalScore: gradeTest.finalScore >= 0 ? `${gradeTest.finalScore}` : null,
                        pointSystem: gradeTest.pointSystem >= 0 ? `${gradeTest.pointSystem}` : null,
                        criteriaCode: criteria.code ? `'${criteria.code}'` : null,
                        criteriaGroup: criteria.group ? `'${criteria.group}'` : null,
                        criteriaName: criteria.name ? `'${criteria.name}'` : null,
                        criteriaA: criteria.score.A >= 0 ? `${criteria.score.A}` : null,
                        criteriaB: criteria.score.B >= 0 ? `${criteria.score.B}` : null,
                        criteriaC: criteria.score.C >= 0 ? `${criteria.score.C}` : null,
                        criteriaD: criteria.score.D >= 0 ? `${criteria.score.D}` : null,
                        totalScore: `${totalScore}`,
                        deleted: `'${qualityControl._deleted}'`
                    }
                });
                return [].concat.apply([], resultss);
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
                                var queryString = `INSERT INTO [dbo].[DL_Fact_Fabric_Quality_Control_Temp]([qcCode], [qcpointSystem], [dateIm], [shiftIm], [group], [operatorIm], [machineNoIm], [productionOrderNo], [productionOrderType], [kanbanCode], [cartNo], [buyer], [orderQuantity], [color], [construction], [packingInstruction], [uom], [type], [pcsNo], [grade], [width], [initLength], [avalLength], [finalLength], [sampleLength], [fabricGradeTest], [finalGradeTest], [score], [finalScore], [pointSystem], [criteriaCode], [criteriaGroup], [criteriaName], [criteriaA], [criteriaB], [criteriaC], [criteriaD], [totalScore], [deleted]) VALUES(${item.qcCode}, ${item.qcpointSystem}, ${item.dateIm}, ${item.shiftIm}, ${item.group}, ${item.operatorIm}, ${item.machineNoIm}, ${item.productionOrderNo}, ${item.productionOrderType}, ${item.kanbanCode}, ${item.cartNo}, ${item.buyer}, ${item.orderQuantity}, ${item.color}, ${item.construction}, ${item.packingInstruction}, ${item.uom}, ${item.type}, ${item.pcsNo}, ${item.grade}, ${item.width}, ${item.initLength}, ${item.avalLength}, ${item.finalLength}, ${item.sampleLength}, ${item.fabricGradeTest}, ${item.finalGradeTest}, ${item.score}, ${item.finalScore}, ${item.pointSystem}, ${item.criteriaCode}, ${item.criteriaGroup}, ${item.criteriaName}, ${item.criteriaA}, ${item.criteriaB}, ${item.criteriaC}, ${item.criteriaD}, ${item.totalScore}, ${item.deleted});\n`;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 100000 == 0) {
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

                        // var fs = require("fs");
                        // var path = "C:\\Users\\leslie.aula\\Desktop\\fabric.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_UPSERT_FACT_FABRIC_QUALITY_CONTROL").then((execResult) => {
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