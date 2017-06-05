'use strict';

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Machine = DLModels.master.Machine;
var MachineEvent = DLModels.master.MachineEvent;
var ArrayStep = DLModels.master.ArrayStep;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var CodeGenerator = require('../../utils/code-generator');
var UnitManager = require('./unit-manager');
var StepManager = require('./step-manager');
var MachineTypeManager = require('./machine-type-manager');

module.exports = class MachineManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.master.collection.Machine);
        this.unitManager = new UnitManager(db, user);
        this.stepManager = new StepManager(db, user);
        this.machineTypeManager = new MachineTypeManager(db, user);
    }

    _getQuery(paging) {
        var _default = {
                _deleted: false
            },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            divisionFilter = {},
            query = {};

        if (paging.keyword) {
            var keyRegex = new RegExp(paging.keyword, "i");
            var codeFilter = {
                'code': {
                    '$regex': keyRegex
                }
            };
            var nameFilter = {
                'name': {
                    '$regex': keyRegex
                }
            };
            var processFilter = {
                'process': {
                    '$regex': keyRegex
                }
            };
            var unitNameFilter = {
                'unit.name': {
                    '$regex': keyRegex
                }
            };
            keywordFilter['$or'] = [codeFilter, nameFilter, processFilter, unitNameFilter];
        }

        if (paging.division)
        {
            var divRegex = new RegExp(paging.division, "i");
            divisionFilter = {
                'unit.division.name': {
                    '$regex': divRegex
                }
            };
        }

        query["$and"] = [_default, keywordFilter, divisionFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = CodeGenerator();
        if (data.machineEvents){
            for (var machineEvent of data.machineEvents){
                machineEvent.code = CodeGenerator();
            }
        }
        return Promise.resolve(data);
    }

    _validate(machine) {
        var errors = {};
        var valid = machine;
        // 1. begin: Declare promises.
        var getMachinePromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });
        var getStep = [];
        for(var dataStep of valid.steps || []){
            if(dataStep.hasOwnProperty("stepId")){
                if (ObjectId.isValid(dataStep.stepId)){
                    getStep.push(this.stepManager.getSingleByIdOrDefault(new ObjectId(dataStep.stepId)));
                }
            }
        }
        var getUnit = valid.unit && ObjectId.isValid(valid.unit._id) ? this.unitManager.getSingleByIdOrDefault(new ObjectId(valid.unit._id)) : Promise.resolve(null);
        // var getStep = valid.step && ObjectId.isValid(valid.step._id) ? this.stepManager.getSingleByIdOrDefault(new ObjectId(valid.step._id)) : Promise.resolve(null);
        var getMachineType = valid.machineType && ObjectId.isValid(valid.machineType._id) ? this.machineTypeManager.getSingleByIdOrDefault(new ObjectId(valid.machineType._id)) : Promise.resolve(null);

        // 2. begin: Validation.
        return Promise.all([getMachinePromise, getUnit, getMachineType].concat(getStep)) // getStep
            .then(results => {
                var _machine = results[0];
                var _unit = results[1];
                // var _step = results[2];
                var _machineType = results[2];
                var _steps = results.slice(3, results.length) || [];

                if (_machine) {
                    errors["code"] = i18n.__("Machine.code.isExists:%s is already exists", i18n.__("Machine.code._:Code")); //"Code sudah ada";
                }

                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("Machine.name.isRequired:%s is required", i18n.__("Machine.name._:Name")); //"Nama Tidak Boleh Kosong";

                if (!valid.unit)
                    errors["unit"] = i18n.__("Machine.unit.isRequired:%s is required", i18n.__("Machine.unit._:Unit")); //"Unit Tidak Boleh Kosong";

                if (valid.steps && valid.steps.length > 0){
                    var stepErrors = [];
                    for (var tempStep of valid.steps || []) {
                        var itemError = {};
                        var _index = valid.steps.indexOf(tempStep);
                        if(!tempStep || !tempStep.stepId || tempStep.stepId.toString() === "")
                            itemError["step"] = i18n.__("Machine.steps.process.isRequired:%s is required", i18n.__("Machine.steps.process._:Step"));
                        else{
                            var itemDuplicateErrors = [];
                            var valueArr = valid.steps.map(function (item) { return item.stepId.toString() });
                            var isDuplicate = valueArr.some(function (item, idx) {
                                var itemError = {};
                                if (valueArr.indexOf(item) != idx) {
                                    itemError["step"] = i18n.__("Machine.steps.process.isDuplicate:%s is duplicate", i18n.__("Machine.steps.process._:Step")); //"Nama barang tidak boleh kosong";
                                }
                                if (Object.getOwnPropertyNames(itemError).length > 0) {
                                    itemDuplicateErrors[valueArr.indexOf(item)] = itemError;
                                    itemDuplicateErrors[idx] = itemError;
                                } else {
                                    itemDuplicateErrors[idx] = itemError;
                                }
                                return valueArr.indexOf(item) != idx
                            });
                            if(isDuplicate){
                                if (Object.getOwnPropertyNames(itemDuplicateErrors[_index]).length > 0) {
                                    Object.assign(itemError, itemDuplicateErrors[_index]);
                                }
                            } else {
                                var isExist = false;
                                for(var a of _steps){
                                    if(tempStep.stepId.toString() === a._id.toString()){
                                        isExist = true;
                                        break;
                                    }
                                }
                                if(!isExist)
                                    itemError["step"] = i18n.__("Machine.steps.process.isNotExists:%s is not exists", i18n.__("Machine.steps.process._:Step"));
                            }
                        }
                        stepErrors.push(itemError);
                    }

                    for (var stepError of stepErrors) {
                        if (Object.getOwnPropertyNames(stepError).length > 0) {
                            errors["steps"] = stepErrors;
                            break;
                        }
                    }
                }
                else
                    errors["steps"] = i18n.__("Machine.steps.isRequired:%s is required", i18n.__("Machine.steps._:Steps")); //"Steps harus diisi minimal satu";

                if (!valid.machineType)
                    errors["machineType"] = i18n.__("Machine.machineType.isRequired:%s is required", i18n.__("Machine.machineType._:Machine Type")); //"Machine Type Tidak Boleh Kosong";
                else if(!_machineType)
                    errors["machineType"] = i18n.__("Machine.machineType.isExists:%s is not exists", i18n.__("Machine.machineType._:Machine Type")); //"MachineType tidak ada";

                if (valid.unit && !_unit)
                    errors["unit"] = i18n.__("Machine.unit.isExists:%s is not exists", i18n.__("Machine.unit._:Unit")); //"Unit tidak ada";

                if(valid.machineEvents && valid.machineEvents.length > 0){
                    var machineEventErrors = [];
                    for(var dataEvent of valid.machineEvents){
                        var itemError = {};
                        var _index = valid.machineEvents.indexOf(dataEvent);
                        if(!dataEvent || !dataEvent.name || tempStep.name === "")
                            itemError["name"] = i18n.__("Machine.machineEvents.name.isRequired:%s is required", i18n.__("Machine.machineEvents.name._:Name"));
                        else{
                            var itemDuplicateErrors = [];
                            var valueArr = valid.machineEvents.map(function (item) { return item.name });
                            var isDuplicate = valueArr.some(function (item, idx) {
                                var itemError = {};
                                if (valueArr.indexOf(item) != idx) {
                                    itemError["name"] = i18n.__("Machine.machineEvents.name.isDuplicate:%s is duplicate", i18n.__("Machine.machineEvents.name._:Name")); //"Nama Event tidak boleh sama";
                                }
                                if (Object.getOwnPropertyNames(itemError).length > 0) {
                                    itemDuplicateErrors[valueArr.indexOf(item)] = itemError;
                                    itemDuplicateErrors[idx] = itemError;
                                } else {
                                    itemDuplicateErrors[idx] = itemError;
                                }
                                return valueArr.indexOf(item) != idx
                            });
                            if(isDuplicate){
                                if (Object.getOwnPropertyNames(itemDuplicateErrors[_index]).length > 0) {
                                    Object.assign(itemError, itemDuplicateErrors[_index]);
                                }
                            }
                        }
                        if(!dataEvent || !dataEvent.category || tempStep.category === "")
                            itemError["category"] = i18n.__("Machine.machineEvents.category.isRequired:%s is required", i18n.__("Machine.machineEvents.category._:Category"));
                        
                        if(!dataEvent || !dataEvent.no || tempStep.no === '')
                            itemError["no"] = i18n.__("Machine.machineEvents.no.isRequired:%s is required", i18n.__("Machine.machineEvents.no._:No"));
                        else{
                            var itemDuplicateErrors = [];
                            var valueArr = valid.machineEvents.map(function (item) { return item.no.toString() });
                            var isDuplicate = valueArr.some(function (item, idx) {
                                var itemError = {};
                                if (valueArr.indexOf(item) != idx) {
                                    itemError["no"] = i18n.__("Machine.machineEvents.no.isDuplicate:%s is duplicate", i18n.__("Machine.machineEvents.no._:No")); //"No Event tidak boleh sama";
                                }
                                if (Object.getOwnPropertyNames(itemError).length > 0) {
                                    itemDuplicateErrors[valueArr.indexOf(item)] = itemError;
                                    itemDuplicateErrors[idx] = itemError;
                                } else {
                                    itemDuplicateErrors[idx] = itemError;
                                }
                                return valueArr.indexOf(item) != idx
                            });
                            if(isDuplicate){
                                if (Object.getOwnPropertyNames(itemDuplicateErrors[_index]).length > 0) {
                                    Object.assign(itemError, itemDuplicateErrors[_index]);
                                }
                            }
                        }
                        machineEventErrors.push(itemError);
                    }

                    for (var Error of machineEventErrors) {
                        if (Object.getOwnPropertyNames(Error).length > 0) {
                            errors["machineEvents"] = machineEventErrors;
                            break;
                        }
                    }
                }
                // else
                //     errors["machineEvents"] = i18n.__("Machine.machineEvents.isRequired:%s is required", i18n.__("Machine.machineEvents._:Machine Event")); //"Steps harus diisi minimal satu";

                // if (valid.step && !_step)
                //     errors["step"] = i18n.__("Machine.step.isExists:%s is not exists", i18n.__("Machine.step._:Step")); //"Step tidak ada";

                // if (valid.machineType && !_machineType)
                //     errors["machineType"] = i18n.__("Machine.machineType.isExists:%s is not exists", i18n.__("Machine.machineType._:Machine Type")); //"MachineType tidak ada";

                if(valid.monthlyCapacity && valid.monthlyCapacity !== '')
                {
                    if(valid.monthlyCapacity < 0)
                    {
                        errors["monthlyCapacity"] = i18n.__("Machine.monthlyCapacity.notLess:%s should not be less than 0", i18n.__("Machine.monthlyCapacity._:Monthly Capacity")); //"monthlyCapacity tidak boleh kurang dari 0";
                    }
                }
                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                if (_unit) {
                    valid.unit = _unit;
                    valid.unitId = new ObjectId(_unit._id);
                }
                // if(_step){
                //     valid.step = _step;
                //     valid.stepId = new ObjectId(_step._id);
                // }
                var steps = [];
                for(var a of _steps){
                    var stepTemp = new ArrayStep();
                    stepTemp.stepId = new ObjectId(a._id);
                    stepTemp.step = a;
                    steps.push(stepTemp);
                }
                if(steps.length > 0)
                    valid.steps = steps;
                if(_machineType){
                    valid.machineType = _machineType;
                    valid.machineTypeId = new ObjectId(_machineType._id);
                }
                var tempMachineEvent = [];
                for(var a of valid.machineEvents){
                    var newMachineEvent = {};
                    if(!a.stamp || a.stamp.toString() === '')
                    	newMachineEvent = new MachineEvent(a);
                    else
                        newMachineEvent = a;
                    newMachineEvent.stamp(this.user.username, 'manager');
                    tempMachineEvent.push(newMachineEvent);
                }
                valid.machineEvents = tempMachineEvent;
                
                if (!valid.stamp)
                    valid = new Machine(valid);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    getMachineEvents(query){
        return new Promise((resolve, reject) => {
            var _default = {
                    _deleted: false
                },
                keywordFilter = {},
                machineCodeFilter = {},
                matchQuery = {};

            if (query.keyword){
                var regex = new RegExp(query.keyword, "i");
                var nameFilter = {
                    'machineEvents.name': {
                        '$regex': regex
                    }
                };
                var noFilter = {
                    'machineEvents.no': {
                        '$regex': regex
                    }
                };
                keywordFilter['$or'] = [nameFilter, noFilter];
            }

            if (query.machineCode){
                machineCodeFilter = {"code" : query.machineCode};
            }

            matchQuery["$and"] = [_default, keywordFilter, machineCodeFilter];
            var dataReturn = [];
            this.collection.aggregate([{ $unwind : "$machineEvents" }])
            .match(matchQuery)
            .toArray(function(err, result) {
                for(var machine of result){
                    var machineEvent = new MachineEvent(machine.machineEvents)
                    dataReturn.push(machineEvent);
                }
                resolve(dataReturn);
            });
        });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Machine}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Machine}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
};
