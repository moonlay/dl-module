"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var assert = require('assert');
var DLModels = require("dl-models");
var map = DLModels.map;
var generateCode = require("../../../utils/code-generator");
var ProductionOrderManager = require('../../sales/production-order-manager');
var InstructionManager = require('../../master/instruction-manager');
var UomManager = require('../../master/uom-manager');
var Kanban = DLModels.production.finishingPrinting.Kanban;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class KanbanManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.production.finishingPrinting.collection.Kanban);
        this.instructionManager = new InstructionManager(db, user);
        this.productionOrderManager = new ProductionOrderManager(db, user);
        this.uomManager = new UomManager(db, user);
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
            var cartFilter = {
                "cart.cartNumber": {
                    "$regex": regex
                }
            };
            var codeFilter = {
                "code": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [orderNoFilter, cartFilter, codeFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        if (data.cart){
            data.cart.code = generateCode();
        }
        data._createdDate = new Date();
        return Promise.resolve(data);
    }

    _validate(kanban) {
        var errors = {};
        var valid = kanban;

        var getDuplicateKanbanPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });
        var getUom = this.uomManager.collection.find({unit: "MTR"}).toArray();
        var getProductionOrder = valid.productionOrderId && ObjectId.isValid(valid.productionOrderId) ? this.productionOrderManager.getSingleByIdOrDefault(new ObjectId(valid.productionOrderId)) : Promise.resolve(null);
        var getProductionOrderDetail = (valid.selectedProductionOrderDetail && valid.selectedProductionOrderDetail.code) ? this.productionOrderManager.getSingleProductionOrderDetail(valid.selectedProductionOrderDetail.code) : Promise.resolve(null);
        var getInstruction = valid.instructionId && ObjectId.isValid(valid.instructionId) ? this.instructionManager.getSingleByIdOrDefault(new ObjectId(valid.instructionId)) : Promise.resolve(null);
        var getKanban = valid._id && ObjectId.isValid(valid._id) ? this.getSingleById(valid._id) : Promise.resolve(null);

        return Promise.all([getDuplicateKanbanPromise, getProductionOrder, getProductionOrderDetail, getInstruction, getKanban, getUom])
            .then(results => {
                var _kanbanDuplicate = results[0];
                var _productionOrder = results[1];
                var _productionOrderDetail = results[2];
                var _instruction = results[3];
                var _kanban = results[4];
                var uom = results[5];
                var _uom = uom[0];
                if (_kanban)
                    _kanban.currentStepIndex = _kanban.currentStepIndex || 0; // old kanban data does not have currentStepIndex

                return Promise.all([this.getKanbanListByColorAndOrderNumber(valid._id, _productionOrder, _productionOrderDetail)])
                    .then(_kanbanListByColor => {

                        if (_kanbanDuplicate)
                            errors["code"] = i18n.__("Kanban.code.isExists:%s is exists", i18n.__("Kanban.code._:Code"));
                        
                        /* Lepas validasi ini karena tambah flow reprocess */
                        // if (_kanban && !_kanban.isComplete && valid.isComplete && _kanban.currentStepIndex < _kanban.instruction.steps.length){
                        //     errors["isComplete"] = i18n.__("Kanban.isComplete.incompleteSteps:%s steps are incomplete", i18n.__("Kanban.code._:Kanban"));
                        // }

                        if (!valid.productionOrder)
                            errors["productionOrder"] = i18n.__("Kanban.productionOrder.isRequired:%s is required", i18n.__("Kanban.productionOrder._:ProductionOrder")); //"Production Order harus diisi";
                        else if (!_productionOrder)
                            errors["productionOrder"] = i18n.__("Kanban.productionOrder.notFound:%s not found", i18n.__("Kanban.productionOrder._:ProductionOrder")); //"Production Order tidak ditemukan";
                        
                        if (!_productionOrderDetail)
                            errors["selectedProductionOrderDetail"] = i18n.__("Kanban.selectedProductionOrderDetail.isRequired:%s is required", i18n.__("Kanban.selectedProductionOrderDetail._:Color")); //"Color harus diisi";

                        if (!valid.cart)
                            errors["cart"] = i18n.__("Kanban.cart.isRequired:%s is required", i18n.__("Kanban.cart._:Cart")); //"Cart harus diisi";                        
                        // else{
                        //     var cartCurrentQty = 0;
                        //     if (_kanbanListByColor[0] && _kanbanListByColor[0].data.length > 0){
                        //         for (var item of _kanbanListByColor[0].data){
                        //             cartCurrentQty += Number(item.cart.qty);
                        //         }
                        //     }
                        //     if(_productionOrder){
                        //         var productionOrderQty = 0;
                        //         var tolerance = 0;
                        //         if(_productionOrder.shippingQuantityTolerance !== 0 && _uom){
                        //             if(_productionOrder.uomId.toString() === _uom._id.toString())
                        //                 tolerance = (_productionOrder.shippingQuantityTolerance / 100) * _productionOrderDetail.quantity;
                        //             else
                        //                 tolerance = (_productionOrder.shippingQuantityTolerance / 100) * (_productionOrderDetail.quantity * 0.9144);
                        //         }
                        //         if(_uom){
                        //             if(_productionOrder.uomId.toString() === _uom._id.toString())
                        //                 productionOrderQty = _productionOrderDetail.quantity + tolerance;
                        //             else
                        //                 productionOrderQty = (_productionOrderDetail.quantity * 0.9144) + tolerance;
                        //         }else
                        //             productionOrderQty = _productionOrderDetail.quantity + tolerance;
                        //         cartCurrentQty += Number(valid.cart.qty);
                        //         if (cartCurrentQty > productionOrderQty)
                        //             errors["cart"] = i18n.__("Kanban.cart.qtyOverlimit:%s overlimit", i18n.__("Kanban.cart._:Total Qty")); //"Total Qty in cart over limit";
                        //     }
                        // }
                        
                        if (!valid.grade || valid.grade == '')
                            errors["grade"] = i18n.__("Kanban.grade.isRequired:%s is required", i18n.__("Kanban.grade._:Grade")); //"Grade harus diisi";   

                        if (!valid.instruction)
                            errors["instruction"] = i18n.__("Kanban.instruction.isRequired:%s is required", i18n.__("Kanban.instruction._:Instruction")); //"Instruction harus diisi";
                        else if (!_instruction)
                            errors["instruction"] = i18n.__("Kanban.instruction.notFound:%s not found", i18n.__("Kanban.instruction._:Instruction")); //"Instruction tidak ditemukan";
                        else {
                            var stepsError = [];
                            var hasError = false;

                            for (var step of valid.instruction.steps) {
                                var stepErrors = {};
                                
                                if(!step.process || step.process == "") {
                                    stepErrors["process"] = i18n.__("Kanban.instruction.steps.process.isRequired:%s is required", i18n.__("Kanban.instruction.steps.process._:Process")); //"Proses harus diisi";
                                }

                                if(!step.machine || Object.getOwnPropertyNames(step.machine).length == 0) {
                                    stepErrors["machine"] = i18n.__("Kanban.instruction.steps.machine.isRequired:%s is required", i18n.__("Kanban.instruction.steps.machine._:Machine")); //"Mesin harus diisi";
                                }

                                if(!step.deadline) {
                                    stepErrors["deadline"] = i18n.__("Kanban.instruction.steps.deadline.isRequired:%s is required", i18n.__("Kanban.instruction.steps.deadline._:Deadline")); //"Target Selesai harus diisi";
                                }
                                
                                stepsError.push(stepErrors);
                            }
                            
                            for(var stepError of stepsError)
                            {
                                if(Object.getOwnPropertyNames(stepError).length > 0)
                                {
                                    hasError = true;
                                    break;
                                }
                            }

                            if(hasError)
                                errors["steps"] = stepsError;
                        }

                        if (Object.getOwnPropertyNames(errors).length > 0) {
                            var ValidationError = require('module-toolkit').ValidationError;
                            return Promise.reject(new ValidationError('data does not pass validation', errors));
                        }

                        if (_instruction) {
                            valid.instructionId = _instruction._id;
                            valid.instruction._id = _instruction._id;
                            for(var a of valid.instruction.steps){
                                a._id = new ObjectId(a._id);
                            }
                        }
                        if (_productionOrder) {
                            valid.productionOrderId = _productionOrder._id;
                            valid.productionOrder = _productionOrder;
                            valid.cart.uomId = _productionOrder.uomId;
                            valid.cart.uom = _productionOrder.uom;
                        }
                        if(_uom){
                            valid.cart.uomId = _uom._id;
                            valid.cart.uom = _uom;
                        }

                        if(valid.oldKanbanId && ObjectId.isValid(valid.oldKanbanId)) {
                            valid.oldKanbanId = new ObjectId(valid.oldKanbanId);
                        }

                        if (!valid.stamp) {
                            valid = new Kanban(valid);
                        }
                        valid.stamp(this.user.username, "manager");
                        return Promise.resolve(valid);
                    })
            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.production.finishingPrinting.collection.Kanban}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var codeIndex = {
            name: `ix_${map.production.finishingPrinting.collection.Kanban}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

    getKanbanListByColorAndOrderNumber(kanbanId, productionOrder, productionOrderDetail) {

        if (productionOrder && productionOrderDetail) {
            var _defaultFilter = {
                _deleted: false
            }, kanbanFilter = {},
                productionOrderFilter = {},
                productionOrderDetailFilter = {},
                query = {};

            if (kanbanId){
                kanbanFilter = { _id: {'$ne': new ObjectId(kanbanId)}};
            }

            if (productionOrder && productionOrder.orderNo != '') {
                productionOrderFilter = { 'productionOrder.orderNo': productionOrder.orderNo };
            }
            if (productionOrderDetail && productionOrderDetail.code != '') {
                productionOrderDetailFilter = { 'selectedProductionOrderDetail.code': productionOrderDetail.code };
            }

            query = { '$and': [_defaultFilter, kanbanFilter, productionOrderFilter, productionOrderDetailFilter] };

            return this.collection.where(query).execute();
        }
        else
            Promise.resolve(null);
    }

    pdf(kanban) {
        return new Promise((resolve, reject) => {
            var getDefinition = require("../../../pdf/definitions/kanban");
            var definition = getDefinition(kanban);

            var generatePdf = require("../../../pdf/pdf-generator");
            generatePdf(definition)
                .then(binary => {
                    resolve(binary);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    getDataReport(query){
        return new Promise((resolve, reject) => {
        var deletedQuery = {
                _deleted: false
            };
        var orderQuery = {};
        if(query.orderNo != '' && query.orderNo!=undefined){
            orderQuery = {
                "productionOrder.orderNo" : {
                    "$regex" : (new RegExp(query.orderNo, "i"))
                }
            };
        }
        var orderTypeQuery = {};
        if(query.orderTypeId){
            orderTypeQuery = {
                "productionOrder.orderTypeId" : (new ObjectId(query.orderTypeId))
            };
        }
        var processTypeQuery = {};
        if(query.processTypeId){
            processTypeQuery ={
                "productionOrder.processTypeId" : (new ObjectId(query.processTypeId))
            };
        }
        var date = {
            "_createdDate" : {
                "$gte" : (!query || !query.sdate ? (new Date("1900-01-01")) : (new Date(`${query.sdate} 00:00:00`))),
                "$lte" : (!query || !query.edate ? (new Date()) : (new Date(`${query.edate} 23:59:59`)))
            }
        };
        var Query = {"$and" : [date,processTypeQuery,orderTypeQuery,orderQuery,deletedQuery]};
        this.collection
                .aggregate([ 
                    {$match : Query},
                    {$project :{
                        "_createdDate" : 1,
                        "orderNo" : "$productionOrder.orderNo",
                        "orderType" : "$productionOrder.orderType.name",
                        "processType" : "$productionOrder.processType.name",
                        "color" : "$selectedProductionOrderDetail.colorRequest",
                        "handfeelStandard" : "$productionOrder.handlingStandard",
                        "finishWidth" : "$productionOrder.finishWidth",
                        "material" : "$productionOrder.material.name",
                        "construction" : "$productionOrder.materialConstruction.name",
                        "yarnNumber" : "$productionOrder.yarnMaterial.name",
                        "grade" : "$grade",
                        "cartNumber" : "$cart.cartNumber",
                        "length" : "$cart.qty",
                        "pcs" : "$cart.pcs",
                        "uom" : "$productionOrder.uom.unit",
                        "isComplete" : 1,
                        "currentStepIndex" : 1,
                        "steps" : "$instruction.steps"
                    }},
                    {$sort : {"_createdDate" : -1}}
                ])
                .toArray(function(err, result) {
                    assert.equal(err, null);
                    resolve(result);
                })
        });
    }
};