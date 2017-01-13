'use strict'

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
            var orderTypeFilter = {
                "orderType.name": {
                    "$regex": regex
                }
            };
            var colorTypeFilter = {
                "colorType.name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [materialFilter, constructionFilter, orderTypeFilter, colorTypeFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(instruction) {
        var errors = {};
        var valid = instruction;
        // 1. begin: Declare promises.
        var getInstructionPromise = this.collection.singleOrDefault({
            _id: {
                '$ne'   : new ObjectId(valid._id)
            },
            materialId      :new ObjectId(valid.materialId),
            construction    :valid.construction,
            orderTypeId     :new ObjectId(valid.orderTypeId),
            colorTypeId     :new ObjectId(valid.colorTypeId)
        });

        var getProduct = ObjectId.isValid(valid.materialId) ? this.productManager.getSingleByIdOrDefault(new ObjectId(valid.materialId)) : Promise.resolve(null);
        var getColor = ObjectId.isValid(valid.colorTypeId) ? this.colorTypeManager.getSingleByIdOrDefault(new ObjectId(valid.colorTypeId)) : Promise.resolve(null);
        var getOrder = ObjectId.isValid(valid.orderTypeId) ? this.orderTypeManager.getSingleByIdOrDefault(new ObjectId(valid.orderTypeId)) : Promise.resolve(null);
        

        // 2. begin: Validation.
        return Promise.all([getInstructionPromise,getProduct, getColor, getOrder])
            .then(results => {
                var _instruction = results[0];
                var _material=results[1];
                var _color = results[2];
                var _order = results[3];

                if (_instruction) {
                    errors["materialId"] = i18n.__("Instruction.materialId.isAlreadyExists:%s is exists", i18n.__("Instruction.materialId._:Material"));
                    errors["construction"] = i18n.__("Instruction.construction.isAlreadyExists:%s is exists", i18n.__("Instruction.construction._:Construction"));
                    errors["orderTypeId"] = i18n.__("Instruction.orderTypeId.isAlreadyExists:%s is exists", i18n.__("Instruction.orderTypeId._:OrderType"));
                    errors["colorTypeId"] = i18n.__("Instruction.colorTypeId.isAlreadyExists:%s is exists", i18n.__("Instruction.colorTypeId._:ColorType"));
                }
                else {
                    if (!_material)
                        errors["materialId"] = i18n.__("Instruction.material.isRequired:%s is not exsists", i18n.__("Instruction.material._:Material")); //"Material Tidak Boleh Kosong";
                    
                    if (!valid.construction || valid.construction=="")
                        errors["construction"] = i18n.__("Instruction.construction.isRequired:%s is not exsists", i18n.__("Instruction.construction._:Construction")); //"construction Tidak Boleh Kosong";
                    
                    if (!_order)
                        errors["orderTypeId"] = i18n.__("Instruction.orderType.isRequired:%s is not exsists", i18n.__("Instruction.orderType._:OrderType")); //"orderType Tidak Boleh Kosong";
                    
                    if (!_color)
                        errors["colorTypeId"] = i18n.__("Instruction.colorType.isRequired:%s is not exsists", i18n.__("Instruction.colorType._:ColorType")); //"colorType Tidak Boleh Kosong";
                    

                    if (!valid.steps || valid.steps.length<=0)
                        errors["steps"] = i18n.__("Instruction.steps.isRequired:%s is required", i18n.__("Instruction.steps._:Steps")); //"steps Tidak Boleh Kosong";
                }
                
                valid.materialId =new ObjectId(valid.materialId);
                valid.orderTypeId=new ObjectId(valid.orderTypeId);
                valid.colorTypeId=new ObjectId(valid.colorTypeId);

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
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

        var nameIndex = {
            name: `ix_${map.master.collection.Instruction}_material_construction_orderType_colorType`,
            key: {
                materialId: 1,
                construction: 1,
                orderTypeId: 1,
                colorTypeId:1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, nameIndex]);
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
    }
        )}
}

