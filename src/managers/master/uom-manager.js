'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Uom = DLModels.master.Uom;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

module.exports = class UomManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.uom);
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
            var unitFilter = {
                'unit': {
                    '$regex': regex
                }
            };
            keywordFilter['$or'] = [unitFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(uom) {
        var errors = {};
        var valid = uom;
        // 1. begin: Declare promises.
        var getUomPromise = (valid.unit || "").trim().length > 0 ? this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            unit: valid.unit
        }) : Promise.resolve(null);


        // 2. begin: Validation.
        return Promise.all([getUomPromise])
            .then(results => {
                var _uom = results[0];

                if (!valid.unit || valid.unit == '')
                    errors["unit"] = i18n.__("Uom.unit.isRequired:%s is required", i18n.__("Uom.unit._:Unit")); //"Satuan Tidak Boleh Kosong";
                else if (_uom) {
                    errors["unit"] = i18n.__("Uom.unit.isExists:%s is already exists", i18n.__("Uom.unit._:Unit")); //"Satuan sudah terdaftar";
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid = new Uom(uom);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    getUOM() {
        return new Promise((resolve, reject) => {
            var query = {
                _deleted: false
            };

            this.collection
                .where(query)
                .execute()
                .then(uoms => {
                    resolve(uoms);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }



    insert(dataFile) {
        return new Promise((resolve, reject) => {
            var uom;
            this.getUOM()
                .then(results => {
                    uom = results.data;
                    var data = [];
                    if (dataFile != "") {
                        for (var i = 1; i < dataFile.length; i++) {
                            data.push({ "unit": dataFile[i][0].trim() });
                        }
                    }
                    var dataError = [], errorMessage;
                    for (var i = 0; i < data.length; i++) {
                        errorMessage = "";
                        if (data[i]["unit"] === "" || data[i]["unit"] === undefined) {
                            errorMessage = errorMessage + "Unit tidak boleh kosong, ";
                        } else {
                            for (var j = 0; j < uom.length; j++) {
                                if ((uom[j]["unit"]).toLowerCase() === (data[i]["unit"]).toLowerCase()) {
                                    errorMessage = errorMessage + "Unit tidak boleh duplikat";
                                }
                            }
                        }
                        if (errorMessage !== "") {
                            dataError.push({ "unit": data[i]["unit"], "Error": errorMessage });
                        }
                    }
                    if (dataError.length === 0) {
                        var newUOM = [];
                        for (var i = 0; i < data.length; i++) {
                            var valid = new Uom(data[i]);
                            valid.stamp(this.user.username, 'manager');
                            this.collection.insert(valid)
                                .then(id => {
                                    this.getSingleById(id)
                                        .then(resultItem => {
                                            newUOM.push(resultItem)
                                            resolve(newUOM);
                                        })
                                        .catch(e => {
                                            reject(e);
                                        });
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        }
                    }
                    else {
                        resolve(dataError);
                    }
                })
        })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.uom}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var unitIndex = {
            name: `ix_${map.master.collection.uom}_unit`,
            key: {
                unit: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, unitIndex]);
    }

}
