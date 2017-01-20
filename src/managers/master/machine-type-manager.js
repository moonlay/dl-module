'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var MachineType = DLModels.master.MachineType;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var CodeGenerator = require('../../utils/code-generator');


module.exports = class MachineTypeManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.master.type.MachineType);

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
            var codeFilter = {
                'code': {
                    '$regex': regex
                }
            };
            var nameFilter = {
                'name': {
                    '$regex': regex
                }
            };

            keywordFilter['$or'] = [codeFilter, nameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = CodeGenerator();
        return Promise.resolve(data);
    }

    _validate(machineType) {
        var errors = {};
        var valid = machineType;
        // 1. begin: Declare promises.
        var getMachineTypePromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code,
        });

        // valid.name = valid.name instanceof String;
        // valid.description = valid.description instanceof String ? valid.description : "";
        valid.name = valid.name ? valid.name : "";
        valid.description = valid.description ? valid.description : "";
        valid.indicators = valid.indicators instanceof Array ? valid.indicators : [];





        // 2. begin: Validation.
        return Promise.all([getMachineTypePromise])
            .then(results => {
                var _machineType = results[0];

                if (_machineType)
                    errors["code"] = i18n.__("MachineType.code.isExists:%s is exists", i18n.__("MachineType.code._:Code"));

                if (!valid.name || valid.name == "" || valid.name == "undefined")
                    errors["name"] = i18n.__("MachineType.name.isRequired:%s is required", i18n.__("MachineType.name._:Name")); //"name tidak boleh kosong";

                if (!valid.description || valid.description == "" || valid.description == "undefined")
                    errors["description"] = i18n.__("MachineType.description.isRequired:%s is required", i18n.__("MachineType.description._:Description")); //"description tidak boleh kosong";

                // if (!valid.expectedDeliveryDate || valid.expectedDeliveryDate === "" || valid.expectedDeliveryDate === "undefined")
                //     valid.expectedDeliveryDate = "";

                if (valid.indicators && valid.indicators.length <= 0) {
                    errors["indicators"] = i18n.__("MachineType.indicators.isRequired:%s is required", i18n.__("MachineType.indicators._:Indicators")); //"Harus ada minimal 1 barang";

                    for (var indicator of valid.indicators) {
                        if (indicator.dataType == "number") {
                            indicator.value instanceof number ? valid.value : 0;
                        } else if (indicator.dataType == "string" || indicator.dataType == "option") {
                            indicator.value instanceof string ? valid.value : "";
                        }
                    }    
                }



                else {
                    var itemErrors = [];
                    var valueArr = valid.indicators.map(function (indicators) { return indicators.indicator });
                    var isDuplicate = valueArr.some(function (item, idx) {
                        var itemError = {};
                        if (valueArr.indexOf(item) != idx) {
                            itemError["indicator"] = i18n.__("MachineType.indicators.indicator.isDuplicate:%s is duplicate", i18n.__("MachineType.indicators.indicator._:indicator")); //"Nama indicator tidak boleh kosong";
                        }
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            itemErrors[valueArr.indexOf(item)] = itemError;
                            itemErrors[idx] = itemError;
                        }
                        return valueArr.indexOf(item) != idx
                    });
                    if (!isDuplicate) {
                        for (var indicator of valid.indicators) {
                            var itemError = {};
                            if (!indicator.indicator) {
                                itemError["indicator"] = i18n.__("MachineType.indicators.indicator.isRequired:%s is required", i18n.__("MachineType.indicators.indicator._:indicator")); //"indicator tidak boleh kosong";
                            }

                            if (Object.getOwnPropertyNames(itemError).length > 0) {
                                itemErrors.push(itemError);
                            }
                        }
                    }
                    if (itemErrors.length > 0)
                        errors.items = itemErrors;
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }


                if (!valid.stamp)
                    valid = new MachineType(valid);

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Machine}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Machine}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
};