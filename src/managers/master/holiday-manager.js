'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var DivisionManager = require('./division-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var assert = require('assert');

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var generateCode = require("../../utils/code-generator");
var map = DLModels.map;
var Holiday = DLModels.master.Holiday;
var DivisionManager = require('./division-manager');

module.exports = class HolidayManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Holiday);
        this.DivisionManager = new DivisionManager(db, user);
    }

    _getQuery(paging) {
        var _default = {
            _deleted: false,
        },
            pagingFilter = paging.filter || {},
            keywordFilter = {},

            query = {};

        if (paging.keyword) {
            var keyRegex = new RegExp(paging.keyword, "i");
            var divisionFilter = {
                'division.name': {
                    '$regex': keyRegex
                }
            };
            var nameFilter = {
                'name': {
                    '$regex': keyRegex
                }
            };

            keywordFilter['$or'] = [codeFilter, nameFilter];
        }

        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(holiday) {
        var errors = {};
        var valid = holiday;

        // 1. begin: Declare promises.
        var getHolidayPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });

        var getDivision = valid.division && ObjectId.isValid(valid.division._id) ? this.divisionManager.getSingleByIdOrDefault(valid.division._id) : Promise.resolve(null);
        // 2. begin: Validation.
        return Promise.all([getHolidayPromise, getDivision])
            .then((results) => {
                var _module = results[0];
                var _division = results[1];

                if (!valid.code || valid.code == '')
                    errors["code"] = i18n.__("Holiday.code.isRequired:%s is required", i18n.__("Holiday.code._:Code")); // "Kode tidak boleh kosong.";
                else if (_module) {
                    errors["code"] = i18n.__("Holiday.code.isExists:%s is already exists", i18n.__("Holiday.code._:Code")); // "Kode sudah terdaftar.";
                }

                if (!valid.date || valid.date == "" || valid.date == "undefined")
                    errors["date"] = i18n.__("Holiday.date.isRequired:%s is required", i18n.__("Holiday.date._:Date")); //"Tanggal Libur tidak boleh kosong";
               
                if (!valid.name || valid.name == '')
                    errors["name"] = i18n.__("Holiday.name.isRequired:%s is required", i18n.__("Holiday.name._:Name")); // "Nama tidak boleh kosong.";

                if (!valid.division) {
                    errors["division"] = i18n.__("Holiday.division.isRequired:%s is required", i18n.__("Holiday.division._:Division")); //"Division tidak boleh kosong";
                }
                if (valid.division) {
                    if (!valid.division.name || valid.division.name == '')
                        errors["division"] = i18n.__("Holiday.division.isRequired:%s is required", i18n.__("Holiday.division._:Division")); //"Division tidak boleh kosong";
                }
                else if (_division) {
                    errors["division"] = i18n.__("Holiday.division.noExists:%s is not exists", i18n.__("Holiday.division._:Division")); //"Division tidak boleh kosong";
                }

                if (!valid.description || valid.description == '')
                    errors["description"] = i18n.__("Holiday.description.isRequired:%s is required", i18n.__("Holiday.description._:Description")); // "Desktipsi tidak boleh kosong.";

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('Holiday Manager : data does not pass validation' + JSON.stringify(errors), errors));
                }

                valid.division = _division;
                valid.divisionId = new ObjectId(valid.division._id);
                if (!valid.stamp)
                    valid = new Holiday(valid);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    getHoliday() {
        return new Promise((resolve, reject) => {
            var query = {
                _deleted: false
            };
            this.collection
                .where(query)
                .execute()
                .then(holiday => {
                    resolve(holiday);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    insert(dataFile) {
        return new Promise((resolve, reject) => {
            var holiday, division;
            this.getHoliday()
                .then(results => {
                    this.divisionManager.getDivision()
                        .then(divisions => {                            
                                    holiday = results.data;
                                    division = divisions.name;
                                    var data = [];
                                    if (dataFile != "") {
                                        for (var i = 1; i < dataFile.length; i++) {
                                            data.push({
                                                "date": dataFile[i][0].trim(),
                                                "name": dataFile[i][1].trim(),
                                                "division": dataFile[i][2].trim(),
                                                "description": dataFile[i][3].trim()
                                            });
                                        }
                                    }
                                    var dataError = [], errorMessage;
                                    for (var i = 0; i < data.length; i++) {
                                        errorMessage = "";
                                        if (data[i]["code"] === "" || data[i]["code"] === undefined) {
                                            errorMessage = errorMessage + "Kode tidak boleh kosong, ";
                                        }
                                       
                                       if (!valid.date || valid.date == "" || valid.date == "undefined")
                                           errors["date"] = i18n.__("Holiday.date.isRequired:%s is required", i18n.__("Holiday.date._:Date")); //"Tanggal Libur tidak boleh kosong";
                                      
                                        if (data[i]["name"] === "" || data[i]["name"] === undefined) {
                                            errorMessage = errorMessage + "Nama tidak boleh kosong, ";
                                        }
                                        if (data[i]["division"] === "" || data[i]["division"] === undefined) {
                                            errorMessage = errorMessage + "Divisi tidak boleh kosong, ";
                                        }
                                        if (data[i]["description"] === "" || data[i]["description"] === undefined) {
                                            errorMessage = errorMessage + "Keterangan tidak boleh kosong, ";
                                        }
                                   
                                        if (errorMessage !== "") {
                                            dataError.push({"date": data[i]["date"], "name": data[i]["name"], "division": data[i]["division"], "description": data[i]["description"], "Error": errorMessage });
                                        }
                                    }
                                    if (dataError.length === 0) {
                                        var newHoliday = [];
                                        for (var i = 0; i < data.length; i++) {
                                             var valid = new Holiday(data[i]);
                                             var now = new Date()
                                             valid.code = generateCode();
                                             valid.stamp(this.user.username, 'manager');
                                             valid._createdDate = now;
                                                for (var j = 0; j < division.length; j++) {
                                                    if (data[i]["division"] == division[j]["name"]) {
                                                        valid.divisionId = new ObjectId(division[j]["_id"]);
                                                        valid.division = division[j];
                                                        this.collection.insert(valid)
                                                            .then(id => {
                                                                this.getSingleById(id)
                                                                    .then(resultItem => {
                                                                        newHoliday.push(resultItem)
                                                                        resolve(newHoliday);
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
            name: `ix_${map.master.collection.Holiday}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Holiday}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

    getHolidayByDivision(key, filter) {
        return new Promise((resolve, reject) => {
            var regex = new RegExp(key, "i");
            var regex2 = new RegExp(filter, "i");
            this.collection.aggregate(
                [{
                    $match: {
                        $and: [{
                            $and: [{
                                "division.name": regex2
                            }, {
                                    "_deleted": false
                                }]
                        }, {
                                "name": {
                                    "$regex": regex
                                }
                            }]
                    }
                }]
            )
                .toArray(function (err, result) {
                    assert.equal(err, null);
                    resolve(result);
                });
        });
    }

    readById(paging) {
        var _paging = Object.assign({
            order: {},
            filter: {},
            select: []
        }, paging);

        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .where(_paging.filter)
                    .select(_paging.select)
                    .order(_paging.order)
                    .execute();
            });
    }

    readById(paging) {
        var _paging = Object.assign({
            order: {},
            filter: {},
            select: []
        }, paging);

        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .where(_paging.filter)
                    .select(_paging.select)
                    .order(_paging.order)
                    .execute();
            });
    }
};
