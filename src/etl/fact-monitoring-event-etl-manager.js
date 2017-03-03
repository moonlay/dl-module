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
                cartNumber: `'${monitoringEvent.cartNumber}'`,
                monitoringEventCode: `'${monitoringEvent.code}'`,
                monitoringEventStartedDate: `'${moment(monitoringEvent.dateStart).format("L")}'`,
                eventStartedTime: `'${moment(monitoringEvent.timeInMillisStart).format("HH:mm:ss")}'`,
                eventEndTime: `'${moment(monitoringEvent.timeInMillisEnd).format("HH:mm:ss")}'`,
                monitoringEventEndDate: `'${moment(monitoringEvent.dateEnd).format("L")}'`,
                machineCode: `'${monitoringEvent.machine.code}'`,
                machineCondition: `'${monitoringEvent.machine.condition}'`,
                machineManufacture: `'${monitoringEvent.machine.manufacture}'`,
                machineName: `'${monitoringEvent.machine.name.replace(/'/g, '"')}'`,
                machineProcess: `'${monitoringEvent.machine.process.replace(/'/g, '"')}'`,
                machineStepProcess: `'${monitoringEvent.machine.step.process}'`,
                unitCode: `'${monitoringEvent.machine.unit.code}'`,
                divisionCode: `'${monitoringEvent.machine.unit.division.code}'`,
                divisionName: `'${monitoringEvent.machine.unit.division.name}'`,
                unitName: `'${monitoringEvent.machine.unit.name}'`,
                machineYear: `${monitoringEvent.machine.year}`,
                productionOrderBuyerAddress: `'${monitoringEvent.productionOrder.buyer.address}'`,
                productionOrderBuyerCode: `'${monitoringEvent.productionOrder.buyer.code}'`,
                productionOrderBuyerContact: `'${monitoringEvent.productionOrder.buyer.contact}'`,
                productionOrderBuyerCountry: `'${monitoringEvent.productionOrder.buyer.country}'`,
                productionOrderBuyerName: `'${monitoringEvent.productionOrder.buyer.name.replace(/'/g, '"')}'`,
                productionOrderBuyerTempo: `'${monitoringEvent.productionOrder.buyer.tempo}'`,
                productionOrderConstruction: monitoringEvent.productionOrder.construction ? `'${monitoringEvent.productionOrder.construction}'` : null,
                productionOrderDeliveryDate: `'${moment(monitoringEvent.productionOrder.deliveryDate).format("L")}'`,
                productionOrderProductionOrderDesign: `'${monitoringEvent.productionOrder.design}'`,
                productionOrderFinishWidth: `'${monitoringEvent.productionOrder.finishWidth}'`,
                productionOrderHandlingStandard: `'${monitoringEvent.productionOrder.handlingStandard}'`,
                // lampStandardCode: monitoringEvent.productionOrder.lampStandards ? `'${monitoringEvent.productionOrder.lampStandards.code}'` : null,
                // lampStandardDescription: monitoringEvent.productionOrder.lampStandards ? `'${monitoringEvent.productionOrder.lampStandards.description}'` : null,
                // lampStandardName: monitoringEvent.productionOrder.lampStandards ? `'${monitoringEvent.productionOrder.lampStandards.name}'` : null,
                productionOrderMaterial: `'${monitoringEvent.productionOrder.material.name}'`,
                productionOrderOrderNo: `'${monitoringEvent.productionOrder.orderNo}'`,
                productionOrderOrderQuantity: monitoringEvent.productionOrder.orderQuantity ? `'${monitoringEvent.productionOrder.orderQuantity}'` : null,
                productionOrderOrderType: `'${monitoringEvent.productionOrder.orderType.name}'`,
                productionOrderOriginGreigeFabric: `'${monitoringEvent.productionOrder.originGreigeFabric}'`,
                productionOrderProcessType: `'${monitoringEvent.productionOrder.processType.name}'`,
                productionOrderRemark: `'${monitoringEvent.productionOrder.remark}'`,
                productionOrderRollLength: `'${monitoringEvent.productionOrder.rollLength}'`,
                productionOrderRun: `'${monitoringEvent.productionOrder.RUN}'`,
                productionOrderSalesContractNo: `'${monitoringEvent.productionOrder.salesContractNo}'`,
                productionOrderSample: `'${monitoringEvent.productionOrder.sample}'`,
                productionOrderShrinkageStandard: `'${monitoringEvent.productionOrder.shrinkageStandard}'`,
                productionOrderSpelling: `${monitoringEvent.productionOrder.spelling}`,
                productionOrderUom: monitoringEvent.productionOrder.uom ? `'${monitoringEvent.productionOrder.uom.unit}'` : null,
                monitoringEventRemark: `'${monitoringEvent.remark.replace(/'/g, '"')}'`,
                selectedProductionOrderDetailCode: monitoringEvent.selectedProductionOrderDetail.code ? `'${monitoringEvent.selectedProductionOrderDetail.code}'` : null,
                selectedProductionOrderDetailColorRequest: monitoringEvent.selectedProductionOrderDetail.colorRequest ? `'${monitoringEvent.selectedProductionOrderDetail.colorRequest.replace(/'/g, '"')}'` : null,
                selectedProductionOrderDetailColorTemplate: monitoringEvent.selectedProductionOrderDetail.colorTemplate ? `'${monitoringEvent.selectedProductionOrderDetail.colorTemplate.replace(/'/g, '"')}'` : null,
                selectedProductionOrderDetailColorTypeCode: (monitoringEvent.selectedProductionOrderDetail.colorType !== null) ? `'${monitoringEvent.selectedProductionOrderDetail.colorType.code}'` : null,
                selectedProductionOrderDetailColorTypeName: (monitoringEvent.selectedProductionOrderDetail.colorType !== null) ? `'${monitoringEvent.selectedProductionOrderDetail.colorType.name}'` : null,
                selectedProductionOrderDetailColorTypeRemark: (monitoringEvent.selectedProductionOrderDetail.colorType !== null) ? `'${monitoringEvent.selectedProductionOrderDetail.colorType.remark}'` : null,
                selectedProductionOrderDetailQuantity: monitoringEvent.selectedProductionOrderDetail.quantity ? `'${monitoringEvent.selectedProductionOrderDetail.quantity}'` : null,
                selectedProductionOrderDetailUom: monitoringEvent.selectedProductionOrderDetail.uom ? `'${monitoringEvent.selectedProductionOrderDetail.uom.unit}'` : null,
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