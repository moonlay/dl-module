'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");

// internal deps 
require('mongodb-toolkit');

var FabricQualityControlManager = require('../../managers/production/finishing-printing/fabric-quality-control-manager');
const MIGRATION_LOG_DESCRIPTION = "Fabric QC from MongoDB to Azure DWH";
const SELECT = {
    "fabricGradeTests.criteria.score.A": 1,
    "fabricGradeTests.criteria.score.B": 1,
    "fabricGradeTests.criteria.score.C": 1,
    "fabricGradeTests.criteria.score.D": 1,
    "fabricGradeTests.pointSystem": 1,
    code: 1,
    pointSystem: 1,
    dateIm: 1,
    shiftIm: 1,
    group: 1,
    operatorIm: 1,
    machineNoIm: 1,
    productionOrderNo: 1,
    productionOrderType: 1,
    kanbanCode: 1,
    cartNo: 1,
    buyer: 1,
    orderQuantity: 1,
    color: 1,
    construction: 1,
    packingInstruction: 1,
    uom: 1,
    "fabricGradeTests.type": 1,
    "fabricGradeTests.pcsNo": 1,
    "fabricGradeTests.width": 1,
    "fabricGradeTests.initLength": 1,
    "fabricGradeTests.avalLength": 1,
    "fabricGradeTests.finalLength": 1,
    "fabricGradeTests.sampleLength": 1,
    "fabricGradeTests.fabricGradeTest": 1,
    "fabricGradeTests.finalGradeTest": 1,
    "fabricGradeTests.score": 1,
    "fabricGradeTests.finalScore": 1,
    "fabricGradeTests.criteria.code": 1,
    "fabricGradeTests.criteria.group": 1,
    "fabricGradeTests.criteria.name": 1,
    _deleted: 1,
    isUsed: 1
};

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
            description: MIGRATION_LOG_DESCRIPTION,
            start: startedDate,
        })
        return this.getTimeStamp()
            .then((data) => this.extract(data))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then(() => {
                console.log("Success!");
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
    }

    getTimeStamp() {
        return this.migrationLog.find({
            description: MIGRATION_LOG_DESCRIPTION,
            status: "Successful"
        }).sort({
            finishedDate: -1
        }).limit(1).toArray()
    }

    // extract(times) {
    //     var timestamp = new Date("2017-08-09T00:00:00.000Z");
    //     var timestamps = new Date("2017-08-10T00:00:00.000Z");
    //     return this.fabricQualityControlManager.collection.find({
    //         _createdDate: {
    //             "$gte": timestamp,
    //             "$lte": timestamps
    //         }
    //     }).toArray();
    // }

    extract(times) {
        var time = times.length > 0 ? times[0].start : "1970-01-01";
        var timestamp = new Date(time);
        return this.fabricQualityControlManager.collection.find({
            _updatedDate: {
                $gte: timestamp
            }
        }, SELECT).toArray();
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
                        qcCode: qualityControl.code && qualityControl.code !== '' ? `'${qualityControl.code.replace(/'/g, '"')}'` : null,
                        qcpointSystem: qualityControl.pointSystem >= 0 && qualityControl.pointSystem !== '' && qualityControl.pointSystem ? `'${qualityControl.pointSystem}'` : null,
                        dateIm: qualityControl.dateIm ? `'${moment(qualityControl.dateIm).add(7, "hours").format("L")}'` : null,
                        shiftIm: qualityControl.shiftIm && qualityControl.shiftIm !== '' ? `'${qualityControl.shiftIm.replace(/'/g, '"')}'` : null,
                        group: qualityControl.group && qualityControl.group !== '' ? `'${qualityControl.group.replace(/'/g, '"')}'` : null,
                        operatorIm: qualityControl.operatorIm && qualityControl.operatorIm !== '' ? `'${qualityControl.operatorIm.replace(/'/g, '"')}'` : null,
                        machineNoIm: qualityControl.machineNoIm && qualityControl.machineNoIm !== '' ? `'${qualityControl.machineNoIm.replace(/'/g, '"')}'` : null,
                        productionOrderNo: qualityControl.productionOrderNo && qualityControl.productionOrderNo !== '' ? `'${qualityControl.productionOrderNo.replace(/'/g, '"')}'` : null,
                        productionOrderType: qualityControl.productionOrderType && qualityControl.productionOrderType !== '' ? `'${qualityControl.productionOrderType.replace(/'/g, '"')}'` : null,
                        kanbanCode: qualityControl.kanbanCode && qualityControl.kanbanCode !== '' ? `'${qualityControl.kanbanCode.replace(/'/g, '"')}'` : null,
                        cartNo: qualityControl.cartNo && qualityControl.cartNo !== '' ? `'${qualityControl.cartNo.replace(/'/g, '"')}'` : null,
                        buyer: qualityControl.buyer && qualityControl.buyer !== '' ? `'${qualityControl.buyer.replace(/'/g, '"')}'` : null,
                        orderQuantity: qualityControl.orderQuantity >= 0 && qualityControl.orderQuantity !== '' && qualityControl.orderQuantity ? `'${qualityControl.orderQuantity}'` : null,
                        color: qualityControl.color && qualityControl.color !== '' ? `'${qualityControl.color.replace(/'/g, '"')}'` : null,
                        construction: qualityControl.construction && qualityControl.construction !== '' ? `'${qualityControl.construction.replace(/'/g, '"')}'` : null,
                        packingInstruction: qualityControl.packingInstruction && qualityControl.packingInstruction !== '' ? `'${qualityControl.packingInstruction.replace(/'/g, '"')}'` : null,
                        uom: qualityControl.uom && qualityControl.uom !== '' ? `'${qualityControl.uom.replace(/'/g, '"')}'` : null,
                        type: gradeTest.type && gradeTest.type !== '' ? `'${gradeTest.type.replace(/'/g, '"')}'` : null,
                        pcsNo: gradeTest.pcsNo && gradeTest.pcsNo !== '' ? `'${gradeTest.pcsNo.replace(/'/g, '"')}'` : null,
                        grade: gradeTest.grade && gradeTest.grade !== '' ? `'${gradeTest.grade.replace(/'/g, '"')}'` : null,
                        width: gradeTest.width >= 0 && gradeTest.width !== '' && gradeTest.width ? `'${gradeTest.width}'` : null,
                        initLength: gradeTest.initLength >= 0 && gradeTest.initLength && gradeTest.initLength ? `'${gradeTest.initLength}'` : null,
                        avalLength: gradeTest.avalLength >= 0 && gradeTest.avalLength !== '' && gradeTest.avalLength ? `'${gradeTest.avalLength}'` : null,
                        finalLength: gradeTest.finalLength >= 0 && gradeTest.finalLength !== '' && gradeTest.finalLength ? `'${gradeTest.finalLength}'` : null,
                        sampleLength: gradeTest.sampleLength >= 0 && gradeTest.sampleLength !== '' && gradeTest.sampleLength ? `'${gradeTest.sampleLength}'` : null,
                        fabricGradeTest: gradeTest.fabricGradeTest >= 0 && gradeTest.fabricGradeTest !== '' && gradeTest.fabricGradeTest ? `'${gradeTest.fabricGradeTest}'` : null,
                        finalGradeTest: gradeTest.finalGradeTest >= 0 && gradeTest.finalGradeTest !== '' && gradeTest.finalGradeTest ? `'${gradeTest.finalGradeTest}'` : null,
                        score: gradeTest.score >= 0 && gradeTest.score !== '' && gradeTest.score ? `'${gradeTest.score}'` : null,
                        finalScore: gradeTest.finalScore >= 0 && gradeTest.finalScore !== '' && gradeTest.finalScore ? `'${gradeTest.finalScore}'` : null,
                        pointSystem: gradeTest.pointSystem >= 0 && gradeTest.pointSystem !== '' && gradeTest.pointSystem ? `'${gradeTest.pointSystem}'` : null,
                        criteriaCode: criteria.code && criteria.code !== '' && criteria.code ? `'${criteria.code.replace(/'/g, '"')}'` : null,
                        criteriaGroup: criteria.group && criteria.group !== '' && criteria.group ? `'${criteria.group.replace(/'/g, '"')}'` : null,
                        criteriaName: criteria.name && criteria.name !== '' && criteria.name ? `'${criteria.name.replace(/'/g, '"')}'` : null,
                        criteriaA: criteria.score.A >= 0 && criteria.score.A !== '' && criteria.score.A ? `${criteria.score.A}` : null,
                        criteriaB: criteria.score.B >= 0 && criteria.score.B !== '' && criteria.score.B ? `${criteria.score.B}` : null,
                        criteriaC: criteria.score.C >= 0 && criteria.score.C !== '' && criteria.score.C ? `${criteria.score.C}` : null,
                        criteriaD: criteria.score.D >= 0 && criteria.score.D !== '' && criteria.score.D ? `${criteria.score.D}` : null,
                        totalScore: `${totalScore}`,
                        deleted: `'${qualityControl._deleted}'`,
                        isUsed: `'${qualityControl.isUsed}'`
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

                        var sqlQuery = 'INSERT INTO [DL_Fact_Fabric_Quality_Control_Temp] ';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `\nSELECT ${item.qcCode}, ${item.qcpointSystem}, ${item.dateIm}, ${item.shiftIm}, ${item.group}, ${item.operatorIm}, ${item.machineNoIm}, ${item.productionOrderNo}, ${item.productionOrderType}, ${item.kanbanCode}, ${item.cartNo}, ${item.buyer}, ${item.orderQuantity}, ${item.color}, ${item.construction}, ${item.packingInstruction}, ${item.uom}, ${item.type}, ${item.pcsNo}, ${item.grade}, ${item.width}, ${item.initLength}, ${item.avalLength}, ${item.finalLength}, ${item.sampleLength}, ${item.fabricGradeTest}, ${item.finalGradeTest}, ${item.score}, ${item.finalScore}, ${item.pointSystem}, ${item.criteriaCode}, ${item.criteriaGroup}, ${item.criteriaName}, ${item.criteriaA}, ${item.criteriaB}, ${item.criteriaC}, ${item.criteriaD}, ${item.totalScore}, ${item.deleted}, ${item.isUsed} UNION ALL `;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 == 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "INSERT INTO [DL_Fact_Fabric_Quality_Control_Temp] ";
                                }
                                console.log(`add data to query  : ${count}`);
                                count++;
                            }
                        }

                        if (sqlQuery !== "") {
                            sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                            command.push(this.insertQuery(request, `${sqlQuery}`));
                        }

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