"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var StepManager = require('../../master/step-manager');
var ProductionOrderManager = require('../../sales/production-order-manager');
var InstructionManager = require('../../master/instruction-manager');
var Kanban = DLModels.production.finishingPrinting.Kanban;
var Partition = DLModels.production.finishingPrinting.Partition;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class KanbanManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.production.finishingPrinting.collection.Kanban);
        this.instructionManager = new InstructionManager(db, user);
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
            var gradeFilter = {
                "grade": {
                    "$regex": regex
                }
            };
            var colorTypeFilter = {
                "colorType.name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [orderNoFilter, colorFilter, gradeFilter, colorTypeFilter];
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
            //1. begin: Declare promises.
           var getProductionOrder = valid.productionOrderId && ObjectId.isValid(valid.productionOrderId) ? this.productionOrderManager.getSingleByIdOrDefault(new ObjectId(valid.productionOrderId)) : Promise.resolve(null);
            var getInstruction = valid.instructionId && ObjectId.isValid(valid.instructionId) ? this.instructionManager.getSingleByIdOrDefault(new ObjectId(valid.instructionId)) : Promise.resolve(null);
            Promise.all([getProductionOrder,getInstruction])
                .then(results => {
                    var _productionOrder = results[0];
                    var _instruction = results[1];
                    var getData = Promise.resolve(null);
                    if(_productionOrder){
                        if(_productionOrder.orderType){
                            if(_productionOrder.orderType.name.trim().toLowerCase() != "printing" && _productionOrder.orderType.name.trim().toLowerCase() != "yarn dyed"){
                                getData = this.getSingleByQueryOrDefault({
                                    '$and' : [{
                                            _id: {
                                                '$ne': new ObjectId(valid._id)
                                            }
                                        },{
                                            "productionOrderId" : valid.productionOrderId && ObjectId.isValid(valid.productionOrderId) ? (new ObjectId(valid.productionOrderId)) : {}
                                        },{
                                            '_deleted' : false
                                        },{
                                            'color' : valid.color
                                        },{
                                            'colorTypeId' : valid.colorTypeId && ObjectId.isValid(valid.colorTypeId) ? (new ObjectId(valid.colorTypeId)) : {}
                                        }]
                                });
                            }else{
                                getData = this.getSingleByQueryOrDefault({
                                    '$and' : [{
                                            _id: {
                                                '$ne': new ObjectId(valid._id)
                                            }
                                        },{
                                            "productionOrderId" : valid.productionOrderId && ObjectId.isValid(valid.productionOrderId) ? (new ObjectId(valid.productionOrderId)) : {}
                                        },{
                                            '_deleted' : false
                                        },{
                                            'color' : valid.color
                                        }]
                                });
                            }
                        }
                    }
                    Promise.all([getData])
                        .then(result => {
                            var _dataDaily = result[0];
                            var now = new Date();
                            
                            if(!valid.productionOrderId || valid.productionOrderId.toString() == "")
                                errors["productionOrder"] = i18n.__("Kanban.productionOrder.isRequired:%s is required", i18n.__("Kanban.productionOrder._:ProductionOrder")); //"Production Order harus diisi";
                            else if(!_productionOrder)
                                errors["productionOrder"] = i18n.__("Kanban.productionOrder.notFound:%s not found", i18n.__("Kanban.productionOrder._:ProductionOrder")); //"Production Order tidak ditemukan";
                            else if(_dataDaily)
                                errors["productionOrder"] = i18n.__("Kanban.productionOrder.isExists:%s with same color is ready exists", i18n.__("Kanban.productionOrder._:ProductionOrder")); //"Production Order tidak ditemukan";

                            if(!valid.color || valid.color == '')
                                errors["color"] = i18n.__("Kanban.color.isRequired:%s is required", i18n.__("Kanban.color._:Color")); //"color tidak ditemukan";
                            else if(_dataDaily)
                                errors["color"] = i18n.__("Kanban.color.isExists:%s with same Production Order is ready exists", i18n.__("Kanban.color._:Color")); //"Color tidak ditemukan";

                            if(!valid.instructionId || valid.instructionId.toString() == '')
                                errors["instruction"] = i18n.__("Kanban.instruction.isRequired:%s is required", i18n.__("Kanban.kanban.instruction._:Instruction")); //"Instruction tidak ditemukan";
                            else if(!_instruction)
                                errors["instruction"] = i18n.__("Kanban.instruction.isRequired:%s is required", i18n.__("DailyOperation.instruction._:Instruction")); //"Instruction tidak ditemukan";
                            
                            if(!valid.steps || valid.steps.length == 0)
                                errors["steps"] = i18n.__("Kanban.steps.isRequired:%s is required", i18n.__("DailyOperation.steps._:Steps")); //"Flow Proses harus diisi minimal satu";
                            

                            if(!valid.partitions || valid.partitions.length == 0){
                                errors["partitions"] = i18n.__("Kanban.partitions.isRequired:%s is required", i18n.__("DailyOperation.partitions._:Partitions")); //"Flow Proses harus diisi minimal satu";
                            }else{
                                var itemErrors = [];
                                var itemDuplicateErrors = [];
                                var valueArr = valid.partitions.map(function (item) { return item.no });
                                var isDuplicate = valueArr.some(function (item, idx) {
                                    var itemError = {};
                                    if (valueArr.indexOf(item) != idx) {
                                        itemError["no"] = i18n.__("Kanban.partitions.no.isDuplicate:%s is duplicate", i18n.__("Kanban.partitions.no._:No")); //"No Partisi tidak boleh kembar";
                                    }
                                    if (Object.getOwnPropertyNames(itemError).length > 0) {
                                        itemDuplicateErrors[valueArr.indexOf(item)] = itemError;
                                        itemDuplicateErrors[idx] = itemError;
                                    } else {
                                        itemDuplicateErrors[idx] = itemError;
                                    }
                                    return valueArr.indexOf(item) != idx
                                });
                                for (var item of valid.partitions) {
                                    var itemError = {};
                                    var _index = valid.partitions.indexOf(item);
                                    if (!item.no || item.no == "") {
                                        itemError["no"] = i18n.__("Kanban.partitions.no.isRequired:%s is required", i18n.__("Kanban.partitions.no._:No")); //"Nomor kereta tidak boleh kosong";
                                    } else if (isDuplicate) {
                                        if (Object.getOwnPropertyNames(itemDuplicateErrors[_index]).length > 0) {
                                            Object.assign(itemError, itemDuplicateErrors[_index]);
                                        }
                                    }
                                    if (item.lengthFabric <= 0) {
                                        itemError["lengthFabric"] = i18n.__("Kanban.partitions.lengthFabric.isRequired:%s is required", i18n.__("Kanban.partitions.lengthFabric._:LengthFabric")); //Jumlah barang tidak boleh kosong";
                                    }
                                    itemErrors.push(itemError);
                                }
                                
                                for (var itemError of itemErrors) {
                                    if (Object.getOwnPropertyNames(itemError).length > 0) {
                                        errors["partitions"] = itemErrors;
                                        break;
                                    }
                                }
                            }
                            
                            if (Object.getOwnPropertyNames(errors).length > 0) {
                                var ValidationError = require('module-toolkit').ValidationError;
                                return Promise.reject(new ValidationError('data does not pass validation', errors));
                            }

                            if(_instruction){
                                valid.instructionId = _instruction._id;
                                valid.instruction = _instruction;
                            }
                            if(_productionOrder){
                                valid.productionOrderId = _productionOrder._id;
                                valid.productionOrder = _productionOrder;
                            }

                            if (!valid.stamp){
                                valid = new Kanban(valid);
                            }
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

     _createIndexes() {
        var dateIndex = {
            name: `ix_${map.production.finishingPrinting.collection.Kanban}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        return this.collection.createIndexes([dateIndex]);
    }
};