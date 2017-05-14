"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var generateCode = require("../../../utils/code-generator");

var PackingManager = require('../../production/finishing-printing/packing-manager');

var Models = require("dl-models");
var Map = Models.map;
var PackingReceiptModel = Models.inventory.finishingPrinting.FPPackingReceipt;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require("moment");

module.exports = class FPPackingReceiptManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.inventory.finishingPrinting.collection.FPPackingReceipt);

        this.packingManager = new PackingManager(db, user);
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
            var packingCodeFilter = {
                "packingCode": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [packingCodeFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        return Promise.resolve(data);
    }

    _validate(packingReceipt) {
        var errors = {};
        var valid = packingReceipt;

        var getDbPackingReceipt = this.collection.singleOrDefault({
            _id: new ObjectId(valid._id)
        });
        var getDuplicatePackingReceipt = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });
        var getPacking = valid.packingId && ObjectId.isValid(valid.packingId) ? this.packingManager.getSingleByIdOrDefault(valid.packingId) : Promise.resolve(null);

        return Promise.all([getDbPackingReceipt, getDuplicatePackingReceipt, getPacking])
            .then(results => {
                var _dbPackingReceipt = results[0];
                var _duplicatePackingReceipt = results[1];
                var _packing = results[2];

                if (_dbPackingReceipt)
                    valid.code = _dbPackingReceipt.code; // prevent code changes.

                if (_duplicatePackingReceipt)
                    errors["code"] = i18n.__("PackingReceipt.code.isExist: %s is exist", i18n.__("PackingReceipt.code._:Code"));

                if (!valid.packingId || valid.packingId === '')
                    errors["packingId"] = i18n.__("PackingReceipt.packingId.isRequired:%s is required", i18n.__("PackingReceipt.packingId._:Packing")); //"Grade harus diisi";   
                else if (!_packing)
                    errors["packingId"] = i18n.__("PackingReceipt.packingId: %s not found", i18n.__("PackingReceipt.KanbanId._:Packing"));

                if (!valid.date)
                    errors["date"] = i18n.__("PackingReceipt.date.isRequired:%s is required", i18n.__("PackingReceipt.date._:Date")); //"Grade harus diisi";

                if (!valid.accepted && !valid.declined) {
                    errors["accepted"] = i18n.__("PackingReceipt.accepted.isRequired:%s is required", i18n.__("PackingReceipt.accepted._:Accepted")); //"Grade harus diisi";   
                    errors["declined"] = i18n.__("PackingReceipt.declined.isRequired:%s is required", i18n.__("PackingReceipt.declined._:Declined")); //"Grade harus diisi";   
                } 

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }


                valid.packingId = _packing._id; 
                valid.packingCode = _packing.code; 

                valid.buyer = _packing.buyer;
                valid.productionOrderNo = _packing.productionOrderNo;
                valid.colorName = _packing.colorName;
                valid.construction = _packing.construction;
                  
                if (!valid.stamp) {
                    valid = new PackingReceiptModel(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);


            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.inventory.finishingPrinting.collection.PackingReceipt}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var codeIndex = {
            name: `ix_${Map.inventory.finishingPrinting.collection.PackingReceipt}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
};
