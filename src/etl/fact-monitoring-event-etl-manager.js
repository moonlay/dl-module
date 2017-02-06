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

    transform(data) {
        var result = data.map((item) => {
            var monitoringEvent = item;
            var results = item.productionOrder.details.map((detail) => {
                return {
                    cartNumber: `'${monitoringEvent.cartNumber}'`,
                    monitoringEventCode: `'${monitoringEvent.code}'`,
                    monitoringEventStartedDate: `'${moment(monitoringEvent.dateStart).format("L")}'`,
                    eventStartedTime: `'${moment(monitoringEvent.timeInMillisStart).format("HH:mm:ss")}'`,
                    eventEndTime: `'${moment(monitoringEvent.timeInMillisEnd).format("HH:mm:ss")}'`,
                    monitoringEventEndDate: `'${moment(monitoringEvent.endDate).format("L")}'`,
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
                    productionOrderConstruction: `'${monitoringEvent.productionOrder.construction}'`,
                    productionOrderDeliveryDate: `'${moment(monitoringEvent.productionOrder.deliveryDate).format("L")}'`,
                    productionOrderProductionOrderDesign: `'${monitoringEvent.productionOrder.design}'`,
                    productionOrderDetailCode: `'${detail.code}'`,
                    productionOrderDetailColorRequest: `'${detail.colorRequest}'`,
                    productionOrderDetailColorTemplate: `'${detail.colorTemplate}'`,
                    productionOrderDetailColorTypeCode: (detail.colorType !== null) ? `'${detail.colorType.code}'` : null,
                    productionOrderDetailColorTypeName: (detail.colorType !== null) ? `'${detail.colorType.name}'` : null,
                    productionOrderDetailColorTypeRemark: (detail.colorType !== null) ? `'${detail.colorType.remark}'` : null,
                    productionOrderDetailQuantity: detail.quantity ? `${detail.quantity}` : null,
                    productionOrderDetailUom: detail.uom ? `'${detail.uom.unit}'` : null,
                    productionOrderFinishWidth: `'${monitoringEvent.productionOrder.finishWidth}'`,
                    productionOrderHandlingStandard: `'${monitoringEvent.productionOrder.handlingStandard}'`,
                    lampStandardCode: `'${monitoringEvent.productionOrder.lampStandard.code}'`,
                    lampStandardDescription: `'${monitoringEvent.productionOrder.lampStandard.description}'`,
                    lampStandardName: `'${monitoringEvent.productionOrder.lampStandard.name}'`,
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
                    selectedProductionOrderDetailCode: `'${monitoringEvent.selectedProductionOrderDetail.code}'`,
                    selectedProductionOrderDetailColorRequest: `'${monitoringEvent.selectedProductionOrderDetail.colorRequest}'`,
                    selectedProductionOrderDetailColorTemplate: `'${monitoringEvent.selectedProductionOrderDetail.colorTemplate}'`,
                    selectedProductionOrderDetailColorTypeCode: (monitoringEvent.selectedProductionOrderDetail.colorType !== null) ? `'${monitoringEvent.selectedProductionOrderDetail.colorType.code}'` : null,
                    selectedProductionOrderDetailColorTypeName: (monitoringEvent.selectedProductionOrderDetail.colorType !== null) ? `'${monitoringEvent.selectedProductionOrderDetail.colorType.name}'` : null,
                    selectedProductionOrderDetailColorTypeRemark: (monitoringEvent.selectedProductionOrderDetail.colorType !== null) ? `'${monitoringEvent.selectedProductionOrderDetail.colorType.remark}'` : null,
                    selectedProductionOrderDetailQuantity: monitoringEvent.selectedProductionOrderDetail.quantity ? `'${monitoringEvent.selectedProductionOrderDetail.quantity}'` : null,
                    selectedProductionOrderDetailUom: monitoringEvent.selectedProductionOrderDetail.uom ? `'${monitoringEvent.selectedProductionOrderDetail.uom.unit}'` : null
                };
            });
            return [].concat.apply([], results);
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
                    sqlQuery = sqlQuery.concat(`INSERT INTO DL_Fact_Monitoring_Event([cartNumber], [monitoringEventCode], [monitoringEventStartedDate], [eventStartedTime], [monitoringEventEndDate], [eventEndTime], [machineCode], [machineCondition], [machineManufacture], [machineName], [machineProcess], [machineStepProcess], [unitCode], [divisionCode], [divisionName], [unitName], [machineYear], [productionOrderBuyerAddress], [productionOrderBuyerCode], [productionOrderBuyerContact], [productionOrderBuyerCountry], [productionOrderBuyerName], [productionOrderBuyerTempo], [productionOrderConstruction], [productionOrderDeliveryDate], [productionOrderProductionOrderDesign], [productionOrderDetailCode], [productionOrderDetailColorRequest], [productionOrderDetailColorTemplate], [productionOrderDetailColorTypeCode], [productionOrderDetailColorTypeName], [productionOrderDetailColorTypeRemark], [productionOrderDetailQuantity], [productionOrderDetailUom], [productionOrderFinishWidth], [productionOrderHandlingStandard], [lampStandardCode], [lampStandardDescription], [lampStandardName], [productionOrderMaterial], [productionOrderOrderNo],  [productionOrderOrderQuantity], [productionOrderOrderType], [productionOrderOriginGreigeFabric], [productionOrderProcessType], [productionOrderRemark], [productionOrderRollLength], [productionOrderRun], [productionOrderSalesContractNo], [productionOrderSample], [productionOrderShrinkageStandard], [productionOrderSpelling], [productionOrderUom], [monitoringEventRemark], [selectedProductionOrderDetailCode], [selectedProductionOrderDetailColorRequest], [selectedProductionOrderDetailColorTemplate], [selectedProductionOrderDetailColorTypeCode], [selectedProductionOrderDetailColorTypeName], [selectedProductionOrderDetailColorTypeRemark], [selectedProductionOrderDetailQuantity], [selectedProductionOrderDetailUom]) VALUES(${item.cartNumber}, ${item.monitoringEventCode}, ${item.monitoringEventStartedDate}, ${item.eventStartedTime}, ${item.monitoringEventEndDate}, ${item.eventEndTime}, ${item.machineCode}, ${item.machineCondition}, ${item.machineManufacture}, ${item.machineName}, ${item.machineProcess}, ${item.machineStepProcess}, ${item.unitCode}, ${item.divisionCode}, ${item.divisionName}, ${item.unitName}, ${item.machineYear}, ${item.productionOrderBuyerAddress}, ${item.productionOrderBuyerCode}, ${item.productionOrderBuyerContact}, ${item.productionOrderBuyerCountry}, ${item.productionOrderBuyerName}, ${item.productionOrderBuyerTempo}, ${item.productionOrderConstruction}, ${item.productionOrderDeliveryDate}, ${item.productionOrderProductionOrderDesign}, ${item.productionOrderDetailCode}, ${item.productionOrderDetailColorRequest}, ${item.productionOrderDetailColorTemplate}, ${item.productionOrderDetailColorTypeCode}, ${item.productionOrderDetailColorTypeName}, ${item.productionOrderDetailColorTypeRemark}, ${item.productionOrderDetailQuantity}, ${item.productionOrderDetailUom}, ${item.productionOrderFinishWidth}, ${item.productionOrderHandlingStandard}, ${item.lampStandardCode}, ${item.lampStandardDescription}, ${item.lampStandardName}, ${item.productionOrderMaterial}, ${item.productionOrderOrderNo}, ${item.productionOrderOrderQuantity}, ${item.productionOrderOrderType}, ${item.productionOrderOriginGreigeFabric}, ${item.productionOrderProcessType}, ${item.productionOrderRemark}, ${item.productionOrderRollLength}, ${item.productionOrderRun}, ${item.productionOrderSalesContractNo}, ${item.productionOrderSample}, ${item.productionOrderShrinkageStandard}, ${item.productionOrderSpelling}, ${item.productionOrderUom}, ${item.monitoringEventRemark}, ${item.selectedProductionOrderDetailCode}, ${item.selectedProductionOrderDetailColorRequest}, ${item.selectedProductionOrderDetailColorTemplate}, ${item.selectedProductionOrderDetailColorTypeCode}, ${item.selectedProductionOrderDetailColorTypeName}, ${item.selectedProductionOrderDetailColorTypeRemark}, ${item.selectedProductionOrderDetailQuantity}, ${item.selectedProductionOrderDetailUom});\n`);

                    count = count + 1;
                }

                request.multiple = true;

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