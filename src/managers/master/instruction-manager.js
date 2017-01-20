'use strict';

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Instruction = DLModels.master.Instruction;
var ProductManager = require('../master/product-manager');
var ColorTypeManager = require('../master/color-type-manager');
var OrderTypeManager = require('../master/order-type-manager');
var assert = require('assert');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

module.exports = class InstructionManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Instruction);
        this.productManager = new ProductManager(db, user);
        this.colorTypeManager = new ColorTypeManager(db, user);
        this.orderTypeManager = new OrderTypeManager(db, user);
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
            var nameFilter = {
                "name": {
                    "$regex": regex
                }
            };
            var orderFilter = {
                "orderType.name": {
                    "$regex": regex
                }
            };
            var materialFilter = {
                "material.name": {
                    "$regex": regex
                }
            };
            var constructionFilter = {
                "construction": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [nameFilter, orderFilter, materialFilter, constructionFilter];

        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(instruction) {
        var errors = {};
        var valid = instruction;
        // 1. begin: Declare promises.
        var getInstructionPromise = Promise.resolve(null);
        if(valid.orderType){
            if(valid.orderType.name){
                if(valid.orderType.name == "Yarn Dyed" || valid.orderType.name == "Printing"){
                    var getInstructionPromise = this.collection.singleOrDefault({
                        _id: {
                            "$ne": new ObjectId(valid._id)
                        },
                        _deleted : false,
                        name: valid.name,
                        materialId      :valid.material ? new ObjectId(valid.material._id) : '',
                        construction    :valid.construction ? valid.construction : '',
                        orderTypeId     :valid.orderType ? new ObjectId(valid.orderType._id) : ''
                    });
                }else{
                    var getInstructionPromise = this.collection.singleOrDefault({
                        _id: {
                            "$ne": new ObjectId(valid._id)
                        },
                        _deleted : false,
                        name: valid.name,
                        materialId      :valid.material && ObjectId.isValid(valid.material._id) ? new ObjectId(valid.material._id) : '',
                        construction    :valid.construction ? valid.construction : '',
                        orderTypeId     :valid.orderType && ObjectId.isValid(valid.orderType._id) ? new ObjectId(valid.orderType._id) : '',
                        colorTypeId     :valid.colorType && ObjectId.isValid(valid.colorType._id) ? new ObjectId(valid.colorType._id) : ''
                    });
                }
            }
        }
        var getProduct = valid.material && ObjectId.isValid(valid.material._id) ? this.productManager.getSingleByIdOrDefault(new ObjectId(valid.material._id)) : Promise.resolve(null);
        var getOrderType = valid.orderType && ObjectId.isValid(valid.orderType._id) ? this.orderTypeManager.getSingleByIdOrDefault(new ObjectId(valid.orderType._id)) : Promise.resolve(null);
        var getColorType = valid.colorType && ObjectId.isValid(valid.colorType._id) ? this.colorTypeManager.getSingleByIdOrDefault(new ObjectId(valid.colorType._id)) : Promise.resolve(null);
        return Promise.all([getInstructionPromise, getProduct, getOrderType, getColorType])
            .then(results => {
                var _instruction = results[0];
                var _product = results[1];
                var _orderType = results[2];
                var _colorType = results[3];

                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("Instruction.name.isRequired:%s is required", i18n.__("Instruction.name._:Name")); // "Nama harus diisi";
                else if (_instruction) 
                    errors["name"] = i18n.__("Instruction.name.isExists:%s with same order type, construction and material is already exists", i18n.__("Instruction.name._:Name")); //"Nama sudah ada";
                    
                if (!valid.materialId || valid.materialId.toString() == "")
                    errors["material"] = i18n.__("Instruction.material.isRequired:%s is required", i18n.__("Instruction.material._:Material")); // "Material harus diisi";
                else if(!_product)
                    errors["material"] = i18n.__("Instruction.material.isRequired:%s is required", i18n.__("Instruction.material._:Material")); // "Material harus diisi";
                else if(_instruction)
                    errors["material"] = i18n.__("Instruction.material.isExists:%s with same name, order type and construction is already exists", i18n.__("Instruction.material._:Material"));//"Material sudah ada";


                if (!valid.construction || valid.construction == "")
                    errors["construction"] = i18n.__("Instruction.construction.isRequired:%s is required", i18n.__("Instruction.construction._:Construction")); // "Construction harus diisi";
                else if(_instruction)
                    errors["construction"] = i18n.__("Instruction.construction.isExists:%s with same name, order type and material is already exists", i18n.__("Instruction.construction._:Construction")); // "Construction sudah ada";
                

                if (!valid.orderTypeId || valid.orderTypeId.toString() == "")
                    errors["orderType"] = i18n.__("Instruction.orderType.isRequired:%s is required", i18n.__("Instruction.orderType._:OrderType")); // "Tipe order harus diisi";
                else if(!_orderType)
                    errors["orderType"] = i18n.__("Instruction.orderType.isRequired:%s is required", i18n.__("Instruction.orderType._:OrderType")); // "Tipe order harus diisi";
                else if(_instruction)
                    errors["orderType"] = i18n.__("Instruction.orderType.isExists:%s with same name, material and construction is already exists", i18n.__("Instruction.orderType._:OrderType")); // "Tipe Order sudah ada";
                
                if(!valid.steps || valid.steps.length < 1)
                    errors["steps"] = i18n.__("Instruction.steps.isRequired:%s is required", i18n.__("Instruction.steps._:Steps")); //"minimal harus ada 1 Step";
                
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                if(_product){
                    valid.material = _product;
                    valid.materialId = new ObjectId(_product._id);
                }
                if(_orderType){
                    valid.orderType = _orderType;
                    valid.orderTypeId= new ObjectId(_orderType._id);
                }
                if(_colorType){
                    valid.colorType = _colorType;
                    valid.colorTypeId = new ObjectId(_colorType._id);
                }else{
                    valid.colorType = null;
                    valid.colorTypeId = null;
                }

                valid = new Instruction(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);

            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Instruction}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };
        return this.collection.createIndexes([dateIndex]);
    }

    getMaterial(key,query){
        return new Promise((resolve, reject) => {
            var regex=new RegExp(key,"i");
            this.collection.aggregate(
                                [{
                                    $match: {
                                        $and:[{
                                        $and: [{
                                            "orderTypeId": new ObjectId(query)
                                        }, {
                                            "_deleted": false
                                        }]
                                    },{
                                            "material.name": {
                                                "$regex": regex
                                            }
                                        }]
                                    }

                                }, {
                                    $group: {
                                        _id: {name: "$material.name", _id:"$material._id"}
                                    }
                                }]
                            )
                            .toArray(function(err, result) {
                                assert.equal(err, null);
                                resolve(result);
                            });
        }
    )}

    getConstruction(key,orderId,materialId){
        return new Promise((resolve, reject) => {
            var regex=new RegExp(key,"i");
            this.collection.aggregate(
                    [{
                        $match: {
                            $and:[{
                                $and: [{
                                    $and:[{
                                        "orderTypeId": new ObjectId(orderId)
                                    },{
                                        "materialId" :new ObjectId(materialId)
                                    }]
                                    
                                }, {
                                    "_deleted": false
                                }]
                        },{
                                "construction": {
                                    "$regex": regex
                                }
                            }]
                        }

                    }, {
                        $group: {
                            _id: "$construction"
                        }
                    }]
                )
                .toArray(function(err, result) {
                    assert.equal(err, null);
                    resolve(result);
                });
            });
    }
};

