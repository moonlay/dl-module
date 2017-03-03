"use strict"

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");


// internal deps 
require("mongodb-toolkit");

var MonitoringEventManager = require("../managers/production/finishing-printing/monitoring-event-manager");

module.exports = class FactMonitoringEventEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.monitoringEventManager = new MonitoringEventManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    };

    run() {
        var startedDate = new Date()
        this.migrationLog.insert({
            description: "Fact Monitoring Event from MongoDB to Azure DWH",
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
                    description: "Fact Monitoring Event from MongoDB to Azure DWH",
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
                    description: "Fact Monitoring Event from MongoDB to Azure DWH",
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
            description: "Fact Monitoring Event from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extract(time) {
        var timestamp = new Date(time[0].finish);
        return this.monitoringEventManager.collection.find({
            _deleted: false,
            _createdBy: {
                "$nin": ["dev", "unit-test"]
            },
            _updatedDate: {
                "$gt": timestamp
            }
        }).toArray();
    };

    getOperationRange(hours) {
        return hours / 60;
    }

    transform(data) {
        var result = data.map((item) => {
            var monitoringEvent = item;
            var time = "T";
            var ms = ".000Z";
            var startTime = moment(monitoringEvent.timeInMillisStart).format("HH:mm:ss");
            var endTime = moment(monitoringEvent.timeInMillisEnd).format("HH:mm:ss");
            var startDate = moment(monitoringEvent.dateStart).format("YYYY-MM-DD");
            var endDate = moment(monitoringEvent.dateEnd).format("YYYY-MM-DD");
            var start = moment(startDate.concat(time, startTime, ms)).format();
            var end = moment(endDate.concat(time, endTime, ms)).format();
            var operationRange = moment(end).diff(moment(start), "minutes");


            return {
                cartNumber: monitoringEvent.cartNumber ? `'${monitoringEvent.cartNumber}'` : null,
                monitoringEventCode: monitoringEvent.code ? `'${monitoringEvent.code}'` : null,
                monitoringEventStartedDate: monitoringEvent.dateStart ? `'${moment(monitoringEvent.dateStart).format("L")}'` : null,
                eventStartedTime: monitoringEvent.timeInMillisStart ? `'${moment(monitoringEvent.timeInMillisStart).format("HH:mm:ss")}'` : null,
                eventEndTime: monitoringEvent.timeInMillisEnd ? `'${moment(monitoringEvent.timeInMillisEnd).format("HH:mm:ss")}'` : null,
                monitoringEventEndDate: monitoringEvent.dateEnd ? `'${moment(monitoringEvent.dateEnd).format("L")}'` : null,
                machineCode: monitoringEvent.machine ? `'${monitoringEvent.machine.code}'` : null,
                machineCondition: monitoringEvent.machine ? `'${monitoringEvent.machine.condition}'` : null,
                machineManufacture: monitoringEvent.machine ? `'${monitoringEvent.machine.manufacture}'` : null,
                machineName: monitoringEvent.machine ? `'${monitoringEvent.machine.name.replace(/'/g, '"')}'` : null,
                machineProcess: monitoringEvent.machine ? `'${monitoringEvent.machine.process.replace(/'/g, '"')}'` : null,
                machineStepProcess: monitoringEvent.machine ? `'${monitoringEvent.machine.step.process}'` : null,
                unitCode: monitoringEvent.machine ? `'${monitoringEvent.machine.unit.code}'` : null,
                divisionCode: monitoringEvent.machine ? `'${monitoringEvent.machine.unit.division.code}'` : null,
                divisionName: monitoringEvent.machine ? `'${monitoringEvent.machine.unit.division.name}'` : null,
                unitName: monitoringEvent.machine ? `'${monitoringEvent.machine.unit.name}'` : null,
                machineYear: monitoringEvent.machine ? `${monitoringEvent.machine.year}` : null,
                productionOrderBuyerAddress: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.buyer.address}'` : null,
                productionOrderBuyerCode: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.buyer.code}'` : null,
                productionOrderBuyerContact: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.buyer.contact}'` : null,
                productionOrderBuyerCountry: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.buyer.country}'` : null,
                productionOrderBuyerName: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.buyer.name.replace(/'/g, '"')}'` : null,
                productionOrderBuyerTempo: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.buyer.tempo}'` : null,
                productionOrderConstruction: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.construction}'` : null,
                productionOrderDeliveryDate: monitoringEvent.productionOrder ? `'${moment(monitoringEvent.productionOrder.deliveryDate).format("L")}'` : null,
                productionOrderProductionOrderDesign: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.design}'` : null,
                productionOrderFinishWidth: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.finishWidth}'` : null,
                productionOrderHandlingStandard: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.handlingStandard}'` : null,
                // lampStandardCode: monitoringEvent.productionOrder.lampStandards ? `'${monitoringEvent.productionOrder.lampStandards.code}'` : null,
                // lampStandardDescription: monitoringEvent.productionOrder.lampStandards ? `'${monitoringEvent.productionOrder.lampStandards.description}'` : null,
                // lampStandardName: monitoringEvent.productionOrder.lampStandards ? `'${monitoringEvent.productionOrder.lampStandards.name}'` : null,
                productionOrderMaterial: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.material.name}'` : null,
                productionOrderOrderNo: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.orderNo}'` : null,
                productionOrderOrderQuantity: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.orderQuantity}'` : null,
                productionOrderOrderType: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.orderType.name}'` : null,
                productionOrderOriginGreigeFabric: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.originGreigeFabric}'` : null,
                productionOrderProcessType: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.processType.name}'` : null,
                productionOrderRemark: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.remark}'` : null,
                productionOrderRollLength: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.rollLength}'` : null,
                productionOrderRun: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.RUN}'` : null,
                productionOrderSalesContractNo: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.salesContractNo}'` : null,
                productionOrderSample: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.sample}'` : null,
                productionOrderShrinkageStandard: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.shrinkageStandard}'` : null,
                productionOrderSpelling: monitoringEvent.productionOrder ? `${monitoringEvent.productionOrder.spelling}` : null,
                productionOrderUom: monitoringEvent.productionOrder ? `'${monitoringEvent.productionOrder.uom.unit}'` : null,
                monitoringEventRemark: monitoringEvent.remark ? `'${monitoringEvent.remark.replace(/'/g, '"')}'` : null,
                selectedProductionOrderDetailCode: monitoringEvent.selectedProductionOrderDetail ? `'${monitoringEvent.selectedProductionOrderDetail.code}'` : null,
                selectedProductionOrderDetailColorRequest: monitoringEvent.selectedProductionOrderDetail ? `'${monitoringEvent.selectedProductionOrderDetail.colorRequest.replace(/'/g, '"')}'` : null,
                selectedProductionOrderDetailColorTemplate: monitoringEvent.selectedProductionOrderDetail ? `'${monitoringEvent.selectedProductionOrderDetail.colorTemplate.replace(/'/g, '"')}'` : null,
                selectedProductionOrderDetailColorTypeCode: (monitoringEvent.selectedProductionOrderDetail && monitoringEvent.selectedProductionOrderDetail.colorType !== null) ? `'${monitoringEvent.selectedProductionOrderDetail.colorType.code}'` : null,
                selectedProductionOrderDetailColorTypeName: (monitoringEvent.selectedProductionOrderDetail && monitoringEvent.selectedProductionOrderDetail.colorType !== null) ? `'${monitoringEvent.selectedProductionOrderDetail.colorType.name}'` : null,
                selectedProductionOrderDetailColorTypeRemark: (monitoringEvent.selectedProductionOrderDetail && monitoringEvent.selectedProductionOrderDetail.colorType !== null) ? `'${monitoringEvent.selectedProductionOrderDetail.colorType.remark}'` : null,
                selectedProductionOrderDetailQuantity: monitoringEvent.selectedProductionOrderDetail ? `'${monitoringEvent.selectedProductionOrderDetail.quantity}'` : null,
                selectedProductionOrderDetailUom: monitoringEvent.selectedProductionOrderDetail ? `'${monitoringEvent.selectedProductionOrderDetail.uom.unit}'` : null,
                machineEventName: (monitoringEvent.machineEvent && monitoringEvent.machineEvent.name) ? `'${monitoringEvent.machineEvent.name.replace(/'/g, '"')}'` : null,
                eventRange: monitoringEvent.dateEnd ? `'${this.getOperationRange(operationRange)}'` : null,
                machineEventNo: (monitoringEvent.machineEvent && monitoringEvent.machineEvent.no) ? `'${monitoringEvent.machineEvent.no.replace(/'/g, '"')}'` : null,
                createdBy: monitoringEvent ? `'${monitoringEvent._createdBy}'` : null
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
                                var queryString = `INSERT INTO [dbo].[DL_Fact_Monitoring_Event_Temp]([cartNumber], [monitoringEventCode], [monitoringEventStartedDate], [eventStartedTime], [monitoringEventEndDate], [eventEndTime], [machineCode], [machineName], [machineProcess], [machineStepProcess], [unitCode], [divisionCode], [divisionName], [unitName], [productionOrderBuyerName], [productionOrderConstruction], [productionOrderDetailCode], [productionOrderDetailColorRequest], [productionOrderDetailColorTemplate], [productionOrderDetailColorTypeName], [productionOrderOrderType], [productionOrderProcessType], [productionOrderSalesContractNo], [monitoringEventRemark], [selectedProductionOrderDetailCode], [selectedProductionOrderDetailColorRequest], [selectedProductionOrderDetailColorTemplate], [selectedProductionOrderDetailColorTypeName], [machineEventName], [eventRange], [productionOrderOrderNo], [machineEventNo], [createdBy]) VALUES(${item.cartNumber}, ${item.monitoringEventCode}, ${item.monitoringEventStartedDate}, ${item.eventStartedTime}, ${item.monitoringEventEndDate}, ${item.eventEndTime}, ${item.machineCode}, ${item.machineName}, ${item.machineProcess}, ${item.machineStepProcess}, ${item.unitCode}, ${item.divisionCode}, ${item.divisionName}, ${item.unitName}, ${item.productionOrderBuyerName}, ${item.productionOrderConstruction}, ${item.selectedProductionOrderDetailCode}, ${item.selectedProductionOrderDetailColorRequest}, ${item.selectedProductionOrderDetailColorTemplate}, ${item.selectedProductionOrderDetailColorTypeName}, ${item.productionOrderOrderType}, ${item.productionOrderProcessType}, ${item.productionOrderSalesContractNo}, ${item.monitoringEventRemark}, ${item.selectedProductionOrderDetailCode}, ${item.selectedProductionOrderDetailColorRequest}, ${item.selectedProductionOrderDetailColorTemplate}, ${item.selectedProductionOrderDetailColorTypeName}, ${item.machineEventName}, ${item.eventRange}, ${item.productionOrderOrderNo}, ${item.machineEventNo}, ${item.createdBy});\n`;
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

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_UPSERT_FACT_MONITORING_EVENT").then((execResult) => {
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

};