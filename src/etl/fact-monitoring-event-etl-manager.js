"use strict"

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");


// internal deps 
require("mongodb-toolkit");

var MonitoringEventManager = require("../managers/production/finishing-printing/monitoring-event-manager");
var startedDate = new Date();

module.exports = class FactMonitoringEventEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.monitoringEventManager = new MonitoringEventManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    };

    run() {
        this.migrationLog.insert({
            description: "Fact Monitoring Event from MongoDB to Azure DWH",
            start: startedDate,
        })
        return this.extract()
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

    extract() {
        var timestamp = new Date(1970, 1, 1);
        return this.monitoringEventManager.collection.find({
            _deleted: false,
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
                machineName: `'${monitoringEvent.machine.name}'`,
                machineProcess: `'${monitoringEvent.machine.process}'`,
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
                productionOrderBuyerName: `'${monitoringEvent.productionOrder.buyer.name}'`,
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
                monitoringEventRemark: `'${monitoringEvent.remark}'`,
                selectedProductionOrderDetailCode: monitoringEvent.selectedProductionOrderDetail.code ? `'${monitoringEvent.selectedProductionOrderDetail.code}'` : null,
                selectedProductionOrderDetailColorRequest: monitoringEvent.selectedProductionOrderDetail.colorRequest ? `'${monitoringEvent.selectedProductionOrderDetail.colorRequest}'` : null,
                selectedProductionOrderDetailColorTemplate: monitoringEvent.selectedProductionOrderDetail.colorTemplate ? `'${monitoringEvent.selectedProductionOrderDetail.colorTemplate}'` : null,
                selectedProductionOrderDetailColorTypeCode: (monitoringEvent.selectedProductionOrderDetail.colorType !== null) ? `'${monitoringEvent.selectedProductionOrderDetail.colorType.code}'` : null,
                selectedProductionOrderDetailColorTypeName: (monitoringEvent.selectedProductionOrderDetail.colorType !== null) ? `'${monitoringEvent.selectedProductionOrderDetail.colorType.name}'` : null,
                selectedProductionOrderDetailColorTypeRemark: (monitoringEvent.selectedProductionOrderDetail.colorType !== null) ? `'${monitoringEvent.selectedProductionOrderDetail.colorType.remark}'` : null,
                selectedProductionOrderDetailQuantity: monitoringEvent.selectedProductionOrderDetail.quantity ? `'${monitoringEvent.selectedProductionOrderDetail.quantity}'` : null,
                selectedProductionOrderDetailUom: monitoringEvent.selectedProductionOrderDetail.uom ? `'${monitoringEvent.selectedProductionOrderDetail.uom.unit}'` : null,
                machineEventName: monitoringEvent.machineEvent ? `'${monitoringEvent.machineEvent.name}'` : null,
                eventRange: monitoringEvent.dateEnd ? `'${this.getOperationRange(operationRange)}'` : null
            }
        });
        return Promise.resolve([].concat.apply([], result));
    };

    // insertQuery(sql, query) {
    //     return new Promise((resolve, reject) => {
    //         sql.query(query, function (err, result) {
    //             if (err) {
    //                 reject(err);
    //             } else {
    //                 resolve(result);
    //             }
    //         })
    //     })
    // };

    load(data) {
        return this.sql.getConnection()
            .then((request) => {

                var sqlQuery = '';

                var count = 1;
                for (var item of data) {
                    sqlQuery = sqlQuery.concat(`INSERT INTO [dbo].[DL_Fact_Monitoring_Event]([cartNumber], [monitoringEventCode], [monitoringEventStartedDate], [eventStartedTime], [monitoringEventEndDate], [eventEndTime], [machineCode], [machineName], [machineProcess], [machineStepProcess], [unitCode], [divisionCode], [divisionName], [unitName], [productionOrderBuyerName], [productionOrderConstruction], [productionOrderDetailCode], [productionOrderDetailColorRequest], [productionOrderDetailColorTemplate], [productionOrderDetailColorTypeName], [productionOrderOrderType], [productionOrderProcessType], [productionOrderSalesContractNo], [monitoringEventRemark], [selectedProductionOrderDetailCode], [selectedProductionOrderDetailColorRequest], [selectedProductionOrderDetailColorTemplate], [selectedProductionOrderDetailColorTypeName], [machineEventName], [eventRange]) VALUES(${item.cartNumber}, ${item.monitoringEventCode}, ${item.monitoringEventStartedDate}, ${item.eventStartedTime}, ${item.monitoringEventEndDate}, ${item.eventEndTime}, ${item.machineCode}, ${item.machineName}, ${item.machineProcess}, ${item.machineStepProcess}, ${item.unitCode}, ${item.divisionCode}, ${item.divisionName}, ${item.unitName}, ${item.productionOrderBuyerName}, ${item.productionOrderConstruction}, ${item.selectedProductionOrderDetailCode}, ${item.selectedProductionOrderDetailColorRequest}, ${item.selectedProductionOrderDetailColorTemplate}, ${item.selectedProductionOrderDetailColorTypeName}, ${item.productionOrderOrderType}, ${item.productionOrderProcessType}, ${item.productionOrderSalesContractNo}, ${item.monitoringEventRemark}, ${item.selectedProductionOrderDetailCode}, ${item.selectedProductionOrderDetailColorRequest}, ${item.selectedProductionOrderDetailColorTemplate}, ${item.selectedProductionOrderDetailColorTypeName}, ${item.machineEventName}, ${item.eventRange});\n`);
                    count = count + 1;
                }

                request.multiple = true;

                var fs = require("fs");
                var path = "C:\\Users\\leslie.aula\\Desktop\\tttt.txt";

                fs.writeFile(path, sqlQuery, function (error) {
                    if (error) {
                        console.log("write error:  " + error.message);
                    } else {
                        console.log("Successful Write to " + path);
                    }
                });



                return request.query(sqlQuery)
                    // return request.query('select count(*) from Dimunit')
                    // return request.query('select top 1 * from Dimunit')
                    .then((results) => {
                        console.log(results);
                        return Promise.resolve();
                    })
            })
            .catch((err) => {
                console.log(err);
                return Promise.reject(err);
            });
    }

};