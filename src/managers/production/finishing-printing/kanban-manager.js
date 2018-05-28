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
var moment = require("moment");

module.exports = class KanbanManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.production.finishingPrinting.collection.Kanban);
        this.dailyOperationCollection = this.db.use(map.production.finishingPrinting.collection.DailyOperation);
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
        if (data.cart) {
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
        var getUom = this.uomManager.collection.find({ unit: "MTR" }).toArray();
        var getProductionOrder = valid.productionOrderId && ObjectId.isValid(valid.productionOrderId) ? this.productionOrderManager.getSingleByIdOrDefault(new ObjectId(valid.productionOrderId)) : Promise.resolve(null);
        var getProductionOrderDetail = (valid.selectedProductionOrderDetail && valid.selectedProductionOrderDetail.code) ? this.productionOrderManager.getSingleProductionOrderDetail(valid.selectedProductionOrderDetail.code) : Promise.resolve(null);
        // var getInstruction = valid.instructionId && ObjectId.isValid(valid.instructionId) ? this.instructionManager.getSingleByIdOrDefault(new ObjectId(valid.instructionId)) : Promise.resolve(null);
        var getKanban = valid._id && ObjectId.isValid(valid._id) ? this.getSingleById(valid._id) : Promise.resolve(null);

        // return Promise.all([getDuplicateKanbanPromise, getProductionOrder, getProductionOrderDetail, getInstruction, getKanban, getUom])
        return Promise.all([getDuplicateKanbanPromise, getProductionOrder, getProductionOrderDetail, getKanban, getUom])
            .then(results => {
                var _kanbanDuplicate = results[0];
                var _productionOrder = results[1];
                var _productionOrderDetail = results[2];
                var _kanban = results[3];
                var uom = results[4];
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

                        if (!valid.instruction || valid.instruction == '' || valid.instruction.steps.length === 0)
                            errors["instruction"] = i18n.__("Kanban.instruction.isRequired:%s is required", i18n.__("Kanban.instruction._:Instruction")); //"Instruction harus diisi";
                        // else if (!_instruction)
                        //     errors["instruction"] = i18n.__("Kanban.instruction.notFound:%s not found", i18n.__("Kanban.instruction._:Instruction")); //"Instruction tidak ditemukan";
                        else {
                            var stepsError = [];
                            var hasError = false;

                            for (var step of valid.instruction.steps) {
                                var stepErrors = {};

                                if (!step.process || step.process == "") {
                                    stepErrors["process"] = i18n.__("Kanban.instruction.steps.process.isRequired:%s is required", i18n.__("Kanban.instruction.steps.process._:Process")); //"Proses harus diisi";
                                }

                                if (!step.machine || Object.getOwnPropertyNames(step.machine).length == 0) {
                                    stepErrors["machine"] = i18n.__("Kanban.instruction.steps.machine.isRequired:%s is required", i18n.__("Kanban.instruction.steps.machine._:Machine")); //"Mesin harus diisi";
                                }

                                if (!step.processArea || step.processArea == "") {
                                    stepErrors["processArea"] = i18n.__("Kanban.instruction.steps.processArea.isRequired:%s is required", i18n.__("Kanban.instruction.steps.processArea._:Process Area")); //"Area Proses harus diisi";
                                }

                                if (!step.deadline) {
                                    stepErrors["deadline"] = i18n.__("Kanban.instruction.steps.deadline.isRequired:%s is required", i18n.__("Kanban.instruction.steps.deadline._:Deadline")); //"Target Selesai harus diisi";
                                }

                                stepsError.push(stepErrors);
                            }

                            for (var stepError of stepsError) {
                                if (Object.getOwnPropertyNames(stepError).length > 0) {
                                    hasError = true;
                                    break;
                                }
                            }

                            if (hasError)
                                errors["steps"] = stepsError;
                        }

                        if (Object.getOwnPropertyNames(errors).length > 0) {
                            var ValidationError = require('module-toolkit').ValidationError;
                            return Promise.reject(new ValidationError('data does not pass validation', errors));
                        }

                        if (valid.instruction) {
                            valid.instructionId = ObjectId.isValid(valid.instruction._id) ? new ObjectId(valid.instruction._id) : valid.instruction._id;
                            valid.instruction._id = valid.instructionId;
                            for (var a of valid.instruction.steps) {
                                a._id = new ObjectId(a._id);
                            }
                        }
                        if (_productionOrder) {
                            valid.productionOrderId = _productionOrder._id;
                            // valid.productionOrder = _productionOrder;
                            
                            valid.productionOrder._id = _productionOrder._id;
                            valid.productionOrder.salesContractId = _productionOrder.salesContractId;
                            valid.productionOrder.buyerId = _productionOrder.buyerId;
                            valid.productionOrder.buyer._id = _productionOrder.buyerId;
                            valid.productionOrder.processTypeId = _productionOrder.processTypeId;
                            valid.productionOrder.orderTypeId = _productionOrder.orderTypeId;
                            valid.productionOrder.processType.orderTypeId = _productionOrder.processType.orderTypeId;
                            valid.productionOrder.materialId = _productionOrder.materialId;
                            valid.productionOrder.material._id = _productionOrder.materialId;
                            valid.productionOrder.materialConstructionId = _productionOrder.materialConstructionId;
                            valid.productionOrder.materialConstruction._id = _productionOrder.materialConstructionId;
                            valid.productionOrder.yarnMaterialId = _productionOrder.yarnMaterialId;
                            valid.productionOrder.yarnMaterial._id = _productionOrder.yarnMaterialId;
                            valid.productionOrder.uomId = _productionOrder.uomId;

                            valid.cart.uomId = _productionOrder.uomId;
                            valid.cart.uom = {
                                unit: _productionOrder.uom.unit,
                            };
                        }
                        if (_uom) {
                            valid.cart.uomId = _uom._id;
                            valid.cart.uom = {
                                unit: _uom.unit,
                            };
                        }

                        if (valid.oldKanbanId && ObjectId.isValid(valid.oldKanbanId)) {
                            let cartNumber = valid.oldKanban.cart.cartNumber;
                            let qty = valid.oldKanban.cart.qty;
                            let uom = valid.oldKanban.cart.uom.unit;
                            let pcs = valid.oldKanban.cart.pcs;

                            valid.oldKanbanId = new ObjectId(valid.oldKanbanId);
                            valid.oldKanban = {
                                _id: new ObjectId(valid.oldKanbanId),
                                cart: {
                                    qty: qty,
                                    cartNumber: cartNumber,
                                    uom: {
                                        unit: uom,
                                    },
                                    pcs: pcs,
                                }
                            };
                        }

                        if (!valid.stamp) {
                            valid = new Kanban(valid);
                        }
                        valid.stamp(this.user.username, "manager");
                        return Promise.resolve(valid);
                    })
            })
    }

    _afterInsert(id) {
        var kanbanId = id;
        return this.getSingleById(id)
            .then((kanban) => {
                var getKanban = kanban.oldKanban._id ? this.getSingleById(kanban.oldKanban._id) : Promise.resolve(null);
                return Promise.all([getKanban])
                    .then((result) => {
                        var oldKanban = result[0];
                        var isInactive = true; //old kanban to be inactivated
                        var updateOldKanban = oldKanban ? this.updateIsComplete(oldKanban._id, isInactive) : Promise.resolve(null);
                        return Promise.all([updateOldKanban])
                            .then((result) => Promise.resolve(kanbanId))
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

            if (kanbanId) {
                kanbanFilter = { _id: { '$ne': new ObjectId(kanbanId) } };
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

    getDataReport(query) {
        return new Promise((resolve, reject) => {
            var deletedQuery = {
                _deleted: false
            };
            var orderQuery = {};
            if (query.orderNo != '' && query.orderNo != undefined) {
                orderQuery = {
                    "productionOrder.orderNo": {
                        "$regex": (new RegExp(query.orderNo, "i"))
                    }
                };
            }
            var orderTypeQuery = {};
            if (query.orderTypeId) {
                orderTypeQuery = {
                    "productionOrder.orderTypeId": (new ObjectId(query.orderTypeId))
                };
            }
            var processTypeQuery = {};
            if (query.processTypeId) {
                processTypeQuery = {
                    "productionOrder.processTypeId": (new ObjectId(query.processTypeId))
                };
            }
            var prosesQuery = {};
            if (query.proses != '' && query.proses != undefined) {
                if (query.proses == "Ya") {
                    prosesQuery = {
                        "isReprocess": true
                    };
                } else {
                    prosesQuery = {
                        "isReprocess": { $ne: true }
                    };
                }

            }
            var date = {
                "_createdDate": {
                    "$gte": (!query || !query.sdate ? (new Date("1900-01-01")) : (new Date(`${query.sdate} 00:00:00`))),
                    "$lte": (!query || !query.edate ? (new Date()) : (new Date(`${query.edate} 23:59:59`)))
                }
            };
            var Query = { "$and": [date, processTypeQuery, orderTypeQuery, orderQuery, deletedQuery, prosesQuery] };
            this.collection
                .aggregate([
                    { $match: Query },
                    {
                        $project: {
                            "_createdDate": 1,
                            "orderNo": "$productionOrder.orderNo",
                            "orderType": "$productionOrder.orderType.name",
                            "processType": "$productionOrder.processType.name",
                            "color": "$selectedProductionOrderDetail.colorRequest",
                            "handfeelStandard": "$productionOrder.handlingStandard",
                            "finishWidth": "$productionOrder.finishWidth",
                            "material": "$productionOrder.material.name",
                            "construction": "$productionOrder.materialConstruction.name",
                            "yarnNumber": "$productionOrder.yarnMaterial.name",
                            "grade": "$grade",
                            "cartNumber": "$cart.cartNumber",
                            "length": "$cart.qty",
                            "pcs": "$cart.pcs",
                            "uom": "$productionOrder.uom.unit",
                            "isReprocess": "$isReprocess",
                            "isComplete": 1,
                            "currentStepIndex": 1,
                            "steps": "$instruction.steps"
                        }
                    },
                    { $sort: { "_createdDate": -1 } }
                ])
                .toArray(function (err, result) {
                    assert.equal(err, null);
                    resolve(result);
                })
        });
    }

    updateIsComplete(id, isInactive) {
        var now = new Date();
        var ticks = ((now.getTime() * 10000) + 621355968000000000);

        var data = {
            'isComplete': true,
            '_stamp': ticks.toString(16),
            '_updatedBy': this.user.username,
            '_updatedDate': now,
            '_updateAgent': 'manager'
        };

        if (isInactive) {
            data.isInactive = true;
        }

        return this.collection.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: data });
    }

    readVisualization(paging) {
        return this.read(paging)
            .then((result) => {
                var joinDailyOperations = result.data.map((kanban) => {
                    kanban.currentStepIndex = Math.floor(kanban.currentStepIndex);
                    var currentStep = kanban.instruction.steps[Math.abs(kanban.currentStepIndex === kanban.instruction.steps.length ? kanban.currentStepIndex - 1 : kanban.currentStepIndex)];
                    var kanbanCurrentStepId = kanban.instruction && kanban.instruction.steps.length > 0 && currentStep && currentStep._id ? currentStep._id : null;

                    if (ObjectId.isValid(kanbanCurrentStepId)) {
                        var getDailyOperations;
                        if (kanban.currentStepIndex != kanban.instruction.steps.length) {
                            getDailyOperations = this.dailyOperationCollection.find({
                                "kanban.code": kanban.code,
                                "step._id": kanbanCurrentStepId,
                                _deleted: false,
                                type: "input",
                                "kanban.currentStepIndex": kanban.currentStepIndex
                            }, {
                                    "machine.name": 1,
                                    "input": 1,
                                    "step.process": 1,
                                    "step.processArea": 1,
                                    "step.deadline": 1
                                }).toArray();
                        }
                        else {
                            getDailyOperations = Promise.resolve([]);
                        }

                        return new Promise((resolve, reject) => {
                            getDailyOperations.then((dailyOperations) => {
                                var arr = [];
                                if (dailyOperations.length > 0) {
                                    arr = dailyOperations.map((dailyOperation) => {
                                        var obj = {
                                            code: kanban.code,
                                            dailyOperationMachine: dailyOperation.machine && dailyOperation.machine.name ? dailyOperation.machine.name : null,
                                            inputQuantity: dailyOperation.input ? dailyOperation.input : null,
                                            process: dailyOperation.step ? dailyOperation.step.process : null,
                                            processArea: dailyOperation.step ? dailyOperation.step.processArea : null,
                                            deadline: dailyOperation.step ? dailyOperation.step.deadline : null,
                                            stepsLength: kanban.instruction && kanban.instruction.steps ? kanban.instruction.steps.length : 0,
                                            currentStepIndex: kanban.currentStepIndex,
                                            cart: {
                                                cartNumber: kanban.cart ? kanban.cart.cartNumber : null
                                            },
                                            productionOrder: {
                                                orderNo: kanban.productionOrder ? kanban.productionOrder.orderNo : null,
                                                salesContractNo: kanban.productionOrder ? kanban.productionOrder.salesContractNo : null,
                                                deliveryDate: kanban.productionOrder ? kanban.productionOrder.deliveryDate : null,
                                                buyer: {
                                                    name: kanban.productionOrder && kanban.productionOrder.buyer ? kanban.productionOrder.buyer.name : null
                                                },
                                                orderQuantity: kanban.productionOrder ? kanban.productionOrder.orderQuantity : null,
                                            },
                                            type: "Input"
                                        };

                                        return obj;
                                    });

                                    resolve(arr);
                                }
                                else if (kanban.currentStepIndex != 0) {
                                    let currStepIndex = kanban.currentStepIndex - 1;
                                    let currStep = kanban.instruction.steps[currStepIndex];
                                    let kanbanCurrStepId = kanban.instruction && kanban.instruction.steps.length > 0 && currStep && currStep._id ? currStep._id : null;

                                    if (ObjectId.isValid(kanbanCurrStepId)) {
                                        var getDailyOp = this.dailyOperationCollection.find({
                                            "kanban.code": kanban.code,
                                            "step._id": kanbanCurrStepId,
                                            _deleted: false,
                                            type: "output",
                                            "kanban.currentStepIndex": currStepIndex
                                        }, {
                                                "machine.name": 1,
                                                "goodOutput": 1,
                                                "badOutput": 1,
                                                "step.process": 1,
                                                "step.processArea": 1,
                                                "step.deadline": 1
                                            }).toArray();

                                        getDailyOp.then((dailyOps) => {
                                            arr = dailyOps.map((dailyOp) => {
                                                var ob = {
                                                    code: kanban.code,
                                                    dailyOperationMachine: dailyOp.machine && dailyOp.machine.name ? dailyOp.machine.name : null,
                                                    goodOutput: dailyOp.goodOutput ? dailyOp.goodOutput : null,
                                                    badOutput: dailyOp.badOutput ? dailyOp.badOutput : null,
                                                    process: dailyOp.step ? dailyOp.step.process : null,
                                                    processArea: dailyOp.step ? dailyOp.step.processArea : null,
                                                    deadline: dailyOp.step ? dailyOp.step.deadline : null,
                                                    stepsLength: kanban.instruction && kanban.instruction.steps ? kanban.instruction.steps.length : 0,
                                                    currentStepIndex: kanban.currentStepIndex,
                                                    cart: {
                                                        cartNumber: kanban.cart ? kanban.cart.cartNumber : null
                                                    },
                                                    productionOrder: {
                                                        orderNo: kanban.productionOrder ? kanban.productionOrder.orderNo : null,
                                                        salesContractNo: kanban.productionOrder ? kanban.productionOrder.salesContractNo : null,
                                                        deliveryDate: kanban.productionOrder ? kanban.productionOrder.deliveryDate : null,
                                                        buyer: {
                                                            name: kanban.productionOrder && kanban.productionOrder.buyer ? kanban.productionOrder.buyer.name : null
                                                        },
                                                        orderQuantity: kanban.productionOrder ? kanban.productionOrder.orderQuantity : null,
                                                    },
                                                    type: "Output"
                                                };

                                                return ob;
                                            });

                                            resolve(arr);
                                        });
                                    }
                                    else
                                        resolve([]);
                                }
                                else
                                    resolve([]);
                            });
                        });
                    }
                });

                return Promise.all(joinDailyOperations)
                    .then(((joinDailyOperation) => {
                        result.data = [].concat.apply([], joinDailyOperation);
                        return result;
                    }));
            });
    }


    getMachineQueueReport(query) {
        return new Promise((resolve, reject) => {
            moment.locale("id");

            let data = {};

            let SPP_FIELDS = {
                "orderNo": 1
            };

            let SPP_FILTER = {
                _deleted: false,
                isClosed: false
            };

            if (query.orderType != "") {
                switch (query.orderType) {
                    case "WHITE": {
                        SPP_FILTER["orderType.name"] = "SOLID";
                        SPP_FILTER["processType.name"] = query.orderType;
                        break;
                    }
                    case "DYEING": {
                        SPP_FILTER["orderType.name"] = "SOLID";
                        SPP_FILTER["processType.name"] = { "$ne": "WHITE" };
                        break;
                    }
                    default: {
                        SPP_FILTER["orderType.name"] = query.orderType;
                        break;
                    }
                }
            }

            this.productionOrderManager.collection
                .find(SPP_FILTER, SPP_FIELDS)
                .toArray()
                .then((productionOrders) => {
                    let orderNo = productionOrders.map((obj) => obj.orderNo);
                    let KANBAN_FIELDS = {
                        "currentStepIndex": 1,
                        "code": 1,
                        "cart.qty": 1,
                        "instruction.steps.machine.name": 1,
                        "instruction.steps.deadline": 1,
                        "instruction.steps._id": 1,
                        "productionOrder.deliveryDate": 1,
                        "productionOrder.orderType.name": 1
                    };

                    let KANBAN_FILTER = {
                        _deleted: false,
                        isComplete: false,
                        "productionOrder.orderNo": { "$in": orderNo },
                        "instruction.steps.deadline": {
                            "$exists": true
                        }
                    };

                    if (query.machine) {
                        KANBAN_FILTER["instruction.steps.machine.name"] = query.machine;
                    }

                    this.collection
                        .find(KANBAN_FILTER, KANBAN_FIELDS)
                        .toArray()
                        .then((kanbans) => {
                            let promises = kanbans.map((kanban) => {
                                if (kanban.currentStepIndex != kanban.instruction.steps.length) {
                                    let currentStep = kanban.instruction.steps[kanban.currentStepIndex];
                                    let steps = kanban.instruction.steps.slice(kanban.currentStepIndex + 1, kanban.instruction.steps.length); /* Ambil semua step di atas Current Step Index */
                                    // let 
                                    // if (steps.length > 0) {
                                    //     console.log();
                                    // }
                                    let orderType = kanban.productionOrder.orderType.name;

                                    for (let step of steps) {
                                        if (step.deadline && step.machine) {
                                            let month = moment(step.deadline).format("MMM");
                                            let year = moment(step.deadline).format("YYYY");
                                            let machineName = step.machine.name;

                                            if (year === query.year) {
                                                if (!data[machineName + orderType]) {
                                                    data[machineName + orderType] = {
                                                        machine: machineName, orderType: orderType,
                                                        Jan: 0, Feb: 0, Mar: 0, Apr: 0,
                                                        Mei: 0, Jun: 0, Jul: 0, Ags: 0,
                                                        Sep: 0, Okt: 0, Nov: 0, Des: 0
                                                    };
                                                }
                                                data[machineName + orderType][month] += kanban.cart.qty;
                                            }
                                        }
                                    }

                                    if (query.machine) {
                                        if (!currentStep.machine || currentStep.machine.name !== query.machine)
                                            return Promise.resolve();
                                    }


                                    let DAILY_OPERATION_FIELDS = {
                                        code: 1
                                    };

                                    let DAILY_OPERATION_FILTER = {
                                        _deleted: false,
                                        "kanban.code": kanban.code,
                                        "step._id": currentStep._id,
                                        type: "input",
                                        "kanban.currentStepIndex": kanban.currentStepIndex
                                    };

                                    return this.dailyOperationCollection
                                        .findOne(DAILY_OPERATION_FILTER, DAILY_OPERATION_FIELDS)
                                        .then((result) => {
                                            if (!result && currentStep.machine && currentStep.deadline) {
                                                let month = moment(currentStep.deadline).format("MMM");
                                                let year = moment(currentStep.deadline).format("YYYY");

                                                if (year === query.year) {
                                                    if (!data[currentStep.machine.name + orderType]) {
                                                        data[currentStep.machine.name + orderType] = {
                                                            machine: currentStep.machine.name, orderType: orderType,
                                                            Jan: 0, Feb: 0, Mar: 0, Apr: 0,
                                                            Mei: 0, Jun: 0, Jul: 0, Ags: 0,
                                                            Sep: 0, Okt: 0, Nov: 0, Des: 0
                                                        };
                                                    }

                                                    data[currentStep.machine.name + orderType][month] += kanban.cart.qty;
                                                }
                                            }

                                            return Promise.resolve();
                                        });
                                }
                                else
                                    return Promise.resolve();
                            });

                            Promise.all(promises)
                                .then(() => {
                                    let resultData = [];
                                    let propertyNames = Object.getOwnPropertyNames(data);
                                    for (let i = 0; i < propertyNames.length; i++) {
                                        let d = data[propertyNames[i]];
                                        d.total = d.Jan + d.Feb + d.Mar + d.Apr + d.Mei + d.Jun + d.Jul + d.Ags + d.Sep + d.Okt + d.Nov + d.Des;
                                        resultData.push(data[propertyNames[i]]);
                                    }

                                    if (query.machine) {
                                        resultData = resultData.filter((r) => r.machine === query.machine);
                                    }

                                    resolve(resultData);
                                });
                        });
                });
        });
    }

    getMachineQueueXls(result) {
        let xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        let index = 1;

        for (let data of result.data) {
            let item = {};

            item["No"] = index++;
            item["Jenis Order"] = data.orderType;
            item["Mesin"] = data.machine;
            item["Jumlah (M)"] = data.total;
            item["Januari"] = data.Jan;
            item["Februari"] = data.Feb;
            item["Maret"] = data.Mar;
            item["April"] = data.Apr;
            item["Mei"] = data.Mei;
            item["Juni"] = data.Jun;
            item["Juli"] = data.Jul;
            item["Agustus"] = data.Ags;
            item["September"] = data.Sep;
            item["Oktober"] = data.Okt;
            item["November"] = data.Nov;
            item["Desember"] = data.Des;

            xls.data.push(item);
        }

        xls.data.push({
            "No": "", "Jenis Order": "", "Mesin": "Total", "Jumlah (M)": this.sumMachineQueueMonth(result.data, "total"),
            "Januari": this.sumMachineQueueMonth(result.data, "Jan"), "Februari": this.sumMachineQueueMonth(result.data, "Feb"), "Maret": this.sumMachineQueueMonth(result.data, "Mar"), "April": this.sumMachineQueueMonth(result.data, "Apr"),
            "Mei": this.sumMachineQueueMonth(result.data, "Mei"), "Juni": this.sumMachineQueueMonth(result.data, "Jun"), "Juli": this.sumMachineQueueMonth(result.data, "Jul"), "Agustus": this.sumMachineQueueMonth(result.data, "Ags"),
            "September": this.sumMachineQueueMonth(result.data, "Sep"), "Oktober": this.sumMachineQueueMonth(result.data, "Okt"), "November": this.sumMachineQueueMonth(result.data, "Nov"), "Desember": this.sumMachineQueueMonth(result.data, "Des")
        });

        xls.options["No"] = "number";
        xls.options["Jenis Order"] = "string";
        xls.options["Mesin"] = "string";
        xls.options["Jumlah (M)"] = "number";
        xls.options["Januari"] = "number";
        xls.options["Februari"] = "number";
        xls.options["Maret"] = "number";
        xls.options["April"] = "number";
        xls.options["Mei"] = "number";
        xls.options["Juni"] = "number";
        xls.options["Juli"] = "number";
        xls.options["Agustus"] = "number";
        xls.options["September"] = "number";
        xls.options["Oktober"] = "number";
        xls.options["November"] = "number";
        xls.options["Desember"] = "number";

        xls.name = `Laporan Order Belum Diproduksi Mesin.xlsx`;

        return Promise.resolve(xls);
    }

    sumMachineQueueMonth(data, field) {
        let sum = 0;

        for (let d of data) {
            sum += d[field];
        }

        return sum;
    }
};