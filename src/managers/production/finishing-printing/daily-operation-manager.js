"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var StepManager = require('../../master/step-manager');
var MachineManager = require('../../master/machine-manager');
var KanbanManager = require('./kanban-manager');
var DailyOperation = DLModels.production.finishingPrinting.DailyOperation;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var codeGenerator = require('../../../utils/code-generator');
var moment = require('moment');

module.exports = class DailyOperationManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.production.finishingPrinting.collection.DailyOperation);
        this.stepManager = new StepManager(db, user);
        this.machineManager = new MachineManager(db, user);
        this.kanbanManager = new KanbanManager(db, user);
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
                "kanban.productionOrder.orderNo": {
                    "$regex": regex
                }
            };
            var colorFilter = {
                "kanban.selectedProductionOrderDetail.color": {
                    "$regex": regex
                }
            };
            var colorTypeFilter = {
                "kanban.selectedProductionOrderDetail.colorType.name": {
                    "$regex": regex
                }
            };
            var cartFilter = {
                "kanban.cart.cartNumber": {
                    "$regex": regex
                }
            };
            var stepFilter = {
                "step.process": {
                    "$regex": regex
                }
            };
            var machineFilter = {
                "machine.name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [orderNoFilter, colorFilter, colorTypeFilter, cartFilter, stepFilter, machineFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data._createdDate = new Date();
        return Promise.resolve(data);
    }

    _validate(dailyOperation) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = dailyOperation;
            // var dateTamp = new Date();
            var dateNow = new Date();
            //var dateNowString = moment(dateNow).format('YYYY-MM-DD');
            var timeInMillisNow = (function(){
                var setupMoment = moment();
                setupMoment.set('year', 1970);
                setupMoment.set('month', 0);
                setupMoment.set('date', 1);  
                return Number(setupMoment.format('x'));
            })();

            var getDaily = this.getDataDaily({
                            _deleted : false,
                            kanbanId : valid.kanbanId && ObjectId.isValid(valid.kanbanId) ?  (new ObjectId(valid.kanbanId)) : ''
                        });
            var thisDaily = this.collection.singleOrDefault({"_id" : valid._id && ObjectId.isValid(valid._id) ? new ObjectId(valid._id) : ''});
            var getKanban = valid.kanbanId && ObjectId.isValid(valid.kanbanId) ? this.kanbanManager.getSingleByIdOrDefault(new ObjectId(valid.kanbanId)) : Promise.resolve(null);
            var getMachine = valid.machineId && ObjectId.isValid(valid.machineId) ? this.machineManager.getSingleByIdOrDefault(new ObjectId(valid.machineId)) : Promise.resolve(null);
            var getStep = valid.stepId && ObjectId.isValid(valid.stepId) ? this.stepManager.getSingleByIdOrDefault(new ObjectId(valid.stepId)) : Promise.resolve(null);
            Promise.all([getKanban,getMachine,getStep, getDaily, thisDaily])
                .then(results => {
                    var _kanban = results[0];
                    var _machine = results[1];
                    var _step = results[2];
                    var _dailyData = results[3];
                    var _daily = results[4];
                    var now = new Date();
                    var tempInput;
                    var tempOutput;
                    var runStep = 0;
                    if(_dailyData){
                        if(_dailyData.length > 0){
                            //var data = _dailyData.data;
                            if(valid.type === "input"){
                                if(!valid.code){
                                    for(var a of _dailyData){
                                        var isSingle = true;
                                        if(a.type === "input"){
                                            for(var b of _dailyData){
                                                if(b.type === "output" && a.code === b.code){
                                                    isSingle = false;
                                                    break;
                                                }
                                            }
                                        }else
                                            isSingle = false;
                                        if(isSingle){
                                            tempInput = a;
                                            break;
                                        }
                                    }
                                    if(!tempInput){
                                        for(var a of _dailyData){
                                            if(a.type === "output"){
                                                if(!tempOutput){
                                                    tempOutput = a;
                                                }else{
                                                    var dateTempOutput = new Date(tempOutput.dateOutput);
                                                    var dateA = new Date(a.dateOutput);
                                                    var stringDateA = moment(dateA).format('YYYY-MM-DD');
                                                    var stringTempOutput = moment(dateTempOutput).format('YYYY-MM-DD');
                                                    if(dateA > dateTempOutput)
                                                        tempOutput = a;
                                                    else if(stringDateA === stringTempOutput){
                                                        if(a.timeOutput > tempOutput.timeOutput)
                                                            tempOutput = a;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }else if(_dailyData.length > 1 && _daily){
                                    var idArr = _dailyData.map(function (item) {return item._id.toString()});
                                    var stringId = _daily._id.toString();
                                    var idIdx = idArr.indexOf(stringId);
                                    for(var a = idIdx; a < _dailyData.length ; a++){
                                        if(_dailyData[a].type === "output")
                                            tempOutput = _dailyData[a];
                                    }
                                }
                                if(_step){
                                    for(var a of _dailyData){
                                        if(a.type === "input" && a.stepId.toString() === _step._id.toString())
                                            runStep++;
                                    }
                                }
                            }else if(valid.type === "output"){
                                if(valid.code && _daily){
                                    for(var a of _dailyData){
                                        if(a.type === "input" && a.code === _daily.code)
                                            tempInput = a;
                                    }
                                }else{
                                    for(var a of _dailyData){
                                        var isSingle = true;
                                        for(var b of _dailyData){
                                            if(a._id.toString() !== b._id.toString() && a.code === b.code){
                                                isSingle = false;
                                                break;
                                            }
                                        }
                                        if(isSingle && a.type === "input"){
                                            tempInput = a;
                                            break;
                                        }
                                    }
                                }
                                if(_step){
                                    for(var a of _dailyData){
                                        if(a.type === "output" && a.stepId.toString() === _step._id.toString())
                                            runStep++;
                                    }
                                }
                            }
                        }
                    }
                    var currentStepIndex = 0;
                    var idxStep = 0;
                    var thisStep = '';
                    var nextStep = '';
                    var moreStep = '';
                    if(_kanban){
                        // var stepArr = _kanban.instruction.steps.map(function (item) { return item.process.toString() });
                        // idxStep = (stepArr.indexOf(_step.process) + 1);
                        // currentStepIndex = _kanban.currentStepIndex;
                        var tempStep = 0;
                        currentStepIndex = _kanban.currentStepIndex;
                        if(_step){
                            for(var a of _kanban.instruction.steps){
                                if(a._id.toString() === _step._id.toString())
                                    tempStep++;
                            }
                            if(!valid.code && runStep >= tempStep){
                                moreStep = _step.process;
                            }else{
                                tempStep = 0;
                                var idx = 0;
                                if(!valid.code){
                                    for(var a of _kanban.instruction.steps){
                                        idx++;
                                        if(a._id.toString() === _step._id.toString() && tempStep <= runStep){
                                            tempStep++;
                                            idxStep = idx;
                                        }
                                    }
                                }else{
                                    runStep = 0;
                                    if(valid.type === "input"){
                                        for(var a = _dailyData.length ; a > 0; a--){
                                            if(_dailyData[a - 1].type === "input" && _dailyData[a - 1].stepId.toString() === _step._id.toString()){
                                                runStep++;
                                                if(_dailyData[a - 1].code === valid.code)
                                                    break;
                                            }
                                        }
                                    }
                                    if(valid.type === "output"){
                                        for(var a = _dailyData.length ; a > 0; a--){
                                            if(_dailyData[a - 1].type === "output" && _dailyData[a - 1].stepId.toString() === _step._id.toString()){
                                                runStep++;
                                                if(_dailyData[a - 1].code === valid.code)
                                                    break;
                                            }
                                        }
                                    }
                                    for(var a of _kanban.instruction.steps){
                                        idx++;
                                        if(a._id.toString() === _step._id.toString() && tempStep < runStep){
                                            tempStep++;
                                            idxStep = idx;
                                        }
                                    }
                                }
                                if(idxStep < currentStepIndex)
                                    thisStep = _kanban.instruction.steps[currentStepIndex - 1].process;
                                if(idxStep > (currentStepIndex + 1))
                                    nextStep = _kanban.instruction.steps[(currentStepIndex)].process;
                            }
                        }
                    }
                    
                    if(!valid.kanbanId || valid.kanbanId.toString() === "")
                        errors["kanban"] = i18n.__("Harus diisi", i18n.__("DailyOperation.kanban._:Kanban")); //"kanban tidak ditemukan";
                    else if(!_kanban)
                        errors["kanban"] = i18n.__("Data Kereta tidak ditemukan", i18n.__("DailyOperation.kanban._:Kanban")); //"kanban tidak ditemukan";
                    else if(valid.type === "input" && moreStep !== "")
                        errors["kanban"] = i18n.__("Input tidak dapat disimpan, Kereta sudah melewati step ini", i18n.__("DailyOperation.kanban._:Kanban"));
                    else if(valid.type === "input" && thisStep !== "")
                        errors["kanban"] = i18n.__(`Input tidak dapat diubah / hapus karena Kereta sudah sampai step ${thisStep}`, i18n.__("DailyOperation.kanban._:Kanban"));
                    else if(valid.type === "input" && nextStep !== "")
                        errors["kanban"] = i18n.__(`Input tidak dapat disimpan, Kereta harus melewati step ${nextStep} terlebih dahulu`, i18n.__("DailyOperation.kanban._:Kanban"));
                    else if(valid.type === "output" && moreStep !== "")
                        errors["kanban"] = i18n.__("Output tidak dapat disimpan, Kereta sudah melewati step ini", i18n.__("DailyOperation.kanban._:Kanban"));
                    else if(valid.type === "output" && thisStep !== "")
                        errors["kanban"] = i18n.__(`Output tidak dapat diubah / hapus karena Kereta sudah sampai step ${thisStep}`, i18n.__("DailyOperation.kanban._:Kanban"));
                    else if(valid.type === "output" && nextStep !== "")
                        errors["kanban"] = i18n.__(`Output tidak dapat disimpan, Kereta harus melewati step ${nextStep} terlebih dahulu`, i18n.__("DailyOperation.kanban._:Kanban"));
                    else if(_daily && _dailyData.length > 0){
                        var idArr = _dailyData.map(function (item) {return item._id.toString()});
                        var idIdx = idArr.indexOf(_daily._id.toString());
                        if(idIdx > 0 && valid.delete){
                            if(valid.type === "input")
                                errors["kanban"] = i18n.__(`Input tidak dapat dihapus, karena sudah ada data Output`, i18n.__("DailyOperation.kanban._:Kanban"));
                            else if(valid.type === "output")
                                errors["kanban"] = i18n.__(`Output tidak dapat dihapus, karena sudah ada data Input proses selanjutnya`, i18n.__("DailyOperation.kanban._:Kanban"));
                        }else if(valid.type === "input" && idIdx > 1)
                            errors["kanban"] = i18n.__(`Input tidak dapat diedit, karena sudah ada data Output`, i18n.__("DailyOperation.kanban._:Kanban"));
                        else if(valid.type === "output" && idIdx > 0)
                            errors["kanban"] = i18n.__(`Output tidak dapat diedit, karena sudah ada data Input proses selanjutnya`, i18n.__("DailyOperation.kanban._:Kanban"));
                    }

                    if(!valid.shift || valid.shift === "")
                        errors["shift"] = i18n.__("Harus diisi", i18n.__("DailyOperation.shift._:Shift"));

                    if(!valid.machineId || valid.machineId.toString() === ""){
                        errors["machine"] = i18n.__("Harus diisi", i18n.__("DailyOperation.machine._:Machine")); //"Machine tidak ditemukan";
                    }else if(!_machine){
                        errors["machine"] = i18n.__("Data mesin tidak ditemukan", i18n.__("DailyOperation.machine._:Machine")); //"Machine tidak ditemukan";
                    }else if(valid.type === "input" && tempInput){
                        errors["machine"] = i18n.__("Data input tidak dapat disimpan karena ada data input yang belum dibuat output di mesin ini", i18n.__("DailyOperation.kanban._:Kanban"));
                    }else if(valid.type === "output" && !tempInput){
                        errors["machine"] = i18n.__("Data output tidak dapat disimpan karena tidak ada data input dimesin ini yang sesuai dengan no kereta", i18n.__("DailyOperation.kanban._:Kanban")); //"kanban tidak ditemukan";
                    }else if(valid.type === "output" && tempInput && tempInput.machineId.toString() !== _machine._id.toString())
                        errors["machine"] = i18n.__("Data output tidak dapat disimpan karena tidak ada data input dimesin ini yang sesuai dengan no kereta", i18n.__("DailyOperation.kanban._:Kanban")); //"kanban tidak ditemukan";
                    
                    if(!valid.stepId || valid.stepId.toString() === ""){
                        errors["step"] = i18n.__("Harus diisi", i18n.__("DailyOperation.step._:Step")); //"Step tidak ditemukan";
                    }else if(!_step){
                        errors["step"] = i18n.__("Data step tidak ditemukan", i18n.__("DailyOperation.step._:step")); //"Step tidak ditemukan";
                    }

                    if(valid.type === "input"){
                        var dateInput = new Date(valid.dateInput);
                        if (!valid.dateInput || valid.dateInput === '')
                            errors["dateInput"] = i18n.__("Harus diisi", i18n.__("DailyOperation.dateStart._:Date Input")); //"Tanggal Mulai tidak boleh kosong";
                        else if (dateInput > dateNow)
                            errors["dateInput"] = i18n.__("Tanggal dan jam input tidak boleh lebih besar dari tanggal dan jam sekarang", i18n.__("DailyOperation.dateInput._:Date Input"));//"Tanggal Mulai tidak boleh lebih besar dari tanggal hari ini";
                        else if(tempOutput){
                            var dateTempOutput = new Date(tempOutput.dateOutput);
                            if(dateInput < dateTempOutput){
                                errors["dateInput"] = i18n.__("Tanggal input harus lebih besar dari tanggal output sebelumnya", i18n.__("DailyOperation.dateInput._:Date Input"));
                            }
                        }
                        
                        // if (!valid.timeInput || valid.timeInput === 0)
                        //     errors["timeInput"] = i18n.__("Harus diisi", i18n.__("DailyOperation.timeInput._:Time Input")); //"Time Input tidak boleh kosong";
                        // else if (valid.dateInput === dateNowString && valid.timeInput > timeInMillisNow)
                        //     errors["timeInput"] = i18n.__("Jam input tidak boleh lebih besar dari jam sekarang", i18n.__("DailyOperation.timeInput._:Time Input"));//"Time Mulai tidak boleh lebih besar dari time hari ini";
                        // else if(tempOutput){
                        //     var dateTempOutput = new Date(tempOutput.dateOutput);
                        //     var dateTempOutputString = moment(dateTempOutput).format('YYYY-MM-DD');
                        //     if(dateTempOutputString === valid.dateInput && tempOutput.timeOutput > valid.timeInput)
                        //         errors["timeInput"] = i18n.__("Jam input harus lebih besar dari jam output sebelumnya", i18n.__("DailyOperation.timeInput._:Time Input"));
                        // }

                        if(!valid.input || valid.input === '' || valid.input < 1){
                            errors["input"] = i18n.__("Input harus lebih besar dari 0", i18n.__("DailyOperation.input._:Input")); //"nilai input harus lebih besar dari 0";
                        }
                    }
                    
                    if(valid.type === "output"){
                        if(!valid.dateOutput || valid.dateOutput === '')
                            errors["dateOutput"] = i18n.__("Harus diisi", i18n.__("DailyOperation.dateOutput._:Date Output")); //"tanggal Output harus diisi";
                        else{
                            var dateOutput = new Date(valid.dateOutput);
                            // dateNow = new Date(dateNowString);
                            if (dateOutput > dateNow)
                                errors["dateOutput"] = i18n.__("Tanggal dan jam output tidak boleh lebih besar dari tanggal dan jam sekarang", i18n.__("DailyOperation.dateOutput._:Date Output"));//"Tanggal Selesai tidak boleh lebih besar dari tanggal hari ini";
                            // else if (valid.dateOutput === dateNowString && valid.timeOutput > timeInMillisNow)
                            //     errors["timeOutput"] = i18n.__("Jam output harus lebih besar dari jam sekarang", i18n.__("DailyOperation.timeOutput._:Time Output"));//"Time Selesai tidak boleh lebih besar dari time hari ini";
                            else if(tempInput){
                                var dateInput = new Date(tempInput.dateInput)
                                if (dateInput > dateOutput){
                                    var errorMessage = i18n.__("Tanggal output harus lebih besar dari tanggal input", i18n.__("DailyOperation.dateInput._:Date Input")); //"Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai";
                                    errors["dateOutput"] = errorMessage;
                                }
                            }
                        }
                        
                        // if (!valid.timeOutput || valid.timeOutput === 0)
                        //     errors["timeOutput"] = i18n.__("Harus diisi", i18n.__("DailyOperation.timeOutput._:Time Output")); //"Time Output tidak boleh kosong";
                        // else if (tempInput){
                        //     var dateInput = new Date(tempInput.dateInput);
                        //     var dateOutput = new Date(valid.dateOutput);
                        //     if (valid.dateOutput && valid.dateOutput !== '' && dateInput.toDateString() === dateOutput.toDateString()){
                        //         if (tempInput.timeInput > valid.timeOutput){
                        //             var errorMessage = i18n.__("Jam output harus lebih besar dari jam input", i18n.__("DailyOperation.timeInput._:Time Input")); //"Time Mulai tidak boleh lebih besar dari Time Selesai";
                        //             errors["timeOutput"] = errorMessage;
                        //         }
                        //     }
                        // }

                        var badOutput = valid.badOutput && valid.badOutput !== '' ? valid.badOutput : 0;
                        var goodOutput = valid.goodOutput && valid.goodOutput !== '' ? valid.goodOutput : 0; 

                        if((!valid.goodOutput || valid.goodOutput === '') && (!valid.badOutput || valid.badOutput === '')){
                            errors["goodOutput"] = i18n.__("Harus diisi", i18n.__("DailyOperation.goodOutput._:Good Output")); //"nilai good output tidak boleh kosong";
                            errors["badOutput"] = i18n.__("Harus diisi", i18n.__("DailyOperation.badOutput._:Bad Output")); //"nilai bad output tidak boleh kosong";
                        }
                    }
                    
                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        return Promise.reject(new ValidationError('data does not pass validation', errors));
                    }

                    if(_kanban){
                        valid.kanban = _kanban;
                        valid.kanbanId = _kanban._id;
                    }
                    if(_machine){
                        valid.machine = _machine;
                        valid.machineId = _machine._id;
                    }
                    if(_step){
                        valid.stepId = _step._id;
                        var step = {};
                        for(var a of valid.kanban.instruction.steps){
                            if(a._id.toString() === _step._id.toString())
                                step = a;
                        }
                        valid.step = step;
                        valid.step._id = _step._id;
                    }

                    if(valid.type == "input"){
                        valid.dateInput = new Date(valid.dateInput);
                        valid.code = !valid.code || valid.code === "" ? codeGenerator() : valid.code;
                        valid.timeInput = valid.dateInput.getTime();
                        delete valid.dateOutput;
                        delete valid.timeOutput;
                        delete valid.goodOutput;
                        delete valid.badOutput;
                        delete valid.badOutputDescription;
                    }
                    if(valid.type == "output"){
                        valid.dateOutput = new Date(valid.dateOutput);
                        valid.timeOutput = valid.dateOutput.getTime();
                        delete valid.input;
                        delete valid.dateInput;
                        delete valid.timeInput;
                        valid.code = tempInput.code;
                    }

                    if (!valid.stamp)
                        valid = new DailyOperation(valid);
                    valid.stamp(this.user.username, "manager");
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                });
            });
    }

    _afterInsert(id) {
        return new Promise((resolve, reject) => {
            this.collection.singleOrDefault({"_id" : new ObjectId(id)})
                .then(daily => {
                    this.kanbanManager.getSingleById(daily.kanbanId)
                        .then(kanban => {
                            if(daily.type === "output"){
                                var tempKanban = kanban;
                                tempKanban.currentQty = daily.goodOutput;
                                tempKanban.currentStepIndex+=1;
                                tempKanban.goodOutput=daily.goodOutput;
                                tempKanban.badOutput=daily.badOutput;
                                this.kanbanManager.update(tempKanban)
                                    .then(kanbanId =>{
                                        resolve(id);
                                    })
                                    .catch(e => {
                                        reject(e);
                                    });
                            }else{
                                resolve(id);
                            }
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

    _afterUpdate(id) {
        return new Promise((resolve, reject) => {
            this.collection.singleOrDefault({"_id" : new ObjectId(id)})
                .then(daily => {
                    this.kanbanManager.getSingleById(daily.kanbanId)
                        .then(kanban => {
                            if(daily.type === "output"){
                                var tempKanban = kanban;
                                var steps = tempKanban.instruction.steps.map(function (item) { return item.process });
                                var idx = steps.indexOf(daily.step.process);
                                tempKanban.currentQty = daily.goodOutput;
                                tempKanban.goodOutput=daily.goodOutput;
                                tempKanban.badOutput=daily.badOutput;
                                this.kanbanManager.update(tempKanban)
                                    .then(kanbanId =>{
                                        resolve(id);
                                    })
                                    .catch(e => {
                                        reject(e);
                                    });
                            }else{
                                resolve(id);
                            }
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
        return new Promise((resolve, reject) => {
            data["delete"] = true;
            this._pre(data)
                .then((validData) => {
                    validData._deleted = true;
                    this.collection.update(validData)
                        .then(id => {
                            if(validData.type === "output"){
                                this.kanbanManager.getSingleById(validData.kanbanId)
                                    .then(kanban => {
                                        var steps = kanban.instruction.steps.map(function (item) { return item.process });
                                        this.getDataDaily({
                                            _deleted : false,
                                            kanbanId : (new ObjectId(kanban._id)),
                                            type : 'output'
                                        }).then(dataDaily => {
                                                var dataOutput;
                                                var dailyArr = dataDaily;
                                                if(dailyArr.length > 0){
                                                    for(var a of dailyArr){
                                                        if(!dataOutput)
                                                            dataOutput = a;
                                                        else{
                                                            var dateTempOutput = new Date(dataOutput.dateOutput);
                                                            var dateA = new Date(a.dateOutput);
                                                            var stringDateA = moment(dateA).format('YYYY-MM-DD');
                                                            var stringTempOutput = moment(dateTempOutput).format('YYYY-MM-DD');
                                                            if(dateA > dateTempOutput)
                                                                dataOutput = a;
                                                            else if(stringDateA === stringTempOutput){
                                                                if(a.timeOutput > dataOutput.timeOutput)
                                                                    dataOutput = a;
                                                            }
                                                        }
                                                    }
                                                    kanban.currentQty = dataOutput.goodOutput;
                                                    kanban.currentStepIndex-=1;
                                                    kanban.goodOutput=dataOutput.goodOutput;
                                                    kanban.badOutput=dataOutput.badOutput;
                                                    
                                                }else{
                                                    kanban.currentQty = kanban.cart.qty;
                                                    kanban.currentStepIndex = 0;
                                                    kanban.goodOutput=0;
                                                    kanban.badOutput=0;
                                                }
                                                this.kanbanManager.update(kanban)
                                                    .then(kanbanId =>{
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
        });
    }

    // getDailyOperationReport(query){
    //     var date = {
    //         "$or" : [{
    //             "dateInput" : {
    //                 "$gte" : (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
    //                 "$lte" : (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
    //         }},{
    //             "dateOutput" : {
    //                 "$gte" : (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
    //                 "$lte" : (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
    //             }
    //         }],
    //         "_deleted" : false
    //     };
    //     var kanbanQuery = {};
    //     if(query.kanban)
    //     {
    //         kanbanQuery = {
    //             "kanbanId" : new ObjectId(query.kanban)
    //         };
    //     }
    //     var machineQuery = {};
    //     if(query.machine)
    //     {
    //         machineQuery = {
    //             "machineId" : new ObjectId(query.machine)
    //         };
    //     }
    //     var order = {
    //         "dateInput" : -1
    //     };
    //     var Query = {"$and" : [date, machineQuery, kanbanQuery]};

    //     return this._createIndexes()
    //         .then((createIndexResults) => {
    //             return this.collection
    //                 .where(Query)
    //                 .order(order)
    //                 .execute();
    //         });
    // }

    getDailyOperationReport(query){
        return new Promise((resolve, reject) => {
            // var dateTemp = new Date();
            // var dateString = moment(dateTemp).format('YYYY-MM-DD');
            // var dateNow = new Date(dateString);
            // var dateBefore = dateNow.setDate(dateNow.getDate() - 30);
            var date = {
                "$or" : [{
                    "dateInput" : {
                        "$gte" : (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
                        "$lte" : (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
                }},{
                    "dateOutput" : {
                        "$gte" : (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
                        "$lte" : (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
                    }
                }],
                "_deleted" : false
            };
            var kanbanQuery = {};
            if(query.kanban)
            {
                kanbanQuery = {
                    "kanbanId" : new ObjectId(query.kanban)
                };
            }
            var machineQuery = {};
            if(query.machine)
            {
                machineQuery = {
                    "machineId" : new ObjectId(query.machine)
                };
            }
            var order = {
                "dateInput" : -1
            };
            var QueryInput = {"$and" : [date, machineQuery, kanbanQuery, {"type" : "input"}]};
            var QueryOutput = {"$and" : [date, machineQuery, kanbanQuery, {"type" : "output"}]};
            this.collection
                .find({ $query : QueryInput, $orderby : order })
                .toArray()
                .then(input => {
                    this.collection
                        .find({ $query : QueryOutput, $orderby : order })
                        .toArray()
                        .then(output => {
                            var data = {
                                data: [],
                                count: 0,
                                size: 0,
                                total: 0,
                                page: 0
                            }
                            var dataTemp = [];
                            for(var a of input){
                                var tamp = a;
                                for(var b of output){
                                    if(tamp.code === b.code){
                                        tamp.badOutput = b.badOutput;
                                        tamp.goodOutput = b.goodOutput;
                                        tamp.dateOutput = b.dateOutput;
                                        tamp.timeOutput = b.timeOutput;
                                        tamp.badOutputDescription = b.badOutputDescription;
                                    }
                                }
                                dataTemp.push(tamp);
                            }
                            if(dataTemp.length > 0){
                                data.data = dataTemp;
                                data.count = dataTemp.length;
                                data.total = dataTemp.length;
                            }
                            resolve(data);
                        });
                });
        });
    }


   
    getDataDaily(query){
        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .find(query)
                    .sort({
                        "_createdDate" : -1
                    })
                    .toArray();
            });
    }


getDailyOperationBadReport(query){
        return new Promise((resolve, reject) => {
           
            var datebad = {
                "dateOutput" : {
                    "$gte" : (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
                    "$lte" : (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
                },
                "_deleted" : false
            };
            // var kanbanQuery = {};
            // if(query.kanban)
            // {
            //     kanbanQuery = {
            //         "kanbanId" : new ObjectId(query.kanban)
            //     };
            // }
            // var machineQuery = {};
            // if(query.machine)
            // {
            //     machineQuery = {
            //         "machineId" : new ObjectId(query.machine)
            //     };
            // }
           

            //  var order = {
            //     "kanban.productionOrder.orderNo" : 1
            // };
            // var QueryOutput = {"$and" : [date, machineQuery]};
            
        this.collection.aggregate([ 
                {"$match" : datebad},       
           
                             {
                    "$group" : {
                        //"_id" : {"orderNo" : "$kanban.productionOrder.orderNo"},
                        "_id" : {"machine" : "$machine.name", "orderNo" : "$kanban.productionOrder.orderNo"},
                        "badOutput" : {"$sum" : { $ifNull: [ "$badOutput", 0 ] }},
                        "goodOutput" : {"$sum" : { $ifNull: [ "$goodOutput", 0 ] }},
                        "input" : {"$sum" : { $ifNull: [ "$input", 0 ] }}
                    }
                }
             ])

            .toArray()
            .then(result => {
                resolve(result);
            });
        });
    }
    
    getXls(result, query){
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";

        for(var daily of result.data){
            index++;
            var item = {};
            item["No"] = index;
            item["No Order"] = daily.kanban.productionOrder ? daily.kanban.productionOrder.orderNo : '';
            item["Mesin"] = daily.machine ? daily.machine.name : '';
            item["Material"] = daily.kanban.productionOrder ? daily.kanban.productionOrder.material.name : '';
            item["Warna"] = daily.kanban.selectedProductionOrderDetail ? daily.kanban.selectedProductionOrderDetail.colorType ? `${daily.kanban.selectedProductionOrderDetail.colorType.name} ${daily.kanban.selectedProductionOrderDetail.colorRequest}` : daily.kanban.selectedProductionOrderDetail.colorRequest : '';
            item["Lebar Kain (inch)"] = daily.kanban.productionOrder ? daily.kanban.productionOrder.materialWidth : '';
            item["No Kereta"] = daily.kanban ? daily.kanban.cart.cartNumber : '';
            item["Jenis Proses"] = daily.kanban.productionOrder ? daily.kanban.productionOrder.processType.name : '';
            item["Tgl Input"] = daily.dateInput ? moment(new Date(daily.dateInput)).format(dateFormat) : '';
            item["Jam Input"] = daily.timeInput ? moment(daily.timeInput).format('HH:mm') : '';
            item["input"] = daily.input ? daily.input : 0;
            item["Tgl Output"] = daily.dateOutput ? moment(new Date(daily.dateOutput)).format(dateFormat) : '';
            item["Jam Output"] = daily.timeOutput ? moment(daily.timeOutput).format('HH:mm') : '';
            item["BQ"] = daily.goodOutput ? daily.goodOutput : 0;
            item["BS"] = daily.badOutput ? daily.badOutput : 0;
            item["Keterangan BQ"] = daily.badOutputDescription ? daily.badOutputDescription : '';
            
            xls.data.push(item);
        }

        xls.options["No"] = "number";
        xls.options["No Order"] = "string";
        xls.options["Mesin"] = "string";
        xls.options["Material"] = "string";
        xls.options["Warna"] = "string";
        xls.options["Lebar Kain (inch)"] = "string";
        xls.options["No Kereta"] = "string";
        xls.options["Jenis Proses"] = "string";
        xls.options["Tgl Input"] = "string";
        xls.options["Jam Input"] = "string";
        xls.options["input"] = "number";
        xls.options["Tgl Output"] = "string";
        xls.options["Jam Output"] = "string";
        xls.options["BQ"] = "number";
        xls.options["BS"] = "number";
        xls.options["Keterangan BQ"] = "string";

        if(query.dateFrom && query.dateTo){
            xls.name = `Daily Operation Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if(!query.dateFrom && query.dateTo){
            xls.name = `Daily Operation Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if(query.dateFrom && !query.dateTo){
            xls.name = `Daily Operation Report ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Daily Operation Report.xlsx`;

        return Promise.resolve(xls);
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