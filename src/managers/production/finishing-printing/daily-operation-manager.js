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
                "productionOrder.orderNo": {
                    "$regex": regex
                }
            };
            var colorFilter = {
                "selectedProductionOrderDetail.color": {
                    "$regex": regex
                }
            };
            var colorTypeFilter = {
                "selectedProductionOrderDetail.colorType.name": {
                    "$regex": regex
                }
            };
            var cartFilter = {
                "cart.cartNumber": {
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
        data.code = !data.code || data.code === "" ? codeGenerator() : data.code;
        data._createdDate = new Date();
        return Promise.resolve(data);
    }

    _validate(dailyOperation) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = dailyOperation;
            var dateNow = new Date();
            var dateNowString = moment(dateNow).format('YYYY-MM-DD');
            var timeInMillisNow = (function(){
                var setupMoment = moment();
                setupMoment.set('year', 1970);
                setupMoment.set('month', 0);
                setupMoment.set('date', 1);  
                return Number(setupMoment.format('x'));
            })();
            var dateInput = new Date(valid.dateInput);

            //1. begin: Declare promises.
            var getKanban = valid.kanbanId && ObjectId.isValid(valid.kanbanId) ? this.kanbanManager.getSingleByIdOrDefault(new ObjectId(valid.kanbanId)) : Promise.resolve(null);
            var getMachine = valid.machineId && ObjectId.isValid(valid.machineId) ? this.machineManager.getSingleByIdOrDefault(new ObjectId(valid.machineId)) : Promise.resolve(null);
            var getStep = valid.stepId && ObjectId.isValid(valid.stepId) ? this.stepManager.getSingleByIdOrDefault(new ObjectId(valid.stepId)) : Promise.resolve(null);
            Promise.all([getKanban,getMachine,getStep])
                .then(results => {
                    var _kanban = results[0];
                    var _machine = results[1];
                    var _step = results[2];
                    var now = new Date();
                    
                    if(!valid.kanbanId || valid.kanbanId.toString() === "")
                        errors["kanban"] = i18n.__("DailyOperation.kanban.isRequired:%s is required", i18n.__("DailyOperation.kanban._:Kanban")); //"kanban tidak ditemukan";
                    else if(!_kanban)
                        errors["kanban"] = i18n.__("DailyOperation.kanban.isNotExists:%s is not exists", i18n.__("DailyOperation.kanban._:Kanban")); //"kanban tidak ditemukan";

                    if(!valid.machineId || valid.machineId.toString() === ""){
                        errors["machine"] = i18n.__("DailyOperation.machine.isRequired:%s is required", i18n.__("DailyOperation.machine._:Machine")); //"Machine tidak ditemukan";
                    }else if(!_machine){
                        errors["machine"] = i18n.__("DailyOperation.machine.isNotExists:%s is not exists", i18n.__("DailyOperation.machine._:Machine")); //"Machine tidak ditemukan";
                    }

                    if(!valid.stepId || valid.stepId.toString() === ""){
                        errors["step"] = i18n.__("DailyOperation.step.isRequired:%s is required", i18n.__("DailyOperation.step._:Step")); //"Step tidak ditemukan";
                    }else if(!_step){
                        errors["step"] = i18n.__("DailyOperation.step.isNotExists:%s is not exists", i18n.__("DailyOperation.step._:step")); //"Step tidak ditemukan";
                    }

                    if (!valid.dateInput || valid.dateInput === '')
                        errors["dateInput"] = i18n.__("DailyOperation.dateInput.isRequired:%s is required", i18n.__("DailyOperation.dateStart._:Date Input")); //"Tanggal Mulai tidak boleh kosong";
                    else if (dateInput > dateNow)
                        errors["dateInput"] = i18n.__("DailyOperation.dateInput.isGreater:%s is greater than today", i18n.__("DailyOperation.dateInput._:Date Input"));//"Tanggal Mulai tidak boleh lebih besar dari tanggal hari ini";
                    else if (valid.dateInput === dateNowString && valid.timeInput > timeInMillisNow)
                        errors["timeInput"] = i18n.__("DailyOperation.timeInput.isGreater:%s is greater than today", i18n.__("DailyOperation.timeInput._:Time Input"));//"Time Mulai tidak boleh lebih besar dari time hari ini";

                    if (!valid.timeInput || valid.timeInput === 0)
                        errors["timeInput"] = i18n.__("DailyOperation.timeInput.isRequired:%s is required", i18n.__("DailyOperation.timeInput._:Time Input")); //"Time Input tidak boleh kosong";

                    if(!valid.input || valid.input === ''){
                        errors["input"] = i18n.__("DailyOperation.input.isRequired:%s is must be more than 0", i18n.__("DailyOperation.input._:Input")); //"nilai input harus lebih besar dari 0";
                    }else if(valid.input < 1){
                        errors["input"] = i18n.__("DailyOperation.input.isRequired:%s is must be more than 0", i18n.__("DailyOperation.input._:Input")); //"nilai input harus lebih besar dari 0";
                    }
                    
                    if((valid.dateOutput && valid.dateOutput !== '') || (valid.goodOutput && valid.goodOutput !== '') || (valid.badOutput && valid.badOutput !== '') || (valid.badOutputDescription && valid.badOutputDescription !== '') || valid.isOutput){
                        if(!valid.dateOutput || valid.dateOutput === '')
                            errors["dateOutput"] = i18n.__("DailyOperation.dateOutput.isRequired:%s is required", i18n.__("DailyOperation.dateOutput._:Date Output")); //"tanggal Output harus diisi";
                        else{
                            var dateOutput = new Date(valid.dateOutput);
                            if (dateOutput > dateNow)
                                errors["dateOutput"] = i18n.__("DailyOperation.dateOutput.isGreater:%s is greater than today", i18n.__("DailyOperation.dateOutput._:Date Output"));//"Tanggal Selesai tidak boleh lebih besar dari tanggal hari ini";
                            else if (valid.dateOutput === dateNowString && valid.timeOutput > timeInMillisNow)
                                errors["timeOutput"] = i18n.__("DailyOperation.timeOutput.isGreater:%s is greater than today", i18n.__("DailyOperation.timeOutput._:Time Output"));//"Time Selesai tidak boleh lebih besar dari time hari ini";
                        }

                        if (valid.dateInput && valid.dateInput !== '' && valid.dateOutput && valid.dateOutput !== ''){
                            if (dateInput > dateOutput){
                                var errorMessage = i18n.__("DailyOperation.dateInput.isGreaterThanDateEnd:%s is greater than Date End", i18n.__("DailyOperation.dateInput._:Date Input")); //"Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai";
                                errors["dateInput"] = errorMessage;
                                errors["dateOutput"] = errorMessage;
                            }
                        }
                        
                        if (!valid.timeOutput || valid.timeOutput === 0)
                            errors["timeOutput"] = i18n.__("DailyOperation.timeOutput.isRequired:%s is required", i18n.__("DailyOperation.timeOutput._:Time Output")); //"Time Output tidak boleh kosong";

                        if (valid.dateInput && valid.dateInput !== '' && valid.dateOutput && valid.dateOutput !== '' && valid.dateInput === valid.dateOutput){
                            if (valid.timeInput > valid.timeOutput){
                                var errorMessage = i18n.__("DailyOperation.timeInput.isGreaterThanTimeInMillisEnd:%s is greater than Time End", i18n.__("DailyOperation.timeInput._:Time Input")); //"Time Mulai tidak boleh lebih besar dari Time Selesai";
                                errors["timeInput"] = errorMessage;
                                errors["timeOutput"] = errorMessage;
                            }
                        }

                        var badOutput = valid.badOutput && valid.badOutput !== '' ? valid.badOutput : 0;
                        var goodOutput = valid.goodOutput && valid.goodOutput !== '' ? valid.goodOutput : 0; 

                        if((!valid.goodOutput || valid.goodOutput === '') && (!valid.badOutput || valid.badOutput === '')){
                            errors["goodOutput"] = i18n.__("DailyOperation.goodOutput.isRequired:%s is required", i18n.__("DailyOperation.goodOutput._:Good Output")); //"nilai good output tidak boleh kosong";
                            errors["badOutput"] = i18n.__("DailyOperation.badOutput.isNotBeMore:%s is required", i18n.__("DailyOperation.badOutput._:Bad Output")); //"nilai bad output tidak boleh kosong";
                        }
                        else if(valid.input && valid.input !== ''){
                            if(goodOutput > valid.input){
                                errors["goodOutput"] = i18n.__("DailyOperation.goodOutput.isNotBeMore:%s should not be more than input value", i18n.__("DailyOperation.goodOutput._:Good Output")); //"nilai good output tidak boleh lebih besar dari nilai input";
                            }
                            if(badOutput > valid.input){
                                errors["badOutput"] = i18n.__("DailyOperation.badOutput.isNotBeMore:%s should not be more than input value", i18n.__("DailyOperation.badOutput._:Bad Output")); //"nilai good output harus tidak boleh besar dari nilai input";
                            }
                            if((goodOutput + badOutput) > valid.input){
                                errors["badOutput"] = i18n.__("DailyOperation.badOutput.isNotBeMore:%s plus Good Output should not be more than input value", i18n.__("DailyOperation.badOutput._:Bad Output")); //"nilai good output + bad output tidak boleh lebih besar dari nilai input";
                                errors["goodOutput"] = i18n.__("DailyOperation.goodOutput.isNotBeMore:%s plus bad Output should not be more than input value", i18n.__("DailyOperation.goodOutput._:Good Output")); //"nilai good output + bad output tidak boleh lebih besar dari nilai input";
                                errors["input"] = i18n.__("DailyOperation.input.isNotBeLess:%s should not be less then good output plus bad output", i18n.__("DailyOperation.kanban.partitions.input._:Input")); //"nilai input harus lebih besar dari good output + bad output";
                            }
                        }
                    }else{
                        delete valid.goodOutput;
                        delete valid.timeOutput;
                        delete valid.badOutput;
                        delete valid.badOutputDescription;
                        delete valid.dateOutput;
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

                    if(valid.dateInput)
                        valid.dateInput = dateInput;
                    if(valid.dateOutput)
                        valid.dateOutput = new Date(valid.dateOutput);

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

    getDailyOperationReport(query){
        var date = {
            "dateInput" : {
                "$gte" : (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
                "$lte" : (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
            },
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
        var Query = {"$and" : [date, machineQuery, kanbanQuery]};

        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .where(Query)
                    .order(order)
                    .execute();
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

        if(query.sdate && query.dateTo){
            xls.name = `Daily Operation Report ${moment(new Date(query.sdate)).format(dateFormat)} - ${moment(new Date(query.edate)).format(dateFormat)}.xlsx`;
        }
        else if(!query.sdate && query.edate){
            xls.name = `Daily Operation Report ${moment(new Date(query.edate)).format(dateFormat)}.xlsx`;
        }
        else if(query.sdate && !query.edate){
            xls.name = `Daily Operation Report ${moment(new Date(query.sdate)).format(dateFormat)}.xlsx`;
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