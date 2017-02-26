"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var StepManager = require('../../master/step-manager');
var InstructionManager = require('../../master/instruction-manager');
var MachineManager = require('../../master/machine-manager');
var ProductManager = require('../../master/product-manager');
var ColorTypeManager = require('../../master/color-type-manager');
var ProductionOrderManager = require('../../sales/production-order-manager');
var DailyOperation = DLModels.production.finishingPrinting.DailyOperation;
var Kanban = DLModels.production.finishingPrinting.Kanban;
var Partition = DLModels.production.finishingPrinting.Partition;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var codeGenerator = require('../../../utils/code-generator');
var moment = require('moment');

module.exports = class DailyOperationManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.production.finishingPrinting.collection.DailyOperation);
        this.stepManager = new StepManager(db, user);
        this.instructionManager = new InstructionManager(db, user);
        this.machineManager = new MachineManager(db, user);
        this.productManager = new ProductManager(db, user);
        this.colorTypeManager = new ColorTypeManager(db, user);
        this.productionOrderManager = new ProductionOrderManager(db, user);
    }

    _getQuery(paging) {
        var _default = {
                _deleted: false
            },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var orderNoFilter = {
                "productionOrder.orderNo": {
                    "$regex": regex
                }
            };
            var colorFilter = {
                "color": {
                    "$regex": regex
                }
            };
            var colorTypeFilter = {
                "colorType.name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [orderNoFilter, colorFilter, colorTypeFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _getQueryKanban(paging){
        var _default = {
                "$and" : [{
                    _deleted: false
                },{
                    "kanban.partitions.no" : {"$ne" : ""}
                }]
            },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var orderNoFilter = {
                "productionOrder.orderNo": {
                    "$regex": regex
                }
            };
            var noKanbanFilter = {
                "kanban.partitions.no": {
                    "$regex": regex
                }
            };
            var machineFilter = {
                "kanban.partitions.machine.name": {
                    "$regex": regex
                }
            };
            var stepFilter = {
                "kanban.partitions.step.process": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [orderNoFilter, noKanbanFilter, machineFilter, stepFilter];
        }
        query["$and"] = [_default, keywordFilter]//, pagingFilter];
        return query;
    }

    _validate(dailyOperation) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = dailyOperation;
            //1. begin: Declare promises.
            var getStep = valid.stepId && ObjectId.isValid(valid.stepId) ? this.stepManager.getSingleByIdOrDefault(new ObjectId(valid.stepId)) : Promise.resolve(null);
            var getProductionOrder = valid.productionOrderId && ObjectId.isValid(valid.productionOrderId) ? this.productionOrderManager.getSingleByIdOrDefault(new ObjectId(valid.productionOrderId)) : Promise.resolve(null);
            var getMachine = valid.machineId && ObjectId.isValid(valid.machineId) ? this.machineManager.getSingleByIdOrDefault(new ObjectId(valid.machineId)) : Promise.resolve(null);
            var getInstruction = valid.instructionId && ObjectId.isValid(valid.instructionId) ? this.instructionManager.getSingleByIdOrDefault(new ObjectId(valid.instructionId)) : Promise.resolve(null);
            var getProduct = valid.materialId && ObjectId.isValid(valid.materialId) ? this.productManager.getSingleByIdOrDefault(new ObjectId(valid.materialId)) : Promise.resolve(null);
            Promise.all([getStep,getProductionOrder,getMachine,getInstruction, getProduct])
                .then(results => {
                    var _step = results[0];
                    var _productionOrder = results[1];
                    var _machine = results[2];
                    var _instruction = results[3];
                    var _product = results[4];
                    var getData = Promise.resolve(null);
                    var getDailyOperation = Promise.resolve(null);
                    if(_productionOrder){
                        if(_productionOrder.orderType){
                            if(_productionOrder.orderType.name.trim().toLowerCase() != "printing" && _productionOrder.orderType.name.trim().toLowerCase() != "yarn dyed"){
                                getData = this.getSingleByQueryOrDefault({
                                    '$and' : [{
                                            "productionOrderId" : valid.productionOrderId && ObjectId.isValid(valid.productionOrderId) ? (new ObjectId(valid.productionOrderId)) : {}
                                        },{
                                            '_deleted' : false
                                        },{
                                            'materialId' : valid.materialId && ObjectId.isValid(valid.materialId) ? (new ObjectId(valid.materialId)) : {}
                                        },{
                                            'materialConstructionId' : valid.productionOrder ? (new ObjectId(valid.productionOrder.materialConstructionId)) : {}
                                        },{
                                            'yarnMaterialId' : valid.productionOrder ? (new ObjectId(valid.productionOrder.yarnMaterialId)) : {}
                                        },{
                                            'color' : valid.color
                                        },{
                                            'colorTypeId' : valid.colorTypeId && ObjectId.isValid(valid.colorTypeId) ? (new ObjectId(valid.colorTypeId)) : {}
                                        }]
                                });
                                getDailyOperation = this.getSingleByQueryOrDefault({
                                        '$and' : [{
                                            "productionOrderId" : valid.productionOrderId && ObjectId.isValid(valid.productionOrderId) ? (new ObjectId(valid.productionOrderId)) : {}
                                        },{
                                            '_deleted' : false
                                        },{
                                            'materialId' : valid.materialId && ObjectId.isValid(valid.materialId) ? (new ObjectId(valid.materialId)) : {}
                                        },{
                                            'materialConstructionId' : valid.productionOrder ? (new ObjectId(valid.productionOrder.materialConstructionId)) : {}
                                        },{
                                            'yarnMaterialId' : valid.productionOrder ? (new ObjectId(valid.productionOrder.yarnMaterialId)) : {}
                                        },{
                                            'color' : valid.color
                                        },{
                                            'colorTypeId' : valid.colorTypeId && ObjectId.isValid(valid.colorTypeId) ? (new ObjectId(valid.colorTypeId)) : {}
                                        },{
                                            'kanban.partitions' : {
                                                '$elemMatch' : {
                                                    'code' : valid.code, 'no' : valid.no, 'machineId' : valid.machineId && ObjectId.isValid(valid.machineId) ? (new ObjectId(valid.machineId)) : {} 
                                                }
                                            }
                                        }]
                                    });
                            }else{
                                getData = this.getSingleByQueryOrDefault({
                                    '$and' : [{
                                            "productionOrderId" : valid.productionOrderId && ObjectId.isValid(valid.productionOrderId) ? (new ObjectId(valid.productionOrderId)) : {}
                                        },{
                                            '_deleted' : false
                                        },{
                                            'materialId' : valid.materialId && ObjectId.isValid(valid.materialId) ? (new ObjectId(valid.materialId)) : {}
                                        },{
                                            'materialConstructionId' : valid.productionOrder ? (new ObjectId(valid.productionOrder.materialConstructionId)) : {}
                                        },{
                                            'yarnMaterialId' : valid.productionOrder ? (new ObjectId(valid.productionOrder.yarnMaterialId)) : {}
                                        },{
                                            'color' : valid.color
                                        }]
                                });
                                getDailyOperation = this.getSingleByQueryOrDefault({
                                        '$and' : [{
                                            "productionOrderId" : valid.productionOrderId && ObjectId.isValid(valid.productionOrderId) ? (new ObjectId(valid.productionOrderId)) : {}
                                        },{
                                            '_deleted' : false
                                        },{
                                            'materialId' : valid.materialId && ObjectId.isValid(valid.materialId) ? (new ObjectId(valid.materialId)) : {}
                                        },{
                                            'materialConstructionId' : valid.productionOrder ? (new ObjectId(valid.productionOrder.materialConstructionId)) : {}
                                        },{
                                            'yarnMaterialId' : valid.productionOrder ? (new ObjectId(valid.productionOrder.yarnMaterialId)) : {}
                                        },{
                                            'color' : valid.color
                                        },{
                                            'kanban.partitions' : {
                                                '$elemMatch' : {
                                                    'code' : valid.code, 'no' : valid.no, 'machineId' : valid.machineId && ObjectId.isValid(valid.machineId) ? (new ObjectId(valid.machineId)) : {} 
                                                }
                                            }
                                        }]
                                    });
                            }
                        }
                    }
                    Promise.all([getData, getDailyOperation])
                        .then(result => {
                            var _dataDaily = result[0];
                            var _dailyOperation = result[1];
                            var now = new Date();
                            
                            if(!valid.productionOrder)
                                errors["productionOrder"] = i18n.__("DailyOperation.productionOrder.isRequired:%s is required", i18n.__("DailyOperation.productionOrder._:ProductionOrder")); //"Production Order harus diisi";
                            else if(!_productionOrder)
                                errors["productionOrder"] = i18n.__("DailyOperation.productionOrder.notFound:%s not found", i18n.__("DailyOperation.productionOrder._:ProductionOrder")); //"Production Order tidak ditemukan";
                            else if(!_dataDaily)
                                errors["productionOrder"] = i18n.__("DailyOperation.productionOrder.notFound:%s not found", i18n.__("DailyOperation.productionOrder._:ProductionOrder")); //"Production Order tidak ditemukan";

                            if(!valid.color || valid.color == '')
                                errors["color"] = i18n.__("DailyOperation.color.isRequired:%s not required", i18n.__("DailyOperation.color._:Color")); //"color tidak ditemukan";
                            else if(!_productionOrder)
                                errors["color"] = i18n.__("DailyOperation.color.notFound:%s not found", i18n.__("DailyOperation.color._:Color")); //"Color tidak ditemukan";
                            else if(_productionOrder){
                                var errorColor = true;
                                for(var a of _productionOrder.details){
                                    if(a.colorRequest === valid.color)
                                        errorColor = false;
                                }
                                if(errorColor)
                                    errors["color"] = i18n.__("DailyOperation.color.notFound:%s not found", i18n.__("DailyOperation.color._:Color")); //"Color tidak ditemukan";
                            }

                            if(!valid.instructionId || valid.instructionId == '')
                                errors["instruction"] = i18n.__("DailyOperation.kanban.instruction.isRequired:%s not required", i18n.__("DailyOperation.kanban.instruction._:Instruction")); //"Instruction tidak ditemukan";
                            else if(!_instruction)
                                errors["instruction"] = i18n.__("DailyOperation.kanban.instruction.isRequired:%s not required", i18n.__("DailyOperation.kanban.instruction._:Instruction")); //"Instruction tidak ditemukan";
                            else{
                                if(_dataDaily){
                                    if(_dataDaily.kanban.instruction.name != ""){
                                        if(_dataDaily.kanban.instructionId.toString() != _instruction._id.toString())
                                            errors["instruction"] = i18n.__("DailyOperation.kanban.instruction.isMatch:%s not match", i18n.__("DailyOperation.kanban.instruction._:Instruction")); //"Instruction tidak sama";
                                    }
                                }
                            }

                            if(!valid.no || valid.no == ''){
                                errors["no"] = i18n.__("DailyOperation.kanban.partitions.no.isRequired:%s not required", i18n.__("DailyOperation.kanban.partitions.no._:No")); //"No tidak ditemukan";
                            }else if(valid.method === "create"){
                                if(_dailyOperation){
                                    errors["no"] = i18n.__("DailyOperation.kanban.partitions.no.isExist:%s is Exist", i18n.__("DailyOperation.kanban.partitions.no._:No")); //"No dengan mesin sudah ada";
                                }
                            }else{
                                if(!_dailyOperation){
                                    errors["no"] = i18n.__("DailyOperation.kanban.partitions.no.notExist:%s is Not Exist", i18n.__("DailyOperation.kanban.partitions.no._:No")); //"No tidak ditemukan";
                                }
                            }
                            if(!valid.shift || valid.shift == ''){
                                errors["shift"] = i18n.__("DailyOperation.kanban.partitions.shift.isRequired:%s not required", i18n.__("DailyOperation.kanban.partitions.shift._:Shift")); //"Shift tidak ditemukan";
                            }
                            if(!valid.stepId || valid.stepId == ''){
                                errors["step"] = i18n.__("DailyOperation.kanban.partitions.step.isRequired:%s not required", i18n.__("DailyOperation.kanban.partitions.step._:Step")); //"Step tidak ditemukan";
                            }else if(!_step){
                                errors["step"] = i18n.__("DailyOperation.kanban.partitions.step.isRequired:%s not required", i18n.__("DailyOperation.kanban.partitions.step._:Step")); //"Step tidak ditemukan";
                            }
                            if(!valid.machineId || valid.machineId == ''){
                                errors["machine"] = i18n.__("DailyOperation.kanban.partitions.machine.isRequired:%s not required", i18n.__("DailyOperation.kanban.partitions.machine._:Machine")); //"Machine tidak ditemukan";
                            }else if(!_machine){
                                errors["machine"] = i18n.__("DailyOperation.kanban.partitions.machine.isRequired:%s not required", i18n.__("DailyOperation.kanban.partitions.machine._:Machine")); //"Machine tidak ditemukan";
                            }

                            if (!valid.dateInput || valid.dateInput == ''){
                                errors["dateInput"] = i18n.__("DailyOperation.kanban.partitions.dateInput.isRequired:%s not required", i18n.__("DailyOperation.kanban.partitions.dateInput._:DateInput")); //"Date Input tidak ditemukan";
                            }
                            else{
                                var dateInput = new Date(valid.dateInput);
                                if(dateInput > now){
                                    errors["dateInput"] = i18n.__("DailyOperation.kanban.partitions.dateInput.isMoreThan:%s is not be more than this day", i18n.__("DailyOperation.kanban.partitions.dateInput._:DateInput")); //"Date Input tidak ditemukan";
                                }
                            }

                            if (valid.dateOutput && valid.dateOutput != '' && valid.dateInput && valid.dateInput != ''){
                                var timeInMoment = moment(valid.timeInput);
                                var timeOutMoment = moment(valid.timeOutput);
                                var dateOutput = new Date(valid.dateOutput);
                                var dateTimeOutput = new Date(`${valid.dateOutput} ${timeOutMoment}:00`);
                                var dateTimeInput = new Date(`${valid.dateInput} ${timeInMoment}:00`);
                                if(valid.dateOutput != "1900-01-01 00:00:00"){
                                    if(dateOutput > now)
                                    {
                                        errors["dateOutput"] = i18n.__("DailyOperation.kanban.partitions.dateOutput.isMoreThan:%s is not be more than this day", i18n.__("DailyOperation.kanban.partitions.dateOutput._:DateOutput")); //"Date Input tidak ditemukan";
                                    }
                                    else if(dateTimeInput > dateTimeOutput){
                                        errors["dateInput"] = i18n.__("DailyOperation.kanban.partitions.dateInput.isLessThanOutput:%s is must be less than Date Output", i18n.__("DailyOperation.kanban.partitions.dateInput._:DateInput")); // "tanggal dan jam output harus lebih besar dari tanggal dan jam input";
                                        errors["dateOutput"] = i18n.__("DailyOperation.kanban.partitions.dateOutput.isMoreThan:%s is must be more than Date Input", i18n.__("DailyOperation.kanban.partitions.dateOutput._:DateOutput")); // "tanggal dan jam output harus lebih besar dari tanggal dan jam input";
                                    }
                                }
                            }

                            if(!valid.input || valid.input == ''){
                                errors["input"] = i18n.__("DailyOperation.kanban.partitions.input.isRequired:%s is must be more than 0", i18n.__("DailyOperation.kanban.partitions.input._:Input")); //"nilai input harus lebih besar dari 0";
                            }else if(valid.input < 1){
                                errors["input"] = i18n.__("DailyOperation.kanban.partitions.input.isRequired:%s is must be more than 0", i18n.__("DailyOperation.kanban.partitions.input._:Input")); //"nilai input harus lebih besar dari 0";
                            }

                            if(valid.input && valid.input != '' && valid.goodOutput && valid.goodOutput != ''){
                                if(valid.goodOutput > valid.input){
                                    errors["goodOutput"] = i18n.__("DailyOperation.kanban.partitions.goodOutput.isNotBeMore:%s should not be more than input value", i18n.__("DailyOperation.kanban.partitions.goodOutput._:GoodOutput")); //"nilai good output tidak boleh lebih besar dari nilai input";
                                }
                            }
                    
                            if(valid.input && valid.input != '' && valid.goodOutput && valid.goodOutput != ''){
                                if(valid.badOutput > valid.input){
                                    errors["badOutput"] = i18n.__("DailyOperation.kanban.partitions.badOutput.isNotBeMore:%s should not be more than input value", i18n.__("DailyOperation.kanban.partitions.badOutput._:BadOutput")); //"nilai good output harus tidak boleh besar dari nilai input";
                                }
                                if(valid.goodOutput && valid.goodOutput != ''){
                                    if((valid.goodOutput + valid.badOutput) > valid.input){
                                        errors["badOutput"] = i18n.__("DailyOperation.kanban.partitions.badOutput.isNotBeMore:%s plus Good Output should not be more than input value", i18n.__("DailyOperation.kanban.partitions.badOutput._:BadOutput")); //"nilai good output + bad output tidak boleh lebih besar dari nilai input";
                                        errors["goodOutput"] = i18n.__("DailyOperation.kanban.partitions.goodOutput.isNotBeMore:%s plus bad Output should not be more than input value", i18n.__("DailyOperation.kanban.partitions.goodOutput._:GoodOutput")); //"nilai good output + bad output tidak boleh lebih besar dari nilai input";
                                        errors["input"] = i18n.__("DailyOperation.kanban.partitions.input.isNotBeLess:%s should not be less then good output plus bad output", i18n.__("DailyOperation.kanban.partitions.input._:Input")); //"nilai input harus lebih besar dari good output + bad output";
                                    }
                                }
                            }
                            
                            
                            if (Object.getOwnPropertyNames(errors).length > 0) {
                                var ValidationError = require('module-toolkit').ValidationError;
                                return Promise.reject(new ValidationError('data does not pass validation', errors));
                            }

                            if(_dataDaily.kanban.instruction.name == ""){
                                if(_instruction){
                                    var dataKanban = new Kanban({
                                        instruction : _instruction,
                                        instructionId : new ObjectId(_instruction._id)
                                    });
                                    dataKanban.stamp(this.user.username, "manager");
                                    _dataDaily.kanban = dataKanban;
                                }
                            }
                            var dataPartition = [];
                            if(valid.method === "create"){
                                for(var a of _dataDaily.kanban.partitions){
                                    if(a.no != "")
                                        dataPartition.push(a);
                                }
                                var partition = new Partition({
                                    code : valid.code ? valid.code : codeGenerator(),
                                    no : valid.no,
                                    shift : valid.shift,
                                    stepId : new ObjectId(_step._id),
                                    step : _step,
                                    steps : valid.steps,
                                    machineId : new ObjectId(_machine._id),
                                    machine : _machine,
                                    dateInput : new Date(valid.dateInput),
                                    timeInput : valid.timeInput,
                                    input : valid.input,
                                    dateOutput : !valid.dateOutput || valid.dateOutput == "" ? (new Date(valid.dateInput)) : (new Date(valid.dateOutput)),
                                    timeOutput : valid.timeOutput,
                                    badOutput : valid.badOutput,
                                    goodOutput : valid.goodOutput,
                                    badOutputDescription : valid.badOutputDescription
                                });
                                partition.stamp(this.user.username, "manager");
                                dataPartition.push(partition);
                            }else if(valid.method === "update"){
                                for(var a of _dataDaily.kanban.partitions){
                                    if(a.no === valid.no && a.machineId.toString() === _machine._id.toString() && a.code === valid.code){
                                        a.input = valid.input;
                                        a.dateInput = new Date(valid.dateInput);
                                        a.timeInput = valid.timeInput;
                                        a.badOutput = valid.badOutput;
                                        a.goodOutput = valid.goodOutput;
                                        a.dateOutput = !valid.dateOutput || valid.dateOutput == "" ? (new Date(valid.dateInput)) : (new Date(valid.dateOutput));
                                        a.timeOutput = valid.timeOutput;
                                        a.badOutputDescription = valid.badOutputDescription;
                                        a.steps = valid.steps;
                                        a = new Partition(a);
                                        a.stamp(this.user.username, "manager");
                                    }
                                    dataPartition.push(a);
                                }
                            }else{
                                for(var a of _dataDaily.kanban.partitions){
                                    var isDelete = false;
                                    if(a.no === valid.no && a.machineId.toString() === _machine._id.toString() && a.code === valid.code){
                                        isDelete = true;
                                    }
                                    if(!isDelete)
                                        dataPartition.push(a);
                                }
                            }
                            _dataDaily.kanban.partitions = dataPartition;
                            valid = new DailyOperation(_dataDaily);
                            valid.stamp(this.user.username, "manager");
                            resolve(valid);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
            });
    }

    create(data){
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    data["method"] = "create";
                    this._validate(data)
                        .then(validData => {
                            this.collection
                                .update(validData)
                                .then(id => {
                                    this.productionOrderManager.updateIsUse(validData.productionOrder, true)
                                        .then(productId => {
                                            resolve(id);
                                        })
                                    .catch(e => {
                                        reject(e);
                                    });
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    updatePartition(data){
        return new Promise((resolve, reject) => {
            this._createIndexes()
            .then((createIndexResults) => {
                    data["method"] = "update";
                    this._validate(data)
                        .then(validData => {
                            this.collection
                                .update(validData)
                                .then(id => {
                                    resolve(id);
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        })
                        .catch(e => {
                            reject(e);
                        });
            })
            .catch(e => {
                reject(e);
            });
        });
    }

    deletePartition(data){
        return new Promise((resolve, reject) => {
            this._createIndexes()
            .then((createIndexResults) => {
                data["method"] = "delete";
                this._validate(data)
                    .then(validData => {
                        this.collection
                            .update(validData)
                            .then(id => {
                                this.getSingleById(id)
                                    .then(dataEdit => {
                                        if(dataEdit.kanban.partitions.length == 0){
                                            this.productionOrderManager.updateIsUse(validData.productionOrder, false)
                                                .then(productId => {
                                                    resolve(id);
                                                })
                                            .catch(e => {
                                                reject(e);
                                            });
                                        }else
                                            resolve(id);
                                    })
                                .catch(e => {
                                    reject(e);
                                });
                            })
                            .catch(e => {
                                reject(e);
                            });
                    })
                    .catch(e => {
                        reject(e);
                    });
            })
            .catch(e => {
                reject(e);
            });
        });
    }

    delete(data) {
        return this._createIndexes()
            .then((createIndexResults) => {
                data._deleted = true;
                return this.collection.update(data);
            });
    }

    readPartition(paging){
        return new Promise((resolve, reject) => {
            var _paging = Object.assign({
                page: 1,
                size: 20,
                order: {
                    _updatedDate : -1
                },
                filter: {}
            }, paging);
            this._createIndexes()
                .then((createIndexResults) => {
                    var query = this._getQueryKanban(_paging);
                    this.collection
                        .aggregate([{ $unwind : "$kanban.partitions"},{ $match : query }, { $project : {
                           "_id" : 1, 
                            "_updatedDate" : "$kanban.partitions._updatedDate",
                            "step" : "$kanban.partitions.step",
                            "code" : "$kanban.partitions.code",
                            "machine" : "$kanban.partitions.machine",
                            "date" : "$kanban.partitions.dateInput",
                            "shift" : "$kanban.partitions.shift",
                            "orderNo" : "$productionOrder.orderNo",
                            "kanbanNo" : "$kanban.partitions.no",
                            "input" : "$kanban.partitions.input",
                            "badOutput" : "$kanban.partitions.badOutput",
                            "goodOutput" : "$kanban.partitions.goodOutput"
                        }},{ $sort : _paging.order }])
                        .toArray(function(err, result) {
                            var page = Number(_paging.page);
                            var size = Number(_paging.size);
                            var totalData = result ? result.length : 0;
                            var array = ((totalData / size) >= page) ? size : (totalData % size);
                            var dataResults = [];
                            if(totalData > 0){
                                for(var i = 0; i < array; i++){
                                    var dataSelect = ((page - 1) * size) + i;
                                    var data = {
                                        _id : result[dataSelect]._id,
                                        _updatedDate : result[dataSelect]._updatedDate,
                                        stepId : result[dataSelect].step._id,
                                        step : result[dataSelect].step.process,
                                        machineId : result[dataSelect].machine._id,
                                        machine : result[dataSelect].machine.name,
                                        date : result[dataSelect].date,
                                        shift : result[dataSelect].shift,
                                        orderNo : result[dataSelect].orderNo,
                                        kanbanNo : result[dataSelect].kanbanNo,
                                        input : result[dataSelect].input,
                                        output : (result[dataSelect].badOutput + result[dataSelect].goodOutput),
                                        code : result[dataSelect].code
                                    };
                                    dataResults.push(data);
                                }
                            }
                            _paging.page = page;
                            _paging.size = size;
                            _paging["total"] = totalData;
                            _paging["count"] = totalData;
                            _paging["data"] = dataResults;
                            resolve(_paging);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getDataPartition(_key){
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this.collection
                        .aggregate([{ $unwind : "$kanban.partitions"},{ $match : {
                                "_id" : _key && _key.id ? new ObjectId(_key.id) : '',
                                "kanban.partitions.code" : _key && _key.code ? _key.code : '',
                                "kanban.partitions.no" : _key && _key.no ? _key.no : '',
                                "kanban.partitions.machineId" : _key && _key.machineId ? new ObjectId(_key.machineId) : ''
                        }}])
                        .toArray(function(err, result) {
                            var dataResult;
                            for(var a of result){
                                dataResult = {
                                    _id : a._id,
                                    salesContract : a.salesContract,
                                    productionOrder : a.productionOrder,
        	                        materialId : a.materialId,
        	                        material : a.material,
        	                        construction : a.construction,
        	                        color : a.color,
        	                        colorTypeId : a.colorTypeId,
        	                        colorType : a.colorType,
	                                instructionId : a.kanban.instructionId,
        	                        instruction : a.kanban.instruction,
                                    no : a.kanban.partitions.no,
        	                        shift : a.kanban.partitions.shift,
        	                        stepId : a.kanban.partitions.stepId,
        	                        step : a.kanban.partitions.step,
        	                        steps : a.kanban.partitions.steps,
        	                        machineId : a.kanban.partitions.machineId,
        	                        machine : a.kanban.partitions.machine,
        	                        dateInput : (new Date(a.kanban.partitions.dateInput)),
                                    timeInput : a.kanban.partitions.timeInput,
        	                        input : a.kanban.partitions.input,
        	                        dateOutput : (new Date(a.kanban.partitions.dateOutput)),
                                    timeOutput : a.kanban.partitions.timeOutput,
        	                        goodOutput : a.kanban.partitions.goodOutput,
        	                        badOutput : a.kanban.partitions.badOutput,
        	                        badOutputDescription : a.kanban.partitions.badOutputDescription,
        	                        code : a.kanban.partitions.code
                                };
                            }
                            resolve(dataResult);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getDailyOperationReport(startDate, endDate, machine){
        return new Promise((resolve, reject) => {
            var eDate = endDate ? (new Date(endDate)) : (new Date());
            var sDate = startDate ? (new Date(startDate)) : (new Date(1900, 1, 1));
            var order = {
                "dateOutput" : -1
            };

            this.collection
                .aggregate([{ $unwind : "$kanban.partitions"},{ $match : {
                    "_deleted" : false,
                    "kanban.partitions.machineId" : machine ? (new ObjectId(machine)) : '',
                    "kanban.partitions.dateInput": {
                        $gte : sDate,
                        $lte : eDate
                    }
                }}
                ,{$project : {
                    "orderNo" : "$productionOrder.orderNo",
                    "machine" : "$kanban.partitions.machine.name",
                    "material" : "$material.name",
                    "color" : 1,
                    "finishWidth" : "$productionOrder.finishWidth",
                    "kanbanNo" : "$kanban.partitions.no",
                    "processType" : "$productionOrder.processType.name",
                    "steps" : "$kanban.partitions.steps",
                    "dateInput" : "$kanban.partitions.dateInput",
                    "timeInput" : "$kanban.partitions.timeInput",
                    "input" : "$kanban.partitions.input",
                    "dateOutput" : "$kanban.partitions.dateOutput",
                    "timeOutput" : "$kanban.partitions.timeOutput",
                    "badOutput" : "$kanban.partitions.badOutput",
                    "goodOutput" : "$kanban.partitions.goodOutput",
                    "badOutputDescription" : "$kanban.partitions.badOutputDescription"
                }},{ $sort : order }
                ])
                .toArray(function(err, result) {
                    resolve(result);
                });
        });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.production.finishingPrinting.collection.DailyOperation}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        return this.collection.createIndexes([dateIndex]);
    }
};