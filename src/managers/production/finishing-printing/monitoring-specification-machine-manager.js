'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var MonitoringSpecificationMachine = DLModels.production.finishingPrinting.MonitoringSpecificationMachine;
var MachineManager = require('../../master/machine-manager');
var ProductionOrderManager = require('../../sales/production-order-manager');
var CodeGenerator = require('../../../utils/code-generator');
var BaseManager = require('module-toolkit').BaseManager;

var i18n = require('dl-i18n');
var moment = require('moment');

module.exports = class MonitoringSpecificationMachineManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.production.finishingPrinting.collection.MonitoringSpecificationMachine);

        this.productionOrderManager = new ProductionOrderManager(db, user);
        this.machineManager = new MachineManager(db, user);

    }

    _getQuery(paging) {
        var _default = {
            _deleted: false
        }, keywordFilter = {}, pagingFilter = paging.filter || {},

            query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var codeFilter = {
                'code': {
                    '$regex': regex
                }
            };
            var dateFilter = {
                'date': {
                    '$regex': regex
                }
            };

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


            keywordFilter['$or'] = [codeFilter, dateFilter, filterMachineName, filterProductionOrder];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data._active = true;
        data.code = CodeGenerator();
        return Promise.resolve(data);
    }


    _validate(monitoringSpecificationMachine) {
        var errors = {};

        var valid = monitoringSpecificationMachine;
        // 1. begin: Declare promises.
        var getMonitoringSpecificationMachinePromise = this.collection.singleOrDefault({

            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code,
        });


        var getMachine = ObjectId.isValid(valid.machineId) ? this.machineManager.getSingleByIdOrDefault(new ObjectId(valid.machineId)) : Promise.resolve(null);
        var getProductionOrder = ObjectId.isValid(valid.productionOrderId) ? this.productionOrderManager.getSingleByIdOrDefault(new ObjectId(valid.productionOrderId)) : Promise.resolve(null);

        return Promise.all([getMonitoringSpecificationMachinePromise, getMachine, getProductionOrder])
            .then(results => {

                var _monitoringSpecificationMachine = results[0];
                var _machine = results[1];
                var _productionOrder = results[2];

                if (_monitoringSpecificationMachine)
                    errors["code"] = i18n.__("MonitoringSpecificationMachine.code.isRequired:%s is not exists", i18n.__("MonitoringSpecificationMachine.code._:Code"));

                if (!valid.date || valid.date == "" || valid.date == "undefined")
                    errors["date"] = i18n.__("MonitoringSpecificationMachine.date.isRequired:%s is required", i18n.__("MonitoringSpecificationMachine.date._:Date")); //"Date monitoring tidak boleh kosong";

                if (!valid.time || valid.time == "" || valid.time == "undefined")
                    errors["time"] = i18n.__("MonitoringSpecificationMachine.time.isRequired:%s is required", i18n.__("MonitoringSpecificationMachine.time._:Time")); //"Time monitoring tidak boleh kosong";

                if (!_machine)
                    errors["machine"] = i18n.__("MonitoringSpecificationMachine.machine.name.isRequired:%s is not exists", i18n.__("MonitoringSpecificationMachine.machine.name._:Machine")); //"machine tidak boleh kosong";

                if (!_productionOrder)
                    errors["productionOrder"] = i18n.__("MonitoringSpecificationMachine.productionOrder.orderNo.isRequired:%s is required", i18n.__("MonitoringSpecificationMachine.productionOrder.orderNo_:Production Order Number")); //"ProductionOrder tidak boleh kosong";

                if (!valid.cartNumber || valid.cartNumber == '')
                    errors["cartNumber"] = i18n.__("MonitoringSpecificationMachine.cartNumber.isRequired:%s is required", i18n.__("MonitoringSpecificationMachine.cartNumber._:Cart Number")); //"Nomor Kereta tidak boleh kosong";

                if (!valid.items) {
                    errors["items"] = i18n.__("MonitoringSpecificationMachine.items.isRequired:%s is required", i18n.__("MonitoringSpecificationMachine.items._:Items")); //"items tidak boleh kosong";
                }
                else if (valid.items) {
                    var itemErrors = [];
                    for (var item of valid.items) {
                        var itemError = {};

                        if (item.dataType.trim() == "input skala angka") {
                            var range = item.defaultValue.split("-");
                            if (item.value < parseInt(range[0]) || item.value > parseInt(range[1]) || item.value == "") {
                                itemError["value"] = i18n.__("MonitoringSpecificationMachine.items.value.isIncorrect:%s range is incorrect", i18n.__("MonitoringSpecificationMachine.items.value._:value")); //"range incorrect";                       
                            }
                        }

                        if (item.dataType == "input teks") {

                            if (!item.value || item.value == "") {
                                itemError["value"] = i18n.__("MonitoringSpecificationMachine.items.value.isRequired:%s is required", i18n.__("MonitoringSpecificationMachine.items.value._:value")); //"is required";                       
                            }
                        }

                        if (item.dataType == "input angka") {

                            if (item.value == "" || item.value == 0) {
                                item.value = 0;
                            }

                            // if (!item.value || item.value == "" || item.value == 0) {
                            //     itemError["value"] = i18n.__("MonitoringSpecificationMachine.items.value.isRequired:%s is required", i18n.__("MonitoringSpecificationMachine.items.value._:value")); //"is required";                       
                            // }
                        }


                        itemErrors.push(itemError);

                    }

                    for (var itemError of itemErrors) {
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            errors.items = itemErrors;
                            break;
                        }
                    }
                }

                if (_machine) {
                    valid.machine = _machine;
                    valid.machineId = new ObjectId(_machine._id);
                }
                if (_productionOrder) {
                    valid.productionOrderId = new ObjectId(_productionOrder._id);
                    valid.productionOrder = _productionOrder;
                }

                valid.date = new Date(valid.date);
                valid.time = new Date(valid.time);

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if (!valid.stamp)
                    valid = new MonitoringSpecificationMachine(valid);

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);

            });

    }

    getMonitoringSpecificationMachineReport(info) {
        var _defaultFilter = {
            _deleted: false
        }, machineFilter = {}, productionOrderFilter = {},
            monitoringSpecificationMachineFilter = {},
            dateFromFilter = {},
            dateToFilter = {},
            query = {};

        var dateFrom = info.dateFrom ? (new Date(info.dateFrom)) : (new Date(1900, 1, 1));
        var dateTo = info.dateTo ? (new Date(info.dateTo)) : (new Date());
        var now = new Date();

        if (info.machineId && info.machineId != '') {
            var machineId = ObjectId.isValid(info.machineId) ? new ObjectId(info.machineId) : {};
            machineFilter = { 'machine._id': machineId };
        }

        if (info.productionOrderNumber && info.productionOrderNumber != '') {
            productionOrderFilter = { 'productionOrder.orderNo': info.productionOrderNumber };
        }

        var filterDate = {
            "date": {
                $gte: new Date(dateFrom),
                $lte: new Date(dateTo)
            }
        };

        query = { '$and': [_defaultFilter, machineFilter, productionOrderFilter, filterDate] };

        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .where(query)
                    .execute();
            });
    }

    getXls(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";
        var timeFormat = "HH : mm";

        for (var monitoringSpecificationMachine of result.data) {
            index++;
            var item = {};
            item["No"] = index;
            item["Mesin"] = monitoringSpecificationMachine.machine ? monitoringSpecificationMachine.machine.name : '';
            item["Tanggal"] = monitoringSpecificationMachine.date ? moment(new Date(monitoringSpecificationMachine.date)).format(dateFormat) : '';
            item["Jam"] = monitoringSpecificationMachine.time ? moment(new Date(monitoringSpecificationMachine.time)).format(timeFormat) : '';
            item["No Surat Order Produksi"] = monitoringSpecificationMachine.productionOrder ? monitoringSpecificationMachine.productionOrder.orderNo : '';
            item["Nomor Kereta"] = monitoringSpecificationMachine.cartNumber;
            //dinamic items
            for (var indicator of monitoringSpecificationMachine.items) {
                item[indicator.indicator + " " + "(" + indicator.uom + ")"] = indicator ? indicator.value : '';
                xls.options[indicator.indicator] = "string";
            }

            xls.data.push(item);
        }

        xls.options["No"] = "number";
        xls.options["Mesin"] = "string";
        xls.options["Tanggal"] = "string";
        xls.options["Jam"] = "string";
        xls.options["No Surat Order Produksi"] = "string";
        xls.options["Nomor Kereta"] = "string";


        if (query.dateFrom && query.dateTo) {
            xls.name = `Monitoring Specification Machine Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Monitoring Specification Machine Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Monitoring Specification Machine Report ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Monitoring Specification Machine Report.xlsx`;

        return Promise.resolve(xls);
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.production.finishingPrinting.collection.MonitoringSpecificationMachine}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.production.finishingPrinting.collection.MonitoringSpecificationMachine}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

    getMonitoringSpecificationMachineByEvent(info) {
        var _defaultFilter = {
            _deleted: false
        }, machineFilter = {}, productionOrderFilter = {}, query = {};

        var date = info.date ? (new Date(info.date)) : (new Date());
        var now = new Date();

        if (info.machineId && info.machineId != '') {
            var machineId = ObjectId.isValid(info.machineId) ? new ObjectId(info.machineId) : {};
            machineFilter = { 'machineId': machineId };
        }

        if (info.productionOrderNumber && info.productionOrderNumber != '') {
            productionOrderFilter = { 'productionOrder.orderNo': info.productionOrderNumber };
        }

        var filterDate = {
            "time": {
                $lte: new Date(date)
            }
        };

        query = { '$and': [_defaultFilter, machineFilter, filterDate, productionOrderFilter] };

        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .where(query)
                    .order({ "time": -1 })
                    .take(1)
                    .execute();
            });
    }

}