"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var StepManager = require('../../master/step-manager');
var MachineManager = require('../../master/machine-manager');
var BadOutputReasonManager = require('../../master/bad-output-reason-manager');
var KanbanManager = require('./kanban-manager');
var DailyOperation = DLModels.production.finishingPrinting.DailyOperation;
var BadOutputReasonItem = DLModels.production.finishingPrinting.BadOutputReasonItem;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var codeGenerator = require('../../../utils/code-generator');
var moment = require('moment');

module.exports = class DailyOperationManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.production.finishingPrinting.collection.DailyOperation);
        this.kanbanCollection = this.db.use(map.production.finishingPrinting.collection.Kanban);
        this.stepManager = new StepManager(db, user);
        this.machineManager = new MachineManager(db, user);
        this.kanbanManager = new KanbanManager(db, user);
        this.badOutputReasonManager = new BadOutputReasonManager(db, user);
    }

    _getQuery(paging) {
        var _default = {
            _deleted: false
        },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            query = {};

        // if (paging.keyword) {
        //     var regex = new RegExp(paging.keyword, "i");
        //     var orderNoFilter = {
        //         "kanban.productionOrder.orderNo": {
        //             "$regex": regex
        //         }
        //     };
        //     var colorFilter = {
        //         "kanban.selectedProductionOrderDetail.color": {
        //             "$regex": regex
        //         }
        //     };
        //     var colorTypeFilter = {
        //         "kanban.selectedProductionOrderDetail.colorType.name": {
        //             "$regex": regex
        //         }
        //     };
        //     var cartFilter = {
        //         "kanban.cart.cartNumber": {
        //             "$regex": regex
        //         }
        //     };
        //     var stepFilter = {
        //         "step.process": {
        //             "$regex": regex
        //         }
        //     };
        //     var machineFilter = {
        //         "machine.name": {
        //             "$regex": regex
        //         }
        //     };
        //     keywordFilter["$or"] = [orderNoFilter, colorFilter, colorTypeFilter, cartFilter, stepFilter, machineFilter];
        // }
        // query["$and"] = [_default, keywordFilter, pagingFilter];
        query["$and"] = [_default, pagingFilter];
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
            var timeInMillisNow = (function () {
                var setupMoment = moment();
                setupMoment.set('year', 1970);
                setupMoment.set('month', 0);
                setupMoment.set('date', 1);
                return Number(setupMoment.format('x'));
            })();

            var getDaily = this.getDataDaily({
                _deleted: false,
                kanbanId: valid.kanbanId && ObjectId.isValid(valid.kanbanId) ? (new ObjectId(valid.kanbanId)) : ''
            });
            var thisDaily = this.collection.singleOrDefault({ "_id": valid._id && ObjectId.isValid(valid._id) ? new ObjectId(valid._id) : '' });
            var getKanban = valid.kanbanId && ObjectId.isValid(valid.kanbanId) ? this.kanbanManager.getSingleByIdOrDefault(new ObjectId(valid.kanbanId)) : Promise.resolve(null);
            var getMachine = valid.machineId && ObjectId.isValid(valid.machineId) ? this.machineManager.getSingleByIdOrDefault(new ObjectId(valid.machineId)) : Promise.resolve(null);
            var getStep = valid.stepId && ObjectId.isValid(valid.stepId) ? this.stepManager.getSingleByIdOrDefault(new ObjectId(valid.stepId)) : Promise.resolve(null);
            var getBadOutput = [];
            var dataReasons = valid.badOutputReasons || [];
            var getMachineReason = [];
            for (var a of dataReasons) {
                if (a.badOutputReasonId && ObjectId.isValid(a.badOutputReasonId))
                    getBadOutput.push(this.badOutputReasonManager.getSingleByIdOrDefault(new ObjectId(a.badOutputReasonId)))
                if (a.machineId && ObjectId.isValid(a.machineId))
                    getMachineReason.push(this.machineManager.getSingleByIdOrDefault(new ObjectId(a.machineId)))
            }
            Promise.all([getKanban, getMachine, getStep, getDaily, thisDaily].concat(getBadOutput, getMachineReason))
                .then(results => {
                    var _kanban = results[0];
                    var _machine = results[1];
                    var _step = results[2];
                    var _dailyData = results[3];
                    var _daily = results[4];
                    var _badOutput = results.slice(5, 5 + getBadOutput.length) || [];
                    var _machineReasons = results.slice(5 + getBadOutput.length, results.length) || [];
                    var now = new Date();
                    var tempInput;
                    var tempOutput;
                    var runStep = 0;
                    if (_dailyData) {
                        if (_dailyData.length > 0) {
                            //var data = _dailyData.data;
                            if (valid.type === "input") {
                                if (!valid.code) {
                                    for (var a of _dailyData) {
                                        var isSingle = true;
                                        if (a.type === "input") {
                                            for (var b of _dailyData) {
                                                if (b.type === "output" && a.code === b.code) {
                                                    isSingle = false;
                                                    break;
                                                }
                                            }
                                        } else
                                            isSingle = false;
                                        if (isSingle) {
                                            tempInput = a;
                                            break;
                                        }
                                    }
                                    if (!tempInput) {
                                        for (var a of _dailyData) {
                                            if (a.type === "output") {
                                                if (!tempOutput) {
                                                    tempOutput = a;
                                                } else {
                                                    var dateTempOutput = new Date(tempOutput.dateOutput);
                                                    var dateA = new Date(a.dateOutput);
                                                    var stringDateA = moment(dateA).format('YYYY-MM-DD');
                                                    var stringTempOutput = moment(dateTempOutput).format('YYYY-MM-DD');
                                                    if (dateA > dateTempOutput)
                                                        tempOutput = a;
                                                    else if (stringDateA === stringTempOutput) {
                                                        if (a.timeOutput > tempOutput.timeOutput)
                                                            tempOutput = a;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } else if (_dailyData.length > 1 && _daily) {
                                    var idArr = _dailyData.map(function (item) { return item._id.toString() });
                                    var stringId = _daily._id.toString();
                                    var idIdx = idArr.indexOf(stringId);
                                    for (var a = idIdx; a < _dailyData.length; a++) {
                                        if (_dailyData[a].type === "output")
                                            tempOutput = _dailyData[a];
                                    }
                                }
                                if (_step) {
                                    for (var a of _dailyData) {
                                        if (a.type === "input" && a.stepId.toString() === _step._id.toString())
                                            runStep++;
                                    }
                                }
                            } else if (valid.type === "output") {
                                if (valid.code && _daily) {
                                    for (var a of _dailyData) {
                                        if (a.type === "input" && a.code === _daily.code)
                                            tempInput = a;
                                    }
                                } else {
                                    for (var a of _dailyData) {
                                        var isSingle = true;
                                        for (var b of _dailyData) {
                                            if (a._id.toString() !== b._id.toString() && a.code === b.code) {
                                                isSingle = false;
                                                break;
                                            }
                                        }
                                        if (isSingle && a.type === "input") {
                                            tempInput = a;
                                            break;
                                        }
                                    }
                                }
                                if (_step) {
                                    for (var a of _dailyData) {
                                        if (a.type === "output" && a.stepId.toString() === _step._id.toString())
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
                    if (_kanban) {
                        // var stepArr = _kanban.instruction.steps.map(function (item) { return item.process.toString() });
                        // idxStep = (stepArr.indexOf(_step.process) + 1);
                        // currentStepIndex = _kanban.currentStepIndex;
                        var tempStep = 0;
                        currentStepIndex = _kanban.currentStepIndex;
                        if (_step) {
                            for (var a of _kanban.instruction.steps) {
                                if (a._id.toString() === _step._id.toString())
                                    tempStep++;
                            }
                            if (!valid.code && runStep >= tempStep) {
                                moreStep = _step.process;
                            } else {
                                tempStep = 0;
                                var idx = 0;
                                if (!valid.code) {
                                    for (var a of _kanban.instruction.steps) {
                                        idx++;
                                        if (a._id.toString() === _step._id.toString() && tempStep <= runStep) {
                                            tempStep++;
                                            idxStep = idx;
                                        }
                                    }
                                } else {
                                    runStep = 0;
                                    if (valid.type === "input") {
                                        for (var a = _dailyData.length; a > 0; a--) {
                                            if (_dailyData[a - 1].type === "input" && _dailyData[a - 1].stepId.toString() === _step._id.toString()) {
                                                runStep++;
                                                if (_dailyData[a - 1].code === valid.code)
                                                    break;
                                            }
                                        }
                                    }
                                    if (valid.type === "output") {
                                        for (var a = _dailyData.length; a > 0; a--) {
                                            if (_dailyData[a - 1].type === "output" && _dailyData[a - 1].stepId.toString() === _step._id.toString()) {
                                                runStep++;
                                                if (_dailyData[a - 1].code === valid.code)
                                                    break;
                                            }
                                        }
                                    }
                                    for (var a of _kanban.instruction.steps) {
                                        idx++;
                                        if (a._id.toString() === _step._id.toString() && tempStep < runStep) {
                                            tempStep++;
                                            idxStep = idx;
                                        }
                                    }
                                }
                                if (idxStep < currentStepIndex)
                                    thisStep = _kanban.instruction.steps[currentStepIndex - 1].process;
                                if (idxStep > (currentStepIndex + 1))
                                    nextStep = _kanban.instruction.steps[(currentStepIndex)].process;
                            }
                        }
                    }

                    if (!valid.kanbanId || valid.kanbanId.toString() === "")
                        errors["kanban"] = i18n.__("Harus diisi", i18n.__("DailyOperation.kanban._:Kanban")); //"kanban tidak ditemukan";
                    else if (!_kanban)
                        errors["kanban"] = i18n.__("Data Kereta tidak ditemukan", i18n.__("DailyOperation.kanban._:Kanban")); //"kanban tidak ditemukan";
                    else if (valid.type === "input" && moreStep !== "")
                        errors["kanban"] = i18n.__("Input tidak dapat disimpan, Kereta sudah melewati step ini", i18n.__("DailyOperation.kanban._:Kanban"));
                    else if (valid.type === "input" && thisStep !== "")
                        errors["kanban"] = i18n.__(`Input tidak dapat diubah / hapus karena Kereta sudah sampai step ${thisStep}`, i18n.__("DailyOperation.kanban._:Kanban"));
                    else if (valid.type === "input" && nextStep !== "")
                        errors["kanban"] = i18n.__(`Input tidak dapat disimpan, Kereta harus melewati step ${nextStep} terlebih dahulu`, i18n.__("DailyOperation.kanban._:Kanban"));
                    else if (valid.type === "output" && moreStep !== "")
                        errors["kanban"] = i18n.__("Output tidak dapat disimpan, Kereta sudah melewati step ini", i18n.__("DailyOperation.kanban._:Kanban"));
                    else if (valid.type === "output" && thisStep !== "")
                        errors["kanban"] = i18n.__(`Output tidak dapat diubah / hapus karena Kereta sudah sampai step ${thisStep}`, i18n.__("DailyOperation.kanban._:Kanban"));
                    else if (valid.type === "output" && nextStep !== "")
                        errors["kanban"] = i18n.__(`Output tidak dapat disimpan, Kereta harus melewati step ${nextStep} terlebih dahulu`, i18n.__("DailyOperation.kanban._:Kanban"));
                    else if (_daily && _dailyData.length > 0) {
                        var idArr = _dailyData.map(function (item) { return item._id.toString() });
                        var idIdx = idArr.indexOf(_daily._id.toString());
                        if (idIdx > 0 && valid.delete) {
                            if (valid.type === "input")
                                errors["kanban"] = i18n.__(`Input tidak dapat dihapus, karena sudah ada data Output`, i18n.__("DailyOperation.kanban._:Kanban"));
                            else if (valid.type === "output")
                                errors["kanban"] = i18n.__(`Output tidak dapat dihapus, karena sudah ada data Input proses selanjutnya`, i18n.__("DailyOperation.kanban._:Kanban"));
                        } else if (valid.type === "input" && idIdx > 1)
                            errors["kanban"] = i18n.__(`Input tidak dapat diedit, karena sudah ada data Output`, i18n.__("DailyOperation.kanban._:Kanban"));
                        else if (valid.type === "output" && idIdx > 0)
                            errors["kanban"] = i18n.__(`Output tidak dapat diedit, karena sudah ada data Input proses selanjutnya`, i18n.__("DailyOperation.kanban._:Kanban"));
                    }

                    if (!valid.shift || valid.shift === "")
                        errors["shift"] = i18n.__("Harus diisi", i18n.__("DailyOperation.shift._:Shift"));

                    if (!valid.machineId || valid.machineId.toString() === "") {
                        errors["machine"] = i18n.__("Harus diisi", i18n.__("DailyOperation.machine._:Machine")); //"Machine tidak ditemukan";
                    } else if (!_machine) {
                        errors["machine"] = i18n.__("Data mesin tidak ditemukan", i18n.__("DailyOperation.machine._:Machine")); //"Machine tidak ditemukan";
                    } else if (valid.type === "input" && tempInput) {
                        errors["machine"] = i18n.__("Data input tidak dapat disimpan karena ada data input yang belum dibuat output di mesin ini", i18n.__("DailyOperation.kanban._:Kanban"));
                    } else if (valid.type === "output" && !tempInput) {
                        errors["machine"] = i18n.__("Data output tidak dapat disimpan karena tidak ada data input dimesin ini yang sesuai dengan no kereta", i18n.__("DailyOperation.kanban._:Kanban")); //"kanban tidak ditemukan";
                    } else if (valid.type === "output" && tempInput && tempInput.machineId.toString() !== _machine._id.toString())
                        errors["machine"] = i18n.__("Data output tidak dapat disimpan karena tidak ada data input dimesin ini yang sesuai dengan no kereta", i18n.__("DailyOperation.kanban._:Kanban")); //"kanban tidak ditemukan";

                    if (!valid.stepId || valid.stepId.toString() === "") {
                        errors["step"] = i18n.__("Harus diisi", i18n.__("DailyOperation.step._:Step")); //"Step tidak ditemukan";
                    } else if (!_step) {
                        errors["step"] = i18n.__("Data step tidak ditemukan", i18n.__("DailyOperation.step._:step")); //"Step tidak ditemukan";
                    }

                    if (valid.type === "input") {
                        var dateInput = new Date(valid.dateInput);
                        if (!valid.dateInput || valid.dateInput === '')
                            errors["dateInput"] = i18n.__("Harus diisi", i18n.__("DailyOperation.dateStart._:Date Input")); //"Tanggal Mulai tidak boleh kosong";
                        else if (dateInput > dateNow)
                            errors["dateInput"] = i18n.__("Tanggal dan jam input tidak boleh lebih besar dari tanggal dan jam sekarang", i18n.__("DailyOperation.dateInput._:Date Input"));//"Tanggal Mulai tidak boleh lebih besar dari tanggal hari ini";
                        else if (tempOutput) {
                            var dateTempOutput = new Date(tempOutput.dateOutput);
                            if (dateInput < dateTempOutput) {
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

                        if (!valid.input || valid.input === '' || valid.input < 1) {
                            errors["input"] = i18n.__("Input harus lebih besar dari 0", i18n.__("DailyOperation.input._:Input")); //"nilai input harus lebih besar dari 0";
                        }
                    }

                    if (valid.type === "output") {
                        if (!valid.dateOutput || valid.dateOutput === '')
                            errors["dateOutput"] = i18n.__("Harus diisi", i18n.__("DailyOperation.dateOutput._:Date Output")); //"tanggal Output harus diisi";
                        else {
                            var dateOutput = new Date(valid.dateOutput);
                            // dateNow = new Date(dateNowString);
                            if (dateOutput > dateNow)
                                errors["dateOutput"] = i18n.__("Tanggal dan jam output tidak boleh lebih besar dari tanggal dan jam sekarang", i18n.__("DailyOperation.dateOutput._:Date Output"));//"Tanggal Selesai tidak boleh lebih besar dari tanggal hari ini";
                            // else if (valid.dateOutput === dateNowString && valid.timeOutput > timeInMillisNow)
                            //     errors["timeOutput"] = i18n.__("Jam output harus lebih besar dari jam sekarang", i18n.__("DailyOperation.timeOutput._:Time Output"));//"Time Selesai tidak boleh lebih besar dari time hari ini";
                            else if (tempInput) {
                                var dateInput = new Date(tempInput.dateInput)
                                if (dateInput > dateOutput) {
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

                        var badOutput = valid.badOutput && valid.badOutput !== '' ? parseInt(valid.badOutput) : 0;
                        //var goodOutput = valid.goodOutput && valid.goodOutput !== '' ? valid.goodOutput : 0; 

                        if ((!valid.goodOutput || valid.goodOutput === '') && (!valid.badOutput || valid.badOutput === '')) {
                            errors["goodOutput"] = i18n.__("Harus diisi", i18n.__("DailyOperation.goodOutput._:Good Output")); //"nilai good output tidak boleh kosong";
                            errors["badOutput"] = i18n.__("Harus diisi", i18n.__("DailyOperation.badOutput._:Bad Output")); //"nilai bad output tidak boleh kosong";
                        } else if (badOutput > 0) {
                            if (!valid.badOutputReasons || valid.badOutputReasons.length < 1)
                                errors["badOutputReasons"] = i18n.__("Harus diisi minimal 1 Keterangan", i18n.__("DailyOperation.badOutputReasons._:BadOutputReasons")); //"keterangan bad output tidak boleh kosong";
                            else {
                                var itemErrors = [];
                                var lengthTotal = 0;
                                var valueArr = valid.badOutputReasons.map(function (item) { return item.badOutputReasonId ? item.badOutputReasonId.toString() : "" });

                                // var itemDuplicateErrors = new Array(valueArr.length);
                                // valueArr.some(function (item, idx) {
                                //     var itemError = {};
                                //     if (valueArr.indexOf(item) != idx) {
                                //         itemError["badOutputReason"] = i18n.__("Ada data duplikasi", i18n.__("DailyOperation.badOutputReasons.badOutputReason._:BadOutputReason")); //"Nama barang tidak boleh kosong";
                                //     }
                                //     if (Object.getOwnPropertyNames(itemError).length > 0) {
                                //         itemDuplicateErrors[valueArr.indexOf(item)] = itemError;
                                //         itemDuplicateErrors[idx] = itemError;
                                //     } else {
                                //         itemDuplicateErrors[idx] = itemError;
                                //     }
                                // });
                                for (var a of valid.badOutputReasons) {
                                    var itemError = {};
                                    var _index = valid.badOutputReasons.indexOf(a);
                                    var length = !a.length || a.length === "" ? 0 : parseInt(a.length);
                                    lengthTotal += length;
                                    if (length < 1)
                                        itemError["length"] = i18n.__("Harus lebih dari 0", i18n.__("DailyOperation.badOutputReasons.length._:Panjang")); //"keterangan bad output tidak boleh kosong";
                                    if (!a.action || a.action === "")
                                        itemError["action"] = i18n.__("Harus diisi", i18n.__("DailyOperation.badOutputReasons.action._:Action")); //"keterangan bad output tidak boleh kosong";
                                    // if (!a.description || a.description === "")
                                    //     itemError["description"] = i18n.__("Harus diisi", i18n.__("DailyOperation.badOutputReasons.description._:Description")); //"keterangan bad output tidak boleh kosong";
                                    function searchItem(params) {
                                        return !params ? null : params.code === a.badOutputReason.code;
                                    }
                                    var dataBadOutput = _badOutput.find(searchItem);
                                    if (!a.badOutputReasonId || a.badOutputReasonId === "")
                                        itemError["badOutputReason"] = i18n.__("Harus diisi", i18n.__("DailyOperation.badOutputReasons.badOutputReason._:BadOutputReason")); //"keterangan bad output tidak boleh kosong";
                                    else if (!dataBadOutput)
                                        itemError["badOutputReason"] = i18n.__("Data Keterangan Bad Output tidak ditemukan", i18n.__("DailyOperation.badOutputReasons.badOutputReason._:BadOutputReason")); //"keterangan bad output tidak boleh kosong";
                                    // else if (Object.getOwnPropertyNames(itemDuplicateErrors[_index]).length > 0) {
                                    //     itemError["badOutputReason"] = itemDuplicateErrors[_index].badOutputReason;
                                    // }
                                    function searchMachine(params) {
                                        return !params ? null : params.code === a.machine.code;
                                    }
                                    var dataBadOutputMachine = _machineReasons.find(searchMachine);
                                    if (!a.machineId || a.machineId === "")
                                        itemError["machine"] = i18n.__("Harus diisi", i18n.__("DailyOperation.badOutputReasons.machine._:Machine")); //"mesin penyebab bad output tidak boleh kosong";
                                    else if (!dataBadOutputMachine)
                                        itemError["machine"] = i18n.__("Data Mesin Penyebab Bad Output tidak ditemukan", i18n.__("DailyOperation.badOutputReasons.machine._:Machine")); //"mesin penyebab bad output tidak boleh kosong";
                                    itemErrors.push(itemError);
                                }
                                if (lengthTotal !== badOutput)
                                    errors["badOutputReasons"] = i18n.__("Total Panjang harus sama dengan Total BadOutput", i18n.__("DailyOperation.badOutputReasons._:BadOutputReasons")); //"keterangan bad output tidak boleh kosong";
                                else {
                                    for (var itemError of itemErrors) {
                                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                                            errors["badOutputReasons"] = itemErrors;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        return Promise.reject(new ValidationError('data does not pass validation', errors));
                    }

                    if (_kanban) {
                        valid.kanban = _kanban;
                        valid.kanbanId = _kanban._id;
                    }
                    if (_machine) {
                        valid.machine = _machine;
                        valid.machineId = _machine._id;
                    }
                    if (_step) {
                        valid.stepId = _step._id;
                        var step = {};
                        for (var a of valid.kanban.instruction.steps) {
                            if (a._id.toString() === _step._id.toString())
                                step = a;
                        }
                        valid.step = step;
                        valid.step._id = _step._id;
                    }

                    if (valid.type == "input") {
                        valid.dateInput = new Date(valid.dateInput);
                        valid.code = !valid.code || valid.code === "" ? codeGenerator() : valid.code;
                        valid.timeInput = valid.dateInput.getTime();
                        delete valid.dateOutput;
                        delete valid.timeOutput;
                        delete valid.goodOutput;
                        delete valid.badOutput;
                        delete valid.badOutputReasons;
                    }
                    if (valid.type == "output") {
                        valid.dateOutput = new Date(valid.dateOutput);
                        valid.timeOutput = valid.dateOutput.getTime();
                        valid.code = tempInput.code;
                        delete valid.input;
                        delete valid.dateInput;
                        delete valid.timeInput;
                        if (valid.badOutput > 0) {
                            var items = [];
                            for (var a of valid.badOutputReasons) {
                                function searchItem(params) {
                                    return !params ? null : params.code === a.badOutputReason.code;
                                }
                                var dataBadOutput = _badOutput.find(searchItem);

                                function searchMachine(params) {
                                    return !params ? null : params.code === a.machine.code;
                                }
                                var dataBadOutputMachine = _machineReasons.find(searchMachine);
                                var data = new BadOutputReasonItem({
                                    length: a.length,
                                    action: a.action,
                                    description: a.description,
                                    badOutputReasonId: new ObjectId(dataBadOutput._id),
                                    badOutputReason: dataBadOutput,
                                    machineId: new ObjectId(a.machineId),
                                    machine: dataBadOutputMachine
                                })
                                data._createdDate = dateNow;
                                data.stamp(this.user.username, "manager")
                                items.push(data);
                            }
                            valid.badOutputReasons = items;
                        } else {
                            delete valid.badOutputReasons;
                        }
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
            this.collection.singleOrDefault({ "_id": new ObjectId(id) })
                .then(daily => {
                    this.kanbanManager.getSingleById(daily.kanbanId)
                        .then(kanban => {
                            if (daily.type === "output") {
                                var tempKanban = kanban;

                                var now = new Date();
                                var ticks = ((now.getTime() * 10000) + 621355968000000000);

                                tempKanban._stamp = ticks.toString(16);
                                tempKanban._updatedBy = this.user.username;
                                tempKanban._updatedDate = now;
                                tempKanban._updateAgent = 'manager';

                                tempKanban.currentQty = daily.goodOutput;
                                tempKanban.currentStepIndex += 1;
                                tempKanban.goodOutput = daily.goodOutput;
                                tempKanban.badOutput = daily.badOutput;
                                this.kanbanCollection.update(tempKanban)
                                    .then(kanbanId => {
                                        resolve(id);
                                    })
                                    .catch(e => {
                                        reject(e);
                                    });
                            } else {
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
            this.collection.singleOrDefault({ "_id": new ObjectId(id) })
                .then(daily => {
                    this.kanbanManager.getSingleById(daily.kanbanId)
                        .then(kanban => {
                            if (daily.type === "output") {
                                var tempKanban = kanban;
                                var steps = tempKanban.instruction.steps.map(function (item) { return item.process });
                                var idx = steps.indexOf(daily.step.process);

                                var now = new Date();
                                var ticks = ((now.getTime() * 10000) + 621355968000000000);

                                tempKanban._stamp = ticks.toString(16);
                                tempKanban._updatedBy = this.user.username;
                                tempKanban._updatedDate = now;
                                tempKanban._updateAgent = 'manager';

                                tempKanban.currentQty = daily.goodOutput;
                                tempKanban.goodOutput = daily.goodOutput;
                                tempKanban.badOutput = daily.badOutput;
                                this.kanbanCollection.update(tempKanban)
                                    .then(kanbanId => {
                                        resolve(id);
                                    })
                                    .catch(e => {
                                        reject(e);
                                    });
                            } else {
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
                            if (validData.type === "output") {
                                this.kanbanManager.getSingleById(validData.kanbanId)
                                    .then(kanban => {
                                        var steps = kanban.instruction.steps.map(function (item) { return item.process });
                                        this.getDataDaily({
                                            _deleted: false,
                                            kanbanId: (new ObjectId(kanban._id)),
                                            type: 'output'
                                        }).then(dataDaily => {
                                            var dataOutput;
                                            var dailyArr = dataDaily;
                                            if (dailyArr.length > 0) {
                                                for (var a of dailyArr) {
                                                    if (!dataOutput)
                                                        dataOutput = a;
                                                    else {
                                                        var dateTempOutput = new Date(dataOutput.dateOutput);
                                                        var dateA = new Date(a.dateOutput);
                                                        var stringDateA = moment(dateA).format('YYYY-MM-DD');
                                                        var stringTempOutput = moment(dateTempOutput).format('YYYY-MM-DD');
                                                        if (dateA > dateTempOutput)
                                                            dataOutput = a;
                                                        else if (stringDateA === stringTempOutput) {
                                                            if (a.timeOutput > dataOutput.timeOutput)
                                                                dataOutput = a;
                                                        }
                                                    }
                                                }
                                                kanban.currentQty = dataOutput.goodOutput;
                                                kanban.currentStepIndex -= 1;
                                                kanban.goodOutput = dataOutput.goodOutput;
                                                kanban.badOutput = dataOutput.badOutput;

                                            } else {
                                                kanban.currentQty = kanban.cart.qty;
                                                kanban.currentStepIndex = 0;
                                                kanban.goodOutput = 0;
                                                kanban.badOutput = 0;
                                            }

                                            var now = new Date();
                                            var ticks = ((now.getTime() * 10000) + 621355968000000000);

                                            kanban._stamp = ticks.toString(16);
                                            kanban._updatedBy = this.user.username;
                                            kanban._updatedDate = now;
                                            kanban._updateAgent = 'manager';

                                            this.kanbanCollection.update(kanban)
                                                .then(kanbanId => {
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
                            } else
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

    // getDailyOperationReport(query) {
    //     return new Promise((resolve, reject) => {
    //         var date = new Date();
    //         var dateString = moment(date).format('YYYY-MM-DD');
    //         var dateNow = new Date(dateString);
    //         var dateBefore = dateNow.setDate(dateNow.getDate() - 30);
    //         var date = {
    //             "dateInput": {
    //                 "$gte": (!query || !query.dateFrom ? (new Date(dateBefore)) : (new Date(query.dateFrom))),
    //                 "$lte": (!query || !query.dateTo ? date : (new Date(query.dateTo + "T23:59")))
    //             },
    //             "_deleted": false
    //         };
    //         var kanbanQuery = {};
    //         if (query.kanban) {
    //             kanbanQuery = {
    //                 "kanbanId": new ObjectId(query.kanban)
    //             };
    //         }
    //         var machineQuery = {};
    //         if (query.machine) {
    //             machineQuery = {
    //                 "machineId": new ObjectId(query.machine)
    //             };
    //         }
    //         var order = {
    //             "dateInput": -1
    //         };
    //         var QueryInput = { "$and": [date, machineQuery, kanbanQuery, { "type": "input" }] };

    //         var selectedFields = {
    //             "code": 1,
    //             "kanban.productionOrder.orderNo": 1,
    //             "kanban.cart.cartNumber": 1,
    //             "kanban.isReprocess": 1,
    //             "machine.name": 1,
    //             "step.process": 1,
    //             "kanban.productionOrder.material.name": 1,
    //             "kanban.selectedProductionOrderDetail.colorRequest": 1,
    //             "kanban.productionOrder.finishWidth": 1,
    //             "kanban.productionOrder.processType.name": 1,
    //             "dateInput": 1,
    //             "timeInput": 1,
    //             "input": 1,
    //             "dateOutput": 1,
    //             "timeOutput": 1,
    //             "goodOutput": 1,
    //             "badOutput": 1,
    //             "badOutputDescription": 1,
    //             "action": 1,
    //             "badOutputReasons.badOutputReason.reason": 1,
    //             "badOutputReasons.precentage": 1,
    //             "badOutputReasons.length": 1,
    //             "badOutputReasons.action": 1
    //         }

    //         this.collection
    //             .find({ $query: QueryInput, $orderby: order }, selectedFields)
    //             .toArray()
    //             .then(input => {
    //                 var itemCode = input.map(function (item) { return item.code });
    //                 var QueryOutput = { "$and": [{ "code": { "$in": itemCode } }, { "type": "output" }, { "_deleted": false }] };
    //                 this.collection
    //                     .find({ $query: QueryOutput, $orderby: order }, selectedFields)
    //                     .toArray()
    //                     .then(output => {
    //                         var data = {
    //                             data: [],
    //                             count: 0,
    //                             size: 0,
    //                             total: 0,
    //                             page: 0
    //                         }
    //                         var dataTemp = [];
    //                         for (var a of input) {
    //                             var tamp = a;
    //                             function searchItem(params) {
    //                                 return !params ? null : params.code === a.code;
    //                             }
    //                             var dataOutput = output.find(searchItem);
    //                             if (dataOutput) {
    //                                 tamp.badOutput = dataOutput.badOutput;
    //                                 tamp.goodOutput = dataOutput.goodOutput;
    //                                 tamp.dateOutput = dataOutput.dateOutput;
    //                                 tamp.timeOutput = dataOutput.timeOutput;
    //                                 tamp.action = dataOutput.action ? dataOutput.action : "";

    //                                 // if (tamp.hasOwnProperty("action"))
    //                                 //     tamp.action = dataOutput.action ? dataOutput.action : "";
    //                                 // else
    //                                 //     tamp["action"] = dataOutput.action ? dataOutput.action : "";

    //                                 tamp.badOutputDescription = dataOutput.badOutputDescription ? dataOutput.badOutputDescription : "";
    //                                 if (dataOutput.badOutputReasons && dataOutput.badOutputReasons.length > 0) {
    //                                     var index = 0;
    //                                     var description = "";
    //                                     for (var reason of dataOutput.badOutputReasons) {
    //                                         index++;
    //                                         if (index === dataOutput.badOutputReasons.length) {
    //                                             description += `${index}. ${reason.badOutputReason.reason ? reason.badOutputReason.reason : ""} ${reason.length ? reason.length + "(m)" : reason.precentage ? reason.precentage + "(%)" : 0} ${tamp.action ? tamp.action : reason.action ? reason.action : ""}`;
    //                                         } else {
    //                                             description += `${index}. ${reason.badOutputReason.reason ? reason.badOutputReason.reason : ""} ${reason.length ? reason.length + "(m)" : reason.precentage ? reason.precentage + "(%)" : 0} ${tamp.action ? tamp.action : reason.action ? reason.action : ""}\n`;
    //                                         }
    //                                     }
    //                                     tamp.badOutputDescription = description;
    //                                 }

    //                                 // if (tamp.hasOwnProperty("badOutputDescription") && dataOutput.hasOwnProperty("badOutputDescription"))
    //                                 //     tamp.badOutputDescription = dataOutput.badOutputDescription;
    //                                 // else if (!tamp.hasOwnProperty("badOutputDescription") && dataOutput.hasOwnProperty("badOutputDescription"))
    //                                 //     tamp["badOutputDescription"] = dataOutput.badOutputDescription;
    //                                 // else if (tamp.hasOwnProperty("badOutputDescription") && !dataOutput.hasOwnProperty("badOutputDescription")) {
    //                                 //     var description = ""
    //                                 //     if (dataOutput.badOutputReasons && dataOutput.badOutputReasons.length > 0) {
    //                                 //         var index = 0;
    //                                 //         for (var a of dataOutput.badOutputReasons) {
    //                                 //             index++;
    //                                 //             if (index === dataOutput.badOutputReasons.length) {
    //                                 //                 description += `${index}. ${a.badOutputReason.reason ? a.badOutputReason.reason : ""} ${a.length ? a.length : 0}(m) ${tamp.action ? tamp.action : a.action ? a.action : ""}`;
    //                                 //             }
    //                                 //             description += `${index}. ${a.badOutputReason.reason ? a.badOutputReason.reason : ""} ${a.length ? a.length : 0}(m) ${tamp.action ? tamp.action : a.action ? a.action : ""}\n`;
    //                                 //         }
    //                                 //     }
    //                                 //     tamp.badOutputDescription = description;
    //                                 // } else {
    //                                 //     var description = ""
    //                                 //     if (dataOutput.badOutputReasons && dataOutput.badOutputReasons.length > 0) {
    //                                 //         var index = 0;
    //                                 //         for (var a of dataOutput.badOutputReasons) {
    //                                 //             index++;
    //                                 //             if (index === dataOutput.badOutputReasons.length) {
    //                                 //                 description += `${index}. ${a.badOutputReason.reason ? a.badOutputReason.reason : ""} ${a.length ? a.length : 0}(m) ${tamp.action ? tamp.action : a.action ? a.action : ""}`;
    //                                 //             }
    //                                 //             description += `${index}. ${a.badOutputReason.reason ? a.badOutputReason.reason : ""} ${a.length ? a.length : 0}(m) ${tamp.action ? tamp.action : a.action ? a.action : ""}\n`;
    //                                 //         }
    //                                 //     }
    //                                 //     tamp["badOutputDescription"] = description;
    //                                 // }
    //                             }
    //                             // for(var b of output){
    //                             //     if(tamp.code === b.code){
    //                             //         tamp.badOutput = b.badOutput;
    //                             //         tamp.goodOutput = b.goodOutput;
    //                             //         tamp.dateOutput = b.dateOutput;
    //                             //         tamp.timeOutput = b.timeOutput;
    //                             //         tamp.badOutputDescription = b.badOutputDescription;
    //                             //     }
    //                             // }
    //                             dataTemp.push(tamp);
    //                         }
    //                         if (dataTemp.length > 0) {
    //                             data.data = dataTemp;
    //                             data.count = dataTemp.length;
    //                             data.total = dataTemp.length;
    //                         }
    //                         resolve(data);
    //                     });
    //             });
    //     });
    // }

    getDailyOperationReport(query) {
        var date = new Date();
        var dateString = moment(date).format('YYYY-MM-DD');
        var dateNow = new Date(dateString);
        var dateBefore = dateNow.setDate(dateNow.getDate() - 30);
        var date = {
            "dateInput": {
                "$gte": (!query || !query.dateFrom ? (new Date(dateBefore)) : (new Date(query.dateFrom))),
                "$lte": (!query || !query.dateTo ? date : (new Date(query.dateTo + "T23:59")))
            },
            "_deleted": false
        };
        var kanbanQuery = {};
        if (query.kanban) {
            kanbanQuery = {
                "kanbanId": new ObjectId(query.kanban)
            };
        }
        var machineQuery = {};
        if (query.machine) {
            machineQuery = {
                "machineId": new ObjectId(query.machine)
            };
        }
        var order = {
            "dateInput": -1,
            "code": -1
        };
        var inputQuery = { "$and": [date, machineQuery, kanbanQuery, { "type": "input" }] };

        var selectedFields = {
            "code": 1,
            "kanban.productionOrder.orderNo": 1,
            "kanban.cart.cartNumber": 1,
            "kanban.isReprocess": 1,
            "machine.name": 1,
            "step.process": 1,
            "kanban.productionOrder.material.name": 1,
            "kanban.selectedProductionOrderDetail.colorRequest": 1,
            "kanban.productionOrder.finishWidth": 1,
            "kanban.productionOrder.processType.name": 1,
            "dateInput": 1,
            "timeInput": 1,
            "input": 1,
            "dateOutput": 1,
            "timeOutput": 1,
            "goodOutput": 1,
            "badOutput": 1,
            "badOutputDescription": 1,
            "action": 1,
            "type": 1,
            "badOutputReasons.badOutputReason.reason": 1,
            "badOutputReasons.precentage": 1,
            "badOutputReasons.length": 1,
            "badOutputReasons.action": 1
        }

        return this.collection
            .aggregate([
                { "$match": inputQuery },
                { "$project": { "code": 1 } }
            ])
            .toArray()
            .then((inputResults) => {

                var inputCodes = inputResults.map((result) => {
                    return result.code;
                });

                return this.collection
                    .aggregate([
                        { "$match": { "code": { "$in": inputCodes } } },
                        { "$project": selectedFields },
                        { "$sort": order }
                    ])
                    .toArray()
                    .then((results) => {
                        var resultFormat = {
                            data: [],
                            count: 0,
                            size: 0,
                            total: 0,
                            page: 0
                        }

                        for (var result of results) {
                            if (result.type && result.type.toString().toLowerCase() === "input") {
                                var outputResult = results.find((daily) => daily.type && daily.type.toString().toLowerCase() === "output" && daily.code === result.code);

                                if (outputResult) {
                                    result.badOutput = outputResult.badOutput;
                                    result.goodOutput = outputResult.goodOutput;
                                    result.dateOutput = outputResult.dateOutput;
                                    result.timeOutput = outputResult.timeOutput;
                                    result.action = outputResult.action ? outputResult.action : "";

                                    result.badOutputDescription = outputResult.badOutputDescription ? outputResult.badOutputDescription : "";
                                    if (outputResult.badOutputReasons && outputResult.badOutputReasons.length > 0) {
                                        var index = 0;
                                        var description = "";
                                        for (var reason of outputResult.badOutputReasons) {
                                            index++;
                                            if (index === outputResult.badOutputReasons.length) {
                                                description += `${index}. ${reason.badOutputReason.reason ? reason.badOutputReason.reason : ""} ${reason.length ? reason.length + "(m)" : reason.precentage ? reason.precentage + "(%)" : 0} ${result.action ? result.action : reason.action ? reason.action : ""}`;
                                            } else {
                                                description += `${index}. ${reason.badOutputReason.reason ? reason.badOutputReason.reason : ""} ${reason.length ? reason.length + "(m)" : reason.precentage ? reason.precentage + "(%)" : 0} ${result.action ? result.action : reason.action ? reason.action : ""}\n`;
                                            }
                                        }
                                        result.badOutputDescription = description;
                                    }
                                }

                                resultFormat.data.push(result);
                            }
                        }

                        resultFormat.count = results.length;
                        resultFormat.total = results.length;

                        return Promise.resolve(resultFormat)
                    })
            })
    }

    getDailyMachine(query, timeOffset) {
        var area = query.area;
        var machineId = query.machineId;

        timeOffset = timeOffset * 60 * 60000;

        // var date = {
        //     "dateOutput": {
        //         "$gte": (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(query.dateFrom))),
        //         "$lte": (!query || !query.dateTo ? (new Date()) : (new Date(query.dateTo)))
        //     },
        // };

        // var order = query.order;
        // var temp;

        // if (JSON.stringify(order).includes(`"desc"`)) {
        //     temp = JSON.stringify(order).replace(`"desc"`, -1);
        //     order = JSON.parse(temp)
        // } else if (JSON.stringify(order).includes(`"asc"`)) {
        //     temp = JSON.stringify(order).replace(`"asc"`, 1);
        //     order = JSON.parse(temp)
        // } else {
        //     order;
        // }

        var matchQuery = {
            "_deleted": false,
            "type": "output",
            "dateOutput": {
                "$gte": new Date(query.dateFrom),
                "$lte": new Date(query.dateTo)
            }
        }

        if (machineId) {
            matchQuery["machineId"] = new ObjectId(machineId);
        }

        if (area.toLowerCase() !== "all area") {
            matchQuery["step.processArea"] = area;
        }

        return this.collection.aggregate([
            {
                "$match": matchQuery
            },
            {
                "$project": {
                    "_deleted": 1,
                    "type": 1,
                    "dateOutput": 1,
                    "machineId": 1,
                    "machine.name": 1,
                    "machine.code": 1,
                    "goodOutput": 1,
                    "badOutput": 1,
                    "step.processArea": 1,
                    "year": {
                        "$year": {
                            "$add": ["$dateOutput", timeOffset]
                        }
                    },
                    "month": {
                        "$month": {
                            "$add": ["$dateOutput", timeOffset]
                        }
                    },
                    "day": {
                        "$dayOfMonth": {
                            "$add": ["$dateOutput", timeOffset]
                        }
                    },
                    "date": "$dateOutput"
                }
            },
            {
                "$group": {
                    "_id": { "machineName": "$machine.name", "machineCode": "$machine.code", "processArea": "$step.processArea", "year": "$year", "month": "$month", "day": "$day", "date": "$date" },
                    "totalBadOutput": { "$sum": "$badOutput" },
                    "totalGoodOutput": { "$sum": "$goodOutput" },
                    "totalBadGood": { "$sum": { "$sum": ["$goodOutput", "$badOutput"] } }
                }
            },
            {
                "$sort": {
                    "_id.date": 1
                }
            }
        ]
        ).sort({ "dateOutput": -1 }).toArray()
            .then((dailyResults) => {

                var data = {};
                data["info"] = dailyResults || [];
                data["summary"] = this.sumDaily(dailyResults);

                var grandTotal = {};
                grandTotal._id = {
                    "machineName": "TOTAL",
                    "processArea": ""
                };
                grandTotal.totalBadOutput = 0;
                grandTotal.totalGoodOutput = 0;
                grandTotal.totalBadGood = 0;
                for (var datum of data.info) {
                    grandTotal.totalBadOutput += datum.totalBadOutput;
                    grandTotal.totalGoodOutput += datum.totalGoodOutput;
                    grandTotal.totalBadGood += datum.totalBadGood;
                }
                data.info.push(grandTotal);

                var grandTotalSummary = {
                    "machineName": "TOTAL"
                };
                grandTotalSummary.goodOutputTotal = 0;
                grandTotalSummary.badOutputTotal = 0;
                grandTotalSummary.totalGoodBad = 0;
                for (var datum of data.summary) {
                    grandTotalSummary.goodOutputTotal += datum.goodOutputTotal;
                    grandTotalSummary.badOutputTotal += datum.badOutputTotal;
                    grandTotalSummary.totalGoodBad += datum.totalGoodBad;
                }
                data.summary.push(grandTotalSummary);

                return Promise.resolve(data);
            })
    }

    sumDaily(results) {

        var data = [];
        if (results.length > 0) {
            for (var result of results) {

                var exist = data.find((datum) => datum && datum.machineName === result._id.machineName);
                if (exist) {
                    var index = data.findIndex((datum) => datum.machineName === result._id.machineName);
                    data[index].goodOutputTotal += result.totalGoodOutput;
                    data[index].badOutputTotal += result.totalBadOutput;
                    data[index].totalGoodBad += result.totalBadGood;
                } else {
                    var sumDatum = {
                        machineName: result._id.machineName,
                        goodOutputTotal: result.totalGoodOutput,
                        badOutputTotal: result.totalBadOutput,
                        totalGoodBad: result.totalBadGood
                    }
                    data.push(sumDatum);
                }
            }
        }

        return data;
    }

    getXlsDailyMachine(result, query, offset) {

        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";

        for (var daily of result.info) {
            index++;
            var item = {};
            item["No"] = index;
            item["dateOutput"] = daily._id && daily._id.date ? moment(daily._id.date).add(offset, "h").format(dateFormat) : "";
            item["Machine Name"] = daily._id.machineName;
            item["process Area"] = daily._id.processArea;
            item["type"] = "output";
            item["GoodOutput"] = daily.totalGoodOutput;
            item["BadOutput"] = daily.totalBadOutput;

            xls.data.push(item);
        }

        xls.options["No"] = "number";
        xls.options["dateOutput"] = "string";
        xls.options["Machine Name"] = "string";
        xls.options["process Area"] = "string";
        xls.options["type"] = "string";
        xls.options["GoodOutput"] = "number";
        xls.options["BadOutput"] = "number";

        xls.name = `Daily Operation Report ${moment(new Date(query.dateFrom)).format(dateFormat)} -  ${moment(new Date(query.dateTo)).format(dateFormat)} - ${query.area}.xlsx`;

        return Promise.resolve(xls);
    }

    getDailyOperationBadReport(query) {
        return new Promise((resolve, reject) => {

            var date = {
                "dateOutput": {
                    "$gte": (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
                    "$lte": (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
                },
                "_deleted": false
            };
            // var kanbanQuery = {};
            // if(query.kanban)
            // {
            //     kanbanQuery = {
            //         "kanbanId" : new ObjectId(query.kanban)
            //     };
            // }
            // var machineQuery = {};
            //  if(query.machine)
            //  {
            //      machineQuery = {
            //          "machineId" : new ObjectId(query.machine)
            //      };
            //  }


            //  var order = {
            //     "kanban.productionOrder.orderNo" : 1
            // };
            // var QueryOutput = {"$and" : [date, machineQuery]};
            //var Qmatch = {"$and" : [date, machineQuery]};
            this.collection.aggregate([
                { "$match": date },
                {
                    "$group": {
                        //"_id" : {"orderNo" : "$kanban.productionOrder.orderNo"},
                        //"_id" : {"machine" : "$machine.name", "orderNo" : "$kanban.productionOrder.orderNo"},
                        "_id": { "machine": "$machine.name" },
                        "badOutput": { "$sum": { $ifNull: ["$badOutput", 0] } },
                        "goodOutput": { "$sum": { $ifNull: ["$goodOutput", 0] } }

                    }
                },
                { $sort: { "_id.machine": 1 } }
            ])

                .toArray()
                .then(result => {
                    resolve(result);
                });
        });
    }

    getMonitoringMontlyReport(query) {
        return this.collection.aggregate([
            {
                "$match": {
                    "_deleted": false, "machine.code": query.machineCode, "type": "input", "dateInput": {
                        "$gte": new Date(query.dateFrom),
                        "$lte": new Date(query.dateTo)
                    }
                }
            },
            {
                "$project": {
                    "_updatedDate":1,
                    "_deleted": 1,
                    "type": 1,
                    "input":1,
                    "dateInput": 1,
                    "machine.name": 1,
                    "machine.code": 1,
                    "machine.monthlyCapacity":1,
                }
            }])
            .sort({ "_updatedDate": -1})
            .toArray()
    }

    getDataDaily(query) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .find(query)
                    .sort({
                        "_createdDate": -1
                    })
                    .toArray();
            });
    }

    getXls(result, query, timezone) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";

        for (var daily of result.data) {
            index++;
            var item = {};
            item["No"] = index;
            item["No Order"] = daily.kanban ? daily.kanban.productionOrder.orderNo : '';
            item["No Kereta"] = daily.kanban ? daily.kanban.cart.cartNumber : '';
            item["Reproses"] = daily.kanban ? daily.kanban.isReprocess : '';
            item["Mesin"] = daily.machine ? daily.machine.name : '';
            item["Step Proses"] = daily.machine ? daily.step.process : '';
            item["Material"] = daily.kanban ? daily.kanban.productionOrder.material.name : '';
            item["Warna"] = daily.kanban ? daily.kanban.selectedProductionOrderDetail.colorType ? `${daily.kanban.selectedProductionOrderDetail.colorType.name} ${daily.kanban.selectedProductionOrderDetail.colorRequest}` : daily.kanban.selectedProductionOrderDetail.colorRequest : '';
            item["Lebar Kain (inch)"] = daily.kanban ? daily.kanban.productionOrder.materialWidth : '';
            item["Jenis Proses"] = daily.kanban ? daily.kanban.productionOrder.processType.name : '';
            item["Tgl Input"] = daily.dateInput ? moment(new Date(daily.dateInput)).format(dateFormat) : '';
            item["Jam Input"] = daily.timeInput ? moment(daily.timeInput).format('HH:mm') : '';
            // item["Jam Input"] = daily.timeInput ? moment(daily.timeInput).add(timezone, 'h').format('HH:mm') : '';
            item["input"] = daily.input ? daily.input : 0;
            item["Tgl Output"] = daily.dateOutput ? moment(new Date(daily.dateOutput)).format(dateFormat) : '';
            item["Jam Output"] = daily.timeOutput ? moment(daily.timeOutput).format('HH:mm') : '';
            // item["Jam Output"] = daily.timeOutput ? moment(daily.timeOutput).add(timezone, 'h').format('HH:mm') : '';
            item["BQ"] = daily.goodOutput ? daily.goodOutput : 0;
            item["BS"] = daily.badOutput ? daily.badOutput : 0;
            item["Keterangan BQ"] = daily.badOutputDescription ? daily.badOutputDescription : '';

            xls.data.push(item);
        }

        xls.options["No"] = "number";
        xls.options["No Order"] = "string";
        xls.options["No Kereta"] = "string";
        xls.options["Reproses"] = "string";
        xls.options["Mesin"] = "string";
        xls.options["Step Proses"] = "string";
        xls.options["Material"] = "string";
        xls.options["Warna"] = "string";
        xls.options["Lebar Kain (inch)"] = "string";
        xls.options["Jenis Proses"] = "string";
        xls.options["Tgl Input"] = "string";
        xls.options["Jam Input"] = "string";
        xls.options["input"] = "number";
        xls.options["Tgl Output"] = "string";
        xls.options["Jam Output"] = "string";
        xls.options["BQ"] = "number";
        xls.options["BS"] = "number";
        xls.options["Keterangan BQ"] = "string";

        if (query.dateFrom && query.dateTo) {
            xls.name = `Daily Operation Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Daily Operation Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
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
        };

        var deletedIndex = {
            name: `ix_${map.production.finishingPrinting.collection.DailyOperation}__deleted`,
            key: {
                _deleted: 1
            }
        };

        return this.collection.createIndexes([dateIndex, deletedIndex]);
    }

    read(paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: {},
            filter: {},
            select: []
        }, paging);

        return this._createIndexes()
            .then((createIndexResults) => {
                var query = this._getQuery(_paging);

                this.collection
                    .where(query)
                    .select(_paging.select)
                    .page(_paging.page, _paging.size)
                    .order(_paging.order)

                var q = this.collection.query();
                var hint = {};

                if (Object.getOwnPropertyNames(q.selector["$and"][1]).length === 0) {
                    hint._deleted = 1;
                }

                return Promise.all([this.collection.find(q.selector).hint(hint).count(), this.collection._load(q)])
                    .then((results) => {
                        var count = results[0];
                        var docs = results[1];

                        this.collection._query = null;
                        var result = {
                            data: docs,
                            count: docs.length,
                            size: q.limit,
                            total: count,
                            page: q.offset / q.limit + 1
                        };
                        if (q.fields && q.fields instanceof Array) {
                            result.select = q.fields;
                        }
                        result.order = q.sort;
                        result.filter = q.filter;
                        return Promise.resolve(result);
                    });
            });
    }
};