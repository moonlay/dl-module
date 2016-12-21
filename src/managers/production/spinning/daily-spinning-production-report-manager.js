'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var DailySpinningProductionReport = DLModels.production.spinning.DailySpinningProductionReport;
var UnitManager = require('../../master/unit-manager');
var BaseManager = require('module-toolkit').BaseManager;
var YarnEquivalentConversionManager = require('../../master/yarn-equivalent-conversion-manager');
var i18n = require('dl-i18n');

module.exports = class DailySpinningProductionReportManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.production.spinning.collection.DailySpinningProductionReport);
        this.productCollection = this.db.collection(map.master.collection.Product);
        this.unitManager = new UnitManager(db, user);
        this.yarnEquivalentConversionManager = new YarnEquivalentConversionManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        }, keywordFilter = {};

        var query = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterUnitCode = {
                "unit.code": {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterUnitCode]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    _validate(dailySpinningProductionReport) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = dailySpinningProductionReport;
            // 1. begin: Declare promises.
            var getDailySpinningProductionReportPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                    _deleted: false
                }]
            });

            var getUnit = valid.unitId && ObjectId.isValid(valid.unitId) ? this.unitManager.getSingleByIdOrDefault(valid.unitId) : Promise.resolve(null);

            var queryProduct =
                {
                    filter: {
                        productId: ObjectId.isValid(valid.productId) ? new ObjectId(valid.productId) : ''
                    }
                };

            Promise.all([getDailySpinningProductionReportPromise, getUnit])
                .then(results => {
                    var _module = results[0];
                    var _unit = results[1];

                    valid.unit = _unit;

                    if (!_unit)
                        errors["unit"] = i18n.__("DailySpinningProductionReport.unit.isRequired:%s is not exists", i18n.__("DailySpinningProductionReport.unit._:Unit"));
                    else if (!valid.unitId)
                        errors["unit"] = i18n.__("DailySpinningProductionReport.unit.isRequired:%s is required", i18n.__("DailySpinningProductionReport.unit._:Unit"));
                    else if (valid.unit) {
                        if (!valid.unit._id)
                            errors["unit"] = i18n.__("DailySpinningProductionReport.unit.isRequired:%s is required", i18n.__("DailySpinningProductionReport.unit._:Unit"));
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError ;
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.unitId = new ObjectId(_unit._id);
                    valid.unit = _unit;

                    if (!valid.stamp)
                        valid = new UnitReceiptNote(valid);

                    valid.stamp(this.user.username, 'manager');

                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.production.spinning.collection.DailySpinningProductionReport}_date`,
            key: {
                date: -1
            }
        }

        var unitIndex = {
            name: `ix_${map.production.spinning.collection.DailySpinningProductionReport}_unitId`,
            key: {
                unitId: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, unitIndex]);
    }

    addOutput(data) {
        var date = new Date(data.date);

        return new Promise((resolve, reject) => {
            this._getByDateAndUnit(date, data.unitId)
                .then(result => {
                    if (result == null) {
                        result = {};
                        result.entries = [];

                        var savedDate = new Date(date);
                        savedDate.setHours(0, 0, 0, 0);

                        result.date = savedDate;
                        result.unitId = new ObjectId(data.unitId);
                        result.unit = data.unit;

                        var outputs = [];
                        outputs.push(data);

                        var entry = {};
                        entry.productId = new ObjectId(data.productId);
                        entry.product = data.product;
                        entry.outputs = outputs;

                        result.entries.push(entry);

                        this.collection.insert(result)
                            .then(id => {
                                resolve(id);
                            })
                            .catch(e => {
                                reject(e);
                            });
                    }
                    else {
                        var flag = false;

                        for (var entry of result.entries) {
                            if (data.productId.toString() == entry.productId.toString()) {
                                entry.outputs.push(data);
                                flag = true;
                                break;
                            }
                        }

                        if (!flag) {

                            var outputs = [];
                            outputs.push(data);

                            var entry = {};
                            entry.productId = new ObjectId(data.productId);
                            entry.product = data.product;
                            entry.outputs = outputs;

                            result.entries.push(entry);
                        }

                        this.collection.update(result)
                            .then(id => {
                                resolve(id);
                            })
                            .catch(e => {
                                reject(e);
                            });
                    }
                })
                .catch(e => {
                    reject(e);
                })
        })
    }

    _getByRangeDate(_startDate, _endDate, _unitId) {

        return new Promise((resolve, reject) => {
            if (_startDate === '')
                resolve(null);

            if (_endDate === '')
                resolve(null);

            var query = {
                date: {
                    $gte: new Date(_startDate),
                    $lt: new Date(_endDate)
                },
                unitId: new ObjectId(_unitId)
            };
            this.collection.find(query).sort({ date: 1 }).toArray()
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    _getByDateAndUnit(_date, _unitId) {
        var _filterDate;

        return new Promise((resolve, reject) => {
            if (_date === '')
                resolve(null);
            if (_unitId === '')
                resolve(null);

            _filterDate = new Date(_date);
            _filterDate.setHours(0, 0, 0, 0);

            var query = {
                date: new Date(_filterDate),
                unitId: new ObjectId(_unitId)
            };
            this.getSingleByQueryOrDefault(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getFromDB(firstDay, lastDay, now, unitId) {
        
        var spinning = [];
        spinning['SPINNING 1'] = 55;
        spinning['SPINNING 2'] = 108;
        spinning['SPINNING 3'] = 64;

        var spindle = [];
        spindle['SPINNING 1'] = (47*432)+(8*480);
        spindle['SPINNING 2'] = (94*480)+(1*1008)+(3*1056)+(10*1008);
        spindle['SPINNING 3'] = (28*400)+(12*420)+(24*480);

        return new Promise((resolve, reject) => {
            this._getByRangeDate(firstDay, lastDay, unitId)
            .then(result => {

                var arr = [];

                for (var item of result.map(item => new DailySpinningProductionReport(item))) {

                    item.calculate(now);

                    var p = new Promise((resolve, reject) => {
                        var p1 = this.yarnEquivalentConversionManager._getByNe(Math.ceil(item.averageCount));
                        var p2 = this.yarnEquivalentConversionManager._getByNe(Math.floor(item.averageCount));

                        Promise.all([p1, p2, item])
                            .then(results => {
                                var c1 = results[0];
                                var c2 = results[1];
                                var c3 = results[2];

                                resolve({ item: c3, lowerConversionRatio: c1, upperConversionRatio: c2 });
                            })
                            .catch(e => {
                                reject(e);
                            })
                    })

                    arr.push(p);
                }

                Promise.all(arr)
                    .then(results => {

                        var mtdThreadCountInBale = 0;
                        var mtdUsedMachineCount = 0;
                        var mtdActualMachineCount = 0;

                        var result = [];

                        for (var data of results) {

                            var item = data.item;

                            item.spindleCount = spindle[item.unit.name];

                            item.actualMachineCount = spinning[item.unit.name];

                            mtdThreadCountInBale += item.threadCountInBale;
                            item.mtdThreadCountInBale = mtdThreadCountInBale;

                            item.factorStandard30s = (item.averageCount - Math.floor(item.averageCount)) * ((data.upperConversionRatio.conversionRatio - data.lowerConversionRatio.conversionRatio) + data.lowerConversionRatio.conversionRatio);
                            item.productionStandard30s = item.threadCountInBale * item.factorStandard30s;

                            mtdUsedMachineCount += item.usedMachineCount;
                            item.mtdUsedMachineCount = mtdUsedMachineCount;

                            mtdActualMachineCount += item.actualMachineCount;
                            item.mtdActualMachineCount = mtdActualMachineCount;

                            item.utilityPercentage = (item.usedMachineCount / item.actualMachineCount) * 100;
                            item.mtdUtilityPercentage = (item.mtdUsedMachineCount / item.mtdActualMachineCount) * 100;

                            result.push(item);
                        }

                        resolve(result);
                    })
            })
            .catch(e => {
                reject(e);
            })
        })
    }

    getDailySpinningProductionReport(firstDay, lastDay, unitId) {

        var now = new Date();

        var firstDay = new Date(firstDay);
        var lastDay = new Date(lastDay);

        return new Promise((resolve, reject) => {
            var p1 = this.getFromDB(firstDay, lastDay, now, unitId);
            var p2 = this.productCollection.find({"tags" : {$regex : ".*BENANG SPINNING.*"}}).toArray();

            Promise.all([p1, p2])
                .then(results => {
                    var data = results[0];
                    var products = results[1];

                    var model = {
                        date: [],
                        entries: products.map(product => {
                            return {
                                name: product.name,
                                threadCountInBale: [],
                                usedMachineCount: []
                            };
                        }),
                        threadCountInBale: [],
                        mtdThreadCountInBale: [],
                        averageCount: [],
                        factorStandard30s: [],
                        productionStandard30s: [],
                        usedMachineCount: [],
                        mtdUsedMachineCount: [],
                        actualMachineCount: [],
                        mtdActualMachineCount: [],
                        spindleCount: [],
                        utilityPercentage: [],
                        mtdUtilityPercentage: []
                    };

                    for (var i = 1; i <= lastDay.getDate(); i++) {
                        var curr = new Date(lastDay.getFullYear(), lastDay.getMonth(), i);

                        var currentData = data.find(item => {
                            return item.date.getTime() == curr.getTime();
                        })

                        currentData = currentData || {
                            date: new Date(lastDay.getFullYear(), lastDay.getMonth(), i),
                            entries: [],
                            threadCountInBale: 0,
                            mtdThreadCountInBale: 0,
                            averageCount: 0,
                            factorStandard30s: 0,
                            productionStandard30s: 0,
                            usedMachineCount: 0,
                            mtdUsedMachineCount: 0,
                            actualMachineCount: 0,
                            mtdActualMachineCount: 0,
                            spindleCount: 0,
                            utilityPercentage: 0,
                            mtdUtilityPercentage: 0
                        };

                        model.date.push(currentData.date);
                        model.threadCountInBale.push(currentData.threadCountInBale);
                        model.mtdThreadCountInBale.push(currentData.mtdThreadCountInBale);
                        model.averageCount.push(currentData.averageCount);
                        model.factorStandard30s.push(currentData.factorStandard30s);
                        model.productionStandard30s.push(currentData.productionStandard30s);
                        model.usedMachineCount.push(currentData.usedMachineCount);
                        model.mtdUsedMachineCount.push(currentData.mtdUsedMachineCount);
                        model.actualMachineCount.push(currentData.actualMachineCount);
                        model.mtdActualMachineCount.push(currentData.mtdActualMachineCount);
                        model.spindleCount.push(currentData.spindleCount);
                        model.utilityPercentage.push(currentData.utilityPercentage);
                        model.mtdUtilityPercentage.push(currentData.mtdUtilityPercentage);

                        for (var resultEntry of model.entries) {
                            var entry = currentData.entries.find(entry => entry.product.name == resultEntry.name);
                            entry = entry || {
                                threadCountInBale: 0,
                                usedMachineCount: 0
                            };
                            resultEntry.threadCountInBale.push(entry.threadCountInBale);
                            resultEntry.usedMachineCount.push(entry.usedMachineCount);
                        }

                    }

                    resolve(model);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }
}