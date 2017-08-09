"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var BadOutputReason = DLModels.master.BadOutputReason;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var CodeGenerator = require("../../utils/code-generator");
var MachineManager = require('./machine-manager');

module.exports = class BadOutputReasonManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.BadOutputReason);
        this.machineManager = new MachineManager(db, user);
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
            var keywordFilter = {
                "reason": {
                    "$regex": regex
                }
            };
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = !data.code ? generateCode() : data.code;
        data._createdDate = new Date();
        return Promise.resolve(data);
    }

    _validate(badOutputReason) {
        var errors = {};
        var valid = badOutputReason;
        // 1. begin: Declare promises.
        var getReasonPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            reason: valid.reason
        });
        var getMachine = [];
        for(var machine of valid.machines || []){
            if(machine.hasOwnProperty("_id")){
                if (ObjectId.isValid(machine._id)){
                    getMachine.push(this.machineManager.getSingleByIdOrDefault(new ObjectId(machine._id)));
                }
            }
        }
        // 2. begin: Validation.
        return Promise.all([getReasonPromise].concat(getMachine))
            .then(results => {
                var _reason = results[0];
                var _machine = results.slice(1, results.length) || [];

                if (!valid.reason || valid.reason == '')
                    errors["reason"] = i18n.__("BadOutputReason.reason.isRequired:%s is required", i18n.__("BadOutputReason.reason._:Reason")); //"Keterangan Harus diisi";
                if(_reason)
                    errors["reason"] = i18n.__("BadOutputReason.reason.isExist:%s is already exist", i18n.__("BadOutputReason.reason._:Reason")); //"Keterangan Harus diisi";

                if(!valid.machines || valid.machines.length < 1)
                    errors["machines"] = i18n.__("BadOutputReason.machines.isRequired:%s is required", i18n.__("BadOutputReason.machines._:Machines")); //"Mesin Harus diisi";
                else{
                    var itemErrors = [];
                    var valueArr = valid.machines.map(function (item) { return item._id.toString() });

                    var itemDuplicateErrors = new Array(valueArr.length);
                    valueArr.some(function (item, idx) {
                        var itemError = {};
                        if (valueArr.indexOf(item) != idx) {
                            itemError["name"] = i18n.__("BadOutputReason.machines.name.isDuplicate:%s is duplicate", i18n.__("BadOutputReason.machines.name._:Name")); //"Nama barang tidak boleh kosong";
                        }
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            itemDuplicateErrors[valueArr.indexOf(item)] = itemError;
                            itemDuplicateErrors[idx] = itemError;
                        } else {
                            itemDuplicateErrors[idx] = itemError;
                        }
                    });
                    for(var data of valid.machines){
                        var itemError = {};
                        function searchItem(params) {
                            return !params ? null : params.code === data.code;
                        }
                        var machine = _machine.find(searchItem);
                        var _index = valid.machines.indexOf(data);
                        if(!machine)
                            itemError["name"] = i18n.__("BadOutputReason.machines.name.isNotFound:%s is not found", i18n.__("BadOutputReason.machines.name._:Name")); //Mesin tidak ditemukan
                        else if (Object.getOwnPropertyNames(itemDuplicateErrors[_index]).length > 0){
                            itemError["name"] = itemDuplicateErrors[_index].name;
                        }
                        itemErrors.push(itemError);
                    }
                    for (var itemError of itemErrors) {
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            errors["machines"] = itemErrors;
                            break;
                        }
                    }
                }
                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                valid.machines = _machine;

                valid = new BadOutputReason(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.BadOutputReason}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var reasonIndex = {
            name: `ix_${map.master.collection.BadOutputReason}_reason`,
            key: {
                reason: 1
            }
        }

        return this.collection.createIndexes([dateIndex, reasonIndex]);
    }
}