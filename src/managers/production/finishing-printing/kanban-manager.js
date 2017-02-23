"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var assert = require('assert');
var DLModels = require("dl-models");
var map = DLModels.map;
var generateCode = require("../../../utils/code-generator");
var ProductionOrderManager = require('../../sales/production-order-manager');
var InstructionManager = require('../../master/instruction-manager');
var Kanban = DLModels.production.finishingPrinting.Kanban;
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
            keywordFilter["$or"] = [orderNoFilter];
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

        var getKanbanPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });
        var getProductionOrder = valid.productionOrderId && ObjectId.isValid(valid.productionOrderId) ? this.productionOrderManager.getSingleByIdOrDefault(new ObjectId(valid.productionOrderId)) : Promise.resolve(null);
        var getProductionOrderDetail = (valid.selectedProductionOrderDetail && valid.selectedProductionOrderDetail.code) ? this.productionOrderManager.getSingleProductionOrderDetail(valid.selectedProductionOrderDetail.code) : Promise.resolve(null);
        var getInstruction = valid.instructionId && ObjectId.isValid(valid.instructionId) ? this.instructionManager.getSingleByIdOrDefault(new ObjectId(valid.instructionId)) : Promise.resolve(null);

        return Promise.all([getKanbanPromise, getProductionOrder, getProductionOrderDetail, getInstruction])
            .then(results => {
                var _kanban = results[0];
                var _productionOrder = results[1];
                var _productionOrderDetail = results[2];
                var _instruction = results[3];

                return Promise.all([this.getKanbanListByColorAndOrderNumber(valid._id, _productionOrder, _productionOrderDetail)])
                    .then(_kanbanListByColor => {

                        if (_kanban)
                            errors["code"] = i18n.__("Kanban.code.isExists:%s is exists", i18n.__("Kanban.code._:Code"));
                        if (!valid.productionOrder)
                            errors["productionOrder"] = i18n.__("Kanban.productionOrder.isRequired:%s is required", i18n.__("Kanban.productionOrder._:ProductionOrder")); //"Production Order harus diisi";
                        else if (!_productionOrder)
                            errors["productionOrder"] = i18n.__("Kanban.productionOrder.notFound:%s not found", i18n.__("Kanban.productionOrder._:ProductionOrder")); //"Production Order tidak ditemukan";
                        
                        if (!_productionOrderDetail)
                            errors["selectedProductionOrderDetail"] = i18n.__("Kanban.selectedProductionOrderDetail.isRequired:%s is required", i18n.__("Kanban.selectedProductionOrderDetail._:Color")); //"Color harus diisi";

                        if (!valid.cart)
                            errors["cart"] = i18n.__("Kanban.cart.isRequired:%s is required", i18n.__("Kanban.cart._:Cart")); //"Cart harus diisi";                        
                        else{
                            var currentQty = 0;
                            if (_kanbanListByColor[0] && _kanbanListByColor[0].data.length > 0){
                                for (var item of _kanbanListByColor[0].data){
                                    currentQty += Number(item.cart.qty);
                                }
                            }
                            currentQty += Number(valid.cart.qty);
                            if (currentQty > _productionOrderDetail.quantity)
                                errors["cart"] = i18n.__("Kanban.cart.qtyOverlimit:%s overlimit", i18n.__("Kanban.cart._:Total Qty")); //"Total Qty in cart over limit";
                        }
                        

                        if (!valid.instruction)
                            errors["instruction"] = i18n.__("Kanban.instruction.isRequired:%s is required", i18n.__("Kanban.instruction._:Instruction")); //"Instruction harus diisi";
                        else if (!_instruction)
                            errors["instruction"] = i18n.__("Kanban.instruction.notFound:%s not found", i18n.__("Kanban.instruction._:Instruction")); //"Instruction tidak ditemukan";

                        if (Object.getOwnPropertyNames(errors).length > 0) {
                            var ValidationError = require('module-toolkit').ValidationError;
                            return Promise.reject(new ValidationError('data does not pass validation', errors));
                        }

                        if (_instruction) {
                            valid.instructionId = _instruction._id;
                        }
                        if (_productionOrder) {
                            valid.productionOrderId = _productionOrder._id;
                            valid.productionOrder = _productionOrder;
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
            name: `ix_${map.production.finishingPrinting.collection.MonitoringEvent}_code`,
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
};