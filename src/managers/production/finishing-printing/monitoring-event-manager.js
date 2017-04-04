'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var MonitoringEvent = DLModels.production.finishingPrinting.MonitoringEvent;
var generateCode = require("../../../utils/code-generator");
var MachineManager = require('../../master/machine-manager');
var ProductionOrderManager = require('../../sales/production-order-manager');
var MonitoringSpecificationMachinerManager = require('./monitoring-specification-machine-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var moment = require('moment');


module.exports = class MonitoringEventManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.production.finishingPrinting.collection.MonitoringEvent);

        this.machineManager = new MachineManager(db, user);
        this.productionOrderManager = new ProductionOrderManager(db, user);
        this.monitoringSpecificationMachinerManager = new MonitoringSpecificationMachinerManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        },
            keywordFilter = {};

        var query = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterMachineName = {
                'machine.name': {
                    '$regex': regex
                }
            };

            var filterProductionOrder = {
                "productionOrder.orderNo": {
                    '$regex': regex
                }
            };

            var filterMachineEvent = {
                "machineEvent": {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterMachineName, filterProductionOrder, filterMachineEvent]
            };
        }
        query = {
            '$and': [deletedFilter, paging.filter, keywordFilter]
        }
        return query;
    }

    _validate(monitoringEvent) {
        var errors = {};
        var valid = monitoringEvent;
        var dateNow = new Date(); //moment().format('YYYY-MM-DD');

        var timeInMillisNow = (function () {
            var setupMoment = moment();
            setupMoment.set('year', 1970);
            setupMoment.set('month', 0);
            setupMoment.set('date', 1);
            return Number(setupMoment.format('x'));
        })();

        var getMonitoringEventPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });

        var getMachine = ObjectId.isValid(valid.machineId) ? this.machineManager.getSingleByIdOrDefault(new ObjectId(valid.machineId)) : Promise.resolve(null);
        var getProductionOrder = ObjectId.isValid(valid.productionOrderId) ? this.productionOrderManager.getSingleByIdOrDefault(valid.productionOrderId) : Promise.resolve(null);
        var getProductionOrderDetail = (valid.selectedProductionOrderDetail && valid.selectedProductionOrderDetail.code) ? this.productionOrderManager.getSingleProductionOrderDetail(valid.selectedProductionOrderDetail.code) : Promise.resolve(null);

        return Promise.all([getMonitoringEventPromise, getMachine, getProductionOrder, getProductionOrderDetail])
            .then(results => {
                var _monitoringEvent = results[0];
                var _machine = results[1];
                var _productionOrder = results[2];
                var _productionOrderDetail = results[3];

                if (_monitoringEvent)
                    errors["code"] = i18n.__("MonitoringEvent.code.isExists:%s is exists", i18n.__("MonitoringEvent.code._:Code"));

                if (!valid.dateStart)
                    errors["dateStart"] = i18n.__("MonitoringEvent.dateStart.isRequired:%s is required", i18n.__("MonitoringEvent.dateStart._:Date Start"));
                else {
                    valid.dateStart = new Date(valid.dateStart);
                    if (isNaN(valid.dateStart.valueOf()))
                        errors["dateStart"] = i18n.__("MonitoringEvent.dateStart.isValidFormat:%s is not in valid format", i18n.__("MonitoringEvent.dateStart._:Date Start"));
                    else {
                        valid.timeInMillisStart = valid.dateStart.getTime();
                        if (valid.dateStart > dateNow)
                            errors["dateStart"] = i18n.__("MonitoringEvent.dateStart.isGreater:%s is greater than today", i18n.__("MonitoringEvent.dateStart._:Date Start"));
                        // else if (valid.dateStart === dateNow && valid.timeInMillisStart > timeInMillisNow)
                        //     errors["timeInMillisStart"] = i18n.__("MonitoringEvent.timeInMillisStart.isGreater:%s is greater than today", i18n.__("MonitoringEvent.timeInMillisStart._:Time Start"));
                    }
                }

                if (valid.dateEnd) {
                    valid.dateEnd = new Date(monitoringEvent.dateEnd);
                    if (isNaN(valid.dateEnd.valueOf()))
                        errors["dateEnd"] = i18n.__("MonitoringEvent.dateEnd.isValidFormat:%s is not in valid format", i18n.__("MonitoringEvent.dateEnd._:Date End"));
                    else {
                        valid.timeInMillisEnd = valid.dateEnd.getTime();
                        if (valid.dateEnd > dateNow)
                            errors["dateEnd"] = i18n.__("MonitoringEvent.dateEnd.isGreater:%s is greater than today", i18n.__("MonitoringEvent.dateEnd._:Date End"));
                        else if (valid.dateStart > valid.dateEnd) {
                            var errorMessage = i18n.__("MonitoringEvent.dateStart.isGreaterThanDateEnd:%s is greater than Date End", i18n.__("MonitoringEvent.dateStart._:Date Start"));
                            errors["dateStart"] = errorMessage;
                            errors["dateEnd"] = errorMessage;
                        }
                        // else if (valid.dateEnd === dateNow && valid.timeInMillisEnd > timeInMillisNow)
                        //     errors["timeInMillisEnd"] = i18n.__("MonitoringEvent.timeInMillisEnd.isGreater:%s is greater than today", i18n.__("MonitoringEvent.timeInMillisEnd._:Time End"));
                    }
                }


                if (!_machine)
                    errors["machine"] = i18n.__("MonitoringEvent.machine.name.isRequired:%s is required", i18n.__("MonitoringEvent.machine.name._:Machine"));

                if (!_productionOrder)
                    errors["productionOrder"] = i18n.__("MonitoringEvent.productionOrder.isRequired:%s is required", i18n.__("MonitoringEvent.productionOrder._:Production Order Number"));

                if (!_productionOrderDetail)
                    errors["selectedProductionOrderDetail"] = i18n.__("MonitoringEvent.selectedProductionOrderDetail.isRequired:%s is required", i18n.__("MonitoringEvent.selectedProductionOrderDetail._:Color"));

                if (!valid.cartNumber || valid.cartNumber == '')
                    errors["cartNumber"] = i18n.__("MonitoringEvent.cartNumber.isRequired:%s is required", i18n.__("MonitoringEvent.cartNumber._:Cart Number"));

                if (!valid.machineEvent)
                    errors["machineEvent"] = i18n.__("MonitoringEvent.machineEvent.isRequired:%s is required", i18n.__("MonitoringEvent.machineEvent._:Machine Event"));

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if (valid.dateStart && valid.dateStart != '')
                    valid.dateStart = new Date(valid.dateStart);

                if (valid.dateEnd && valid.dateEnd != '')
                    valid.dateEnd = new Date(valid.dateEnd);
                else {
                    valid.dateEnd = null;
                    valid.timeInMillisEnd = null;
                }

                if (_machine) {
                    valid.machineId = _machine._id;
                    valid.machine = _machine;
                }

                if (_productionOrder) {
                    valid.productionOrderId = _productionOrder._id;
                    valid.productionOrder = _productionOrder;
                }

                if (_productionOrderDetail) {
                    valid.selectedProductionOrderDetail = _productionOrderDetail;
                }

                if (!valid.stamp)
                    valid = new MonitoringEvent(valid);

                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            })
    }

    getMonitoringEventReport(info) {
        var _defaultFilter = {
            _deleted: false
        },
            machineFilter = {},
            machineEventFilter = {},
            productionOrderFilter = {},
            dateFromFilter = {},
            dateToFilter = {},
            query = {};

        var dateFrom = info.dateFrom ? (new Date(info.dateFrom)) : (new Date(1900, 1, 1));
        var dateTo = info.dateTo ? (new Date(info.dateTo)) : (new Date());

        if (info.machineId && info.machineId != '') {
            var machineId = ObjectId.isValid(info.machineId) ? new ObjectId(info.machineId) : {};
            machineFilter = {
                'machine._id': machineId
            };
        }
        if (info.machineEventCode && info.machineEventCode != '') {
            machineEventFilter = {
                'machineEvent.code': info.machineEventCode
            };
        }
        if (info.productionOrderNumber && info.productionOrderNumber != '') {
            productionOrderFilter = {
                'productionOrder.orderNo': info.productionOrderNumber
            };
        }
        dateFromFilter = {
            '$or': [{
                'dateStart': {
                    $gte: dateFrom
                }
            }, {
                    'dateEnd': {
                        $gte: dateFrom
                    }
                }]
        };

        dateToFilter = {
            '$or': [{
                'dateStart': {
                    $lte: dateTo
                }
            }, {
                    'dateEnd': {
                        $lte: dateTo
                    }
                }]
        };

        query = {
            '$and': [_defaultFilter, machineFilter, machineEventFilter, productionOrderFilter, dateFromFilter, dateToFilter]
        };

        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .where(query)
                    .execute();
            });
    }

    /*getXls(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";

        for (var monitoringEvent of result.data) {
            index++;
            var item = {};
            item["No"] = index;
            item["Machine"] = monitoringEvent.machine ? monitoringEvent.machine.name : '';
            item["Production Order Number"] = monitoringEvent.productionOrder ? monitoringEvent.productionOrder.orderNo : '';
            item["Color"] = monitoringEvent.selectedProductionOrderDetail && monitoringEvent.selectedProductionOrderDetail.colorType ? monitoringEvent.selectedProductionOrderDetail.colorType.name : '';
            item["Date Start"] = monitoringEvent.dateStart ? moment(new Date(monitoringEvent.dateStart)).format(dateFormat) : '';
            item["Time Start"] = monitoringEvent.timeInMillisStart ? moment(monitoringEvent.timeInMillisStart).format('HH:mm') : '';
            item["Date End"] = monitoringEvent.dateEnd ? moment(new Date(monitoringEvent.dateEnd)).format(dateFormat) : '';
            item["Time End"] = monitoringEvent.timeInMillisEnd ? moment(monitoringEvent.timeInMillisEnd).format('HH:mm') : '';
            item["Cart Number"] = monitoringEvent.cartNumber;
            item["Machine Event"] = monitoringEvent.machineEvent ? monitoringEvent.machineEvent.name : '';
            item["Remark"] = monitoringEvent.remark;

            xls.data.push(item);
        }

        xls.options["No"] = "number";
        xls.options["Machine"] = "string";
        xls.options["Production Order Number"] = "string";
        xls.options["Color"] = "string";
        xls.options["Date Start"] = "string";
        xls.options["Time Start"] = "string";
        xls.options["Date End"] = "string";
        xls.options["Time End"] = "string";
        xls.options["Cart Number"] = "string";
        xls.options["Machine Event"] = "string";
        xls.options["Remark"] = "string";

        if (query.dateFrom && query.dateTo) {
            xls.name = `Monitoring Event Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Monitoring Event Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Monitoring Event Report ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Monitoring Event Report.xlsx`;

        return Promise.resolve(xls);
    }*/

    getXls(result, query) {
        return new Promise((resolve, reject) => {
            var xls = {};
            xls.data = [];
            xls.options = [];
            xls.name = '';

            var index = 0;
            var dateFormat = "DD/MM/YYYY";

            var getSpecificationMachine = [];

            for (var monitoringEvent of result.data) {
                var info = {};
                var time = moment(monitoringEvent.timeInMillisStart).format('HH:mm').split(":");
                var date = monitoringEvent.dateStart.toString();
                var dateTime = new Date(date);

                dateTime.setHours(time[0]);
                dateTime.setMinutes(time[1]);

                info.date = dateTime;
                info.machineId = monitoringEvent.machineId;
                info.productionOrderNumber = monitoringEvent.productionOrder.orderNo;
                getSpecificationMachine.push(this.monitoringSpecificationMachinerManager.getMonitoringSpecificationMachineByEvent(info));
            }

            Promise.all(getSpecificationMachine)
                .then((specificationMachines) => {
                    for (var monitoringEvent of result.data) {
                        var machine = specificationMachines[result.data.indexOf(monitoringEvent)].data[0];
                        index++;
                        var item = {};
                        item["No"] = index;
                        item["Production Order Number"] = monitoringEvent.productionOrder ? monitoringEvent.productionOrder.orderNo : '';
                        item["Color"] = monitoringEvent.selectedProductionOrderDetail && monitoringEvent.selectedProductionOrderDetail.colorType ? monitoringEvent.selectedProductionOrderDetail.colorType.name : '';
                        item["Date Start"] = monitoringEvent.dateStart ? moment(new Date(monitoringEvent.dateStart)).format(dateFormat) : '';
                        item["Time Start"] = monitoringEvent.timeInMillisStart ? moment(monitoringEvent.timeInMillisStart).format('HH:mm') : '';
                        item["Date End"] = monitoringEvent.dateEnd ? moment(new Date(monitoringEvent.dateEnd)).format(dateFormat) : '';
                        item["Time End"] = monitoringEvent.timeInMillisEnd ? moment(monitoringEvent.timeInMillisEnd).format('HH:mm') : '';
                        item["Cart Number"] = monitoringEvent.cartNumber;
                        item["Machine"] = monitoringEvent.machine ? monitoringEvent.machine.name : '';
                        item["Machine Event"] = monitoringEvent.machineEvent ? monitoringEvent.machineEvent.name : '';

                        if (machine) {
                            var indicators = [];
                            item["Tanggal"] = machine.date ? moment(new Date(machine.date)).format(dateFormat) : '';
                            item["Jam"] = machine.time ? moment(new Date(machine.time)).format(timeFormat) : '';

                            var indicators = [];
                            for (var indicator of machine.items) {
                                indicators.push(`${indicator.indicator} : ${indicator.value} ${indicator.uom}`);
                            }
                            item["Indikator"] = indicators.join("\n");
                        }
                        else {
                            item["Tanggal"] = '';
                            item["Jam"] = '';
                            item["Indikator"] = '';
                        }
                        item["Remark"] = monitoringEvent.remark;

                        xls.data.push(item);
                    }

                    xls.options["No"] = "number";
                    xls.options["Machine"] = "string";
                    xls.options["Production Order Number"] = "string";
                    xls.options["Color"] = "string";
                    xls.options["Date Start"] = "string";
                    xls.options["Time Start"] = "string";
                    xls.options["Date End"] = "string";
                    xls.options["Time End"] = "string";
                    xls.options["Cart Number"] = "string";
                    xls.options["Machine Event"] = "string";
                    xls.options["Remark"] = "string";

                    if (query.dateFrom && query.dateTo) {
                        xls.name = `Monitoring Event Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
                    }
                    else if (!query.dateFrom && query.dateTo) {
                        xls.name = `Monitoring Event Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
                    }
                    else if (query.dateFrom && !query.dateTo) {
                        xls.name = `Monitoring Event Report ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
                    }
                    else
                        xls.name = `Monitoring Event Report.xlsx`;

                    return Promise.resolve(xls);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    _beforeInsert(monitoringEvent) {
        monitoringEvent.code = generateCode();
        monitoringEvent._createdDate = new Date();
        return Promise.resolve(monitoringEvent);
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.production.finishingPrinting.collection.MonitoringEvent}__updatedDate`,

            key: {
                _updatedDate: -1
            }
        }

        var codeIndex = {
            name: `ix_${map.production.finishingPrinting.collection.MonitoringEvent}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }


}
