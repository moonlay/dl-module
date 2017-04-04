'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Unit = DLModels.master.Unit;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var DivisionManager = require('./division-manager');

module.exports = class UnitManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Unit);
        this.divisionManager = new DivisionManager(db, user);
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
            var divisionNameFilter = {
                'division.name': {
                    '$regex': regex
                }
            };
            keywordFilter['$or'] = [codeFilter, nameFilter, divisionNameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(unit) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = unit;
            // 1. begin: Declare promises.
            var getUnitPromise = this.collection.singleOrDefault({
                _id: {
                    '$ne': new ObjectId(valid._id)
                },
                code: valid.code
            });
            var getDivision = ObjectId.isValid(valid.divisionId) ? this.divisionManager.getSingleByIdOrDefault(new ObjectId(valid.divisionId)) : Promise.resolve(null);

            // 2. begin: Validation.
            Promise.all([getUnitPromise, getDivision])
                .then(results => {
                    var _unit = results[0];
                    var _division = results[1];

                    if (!valid.code || valid.code == '')
                        errors["code"] = i18n.__("Unit.code.isRequired:%s is required", i18n.__("Unit.code._:Code")); // "Kode tidak boleh kosong.";
                    else if (_unit) {
                        errors["code"] = i18n.__("Unit.code.isExists:%s is already exists", i18n.__("Unit.code._:Code")); // "Kode sudah terdaftar.";
                    }

                    if (!_division)
                        errors["division"] = i18n.__("Unit.division.isRequired:%s is required", i18n.__("Unit.division._:Division")); //"Divisi Tidak Boleh Kosong";

                    if (!valid.name || valid.name == '')
                        errors["name"] = i18n.__("Unit.name.isRequired:%s is required", i18n.__("Unit.name._:Name")); //"Sub Divisi Tidak Boleh Kosong";


                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid = new Unit(unit);
                    valid.divisionId = _division._id;
                    valid.division = _division;

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }
    getUnit() {
        return new Promise((resolve, reject) => {
            var query = {
                _deleted: false
            };

            this.collection
                .where(query)
                .execute()
                .then(vats => {
                    resolve(vats);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    insert(dataFile) {
        return new Promise((resolve, reject) => {
            var unit;
            var div;
            this.getUnit()
                .then(results => {
                    this.divisionManager.getDivision()
                        .then(divisions => {
                            unit = results.data;
                            div = divisions.data;
                            var data = [];
                            if (dataFile != "") {
                                for (var i = 1; i < dataFile.length; i++) {
                                    data.push({
                                        "code": dataFile[i][0].trim(),
                                        "division": dataFile[i][1].trim(),
                                        "name": dataFile[i][2].trim(),
                                        "description": dataFile[i][3].trim()
                                    });
                                }
                            }
                            var dataError = [], errorMessage;
                            var flag = false;
                            for (var i = 0; i < data.length; i++) {
                                errorMessage = "";
                                if (data[i]["code"] === "" || data[i]["code"] === undefined) {
                                    errorMessage = errorMessage + "Kode tidak boleh kosong, ";
                                } else {
                                    for (var j = 0; j < div.length; j++) {
                                        if ((div[j]["name"]).toLowerCase() === (data[i]["division"]).toLowerCase()) {
                                            flag = true;
                                            break;
                                        }
                                    }
                                    if (flag === false) {
                                        errorMessage = errorMessage + "Divisi tidak terdaftar di Master Divisi";
                                    }
                                }
                                if (data[i]["division"] === "" || data[i]["division"] === undefined) {
                                    errorMessage = errorMessage + "Divisi tidak boleh kosong, ";
                                }
                                if (data[i]["name"] === "" || data[i]["name"] === undefined) {
                                    errorMessage = errorMessage + "Nama tidak boleh kosong, ";
                                }
                                for (var j = 0; j < unit.length; j++) {
                                    if (unit[j]["code"] === data[i]["code"]) {
                                        errorMessage = errorMessage + "Kode tidak boleh duplikat, ";
                                    }
                                    if (unit[j]["name"] === data[i]["name"]) {
                                        errorMessage = errorMessage + "Nama tidak boleh duplikat, ";
                                    }
                                }

                                if (errorMessage !== "") {
                                    dataError.push({ "code": data[i]["code"], "division": data[i]["division"], "name": data[i]["name"], "description": data[i]["description"], "Error": errorMessage });
                                }
                            }
                            if (dataError.length === 0) {
                                var newUnit = [];
                                for (var i = 0; i < data.length; i++) {
                                    var valid = new Unit(data[i]);
                                    for (var j = 0; j < div.length; j++) {
                                        if (data[i]["division"] == div[j]["name"]) {
                                            valid.divisionId = new ObjectId(div[j]["_id"]);
                                            valid.division = div[j];
                                            valid.stamp(this.user.username, 'manager');
                                            this.collection.insert(valid)
                                                .then(id => {
                                                    this.getSingleById(id)
                                                        .then(resultItem => {
                                                            newUnit.push(resultItem)
                                                            resolve(newUnit);
                                                        })
                                                        .catch(e => {
                                                            reject(e);
                                                        });
                                                })
                                                .catch(e => {
                                                    reject(e);
                                                });
                                            break;
                                        }

                                    }
                                }
                            } else {
                                resolve(dataError);
                            }
                        })
                })
        })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Unit}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var codeIndex = {
            name: `ix_${map.master.collection.Unit}_code`,
            key: {
                code: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
