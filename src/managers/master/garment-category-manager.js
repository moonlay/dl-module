"use strict"

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require("dl-models");
var map = DLModels.map;
var Category = DLModels.master.Category;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

var UomManager = require('./uom-manager');

module.exports = class CategoryManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use("garment-categories");
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
            var codeFilter = {
                "code": {
                    "$regex": regex
                }
            };
            var nameFilter = {
                "name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, nameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(category) {
        var errors = {};
        var valid = category;
        // 1. begin: Declare promises.
        var getcategoryPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });

        // 2. begin: Validation.
        return Promise.all([getcategoryPromise])
            .then(results => {
                var _category = results[0];

                if (!valid.code || valid.code == "")
                    errors["code"] = i18n.__("Category.code.isRequired:%s is required", i18n.__("Category.code._:Code")); //"Code Kategori Tidak Boleh Kosong";
                else if (_category) {
                    errors["code"] = i18n.__("Category.code.isExists:%s is already exists", i18n.__("Category.code._:Code")); //"Code Kategori sudah terdaftar";
                }
                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("Category.name.isRequired:%s is required", i18n.__("Category.name._:Name")); //"Nama Harus diisi";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid = new Category(category);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    getCategory() {
        return new Promise((resolve, reject) => {
            var query = {
                _deleted: false
            };

            this.collection
                .where(query)
                .execute()
                .then(categories => {
                    resolve(categories);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    insert(dataFile) {
        return new Promise((resolve, reject) => {
            var category;
            var uom;
            this.uomManager.getUOM().then((uomResult) => {
                this.getCategory().then(results => {
                    category = results.data;
                    uom = uomResult;
                    var data = [];
                    if (dataFile != "") {
                        for (var i = 1; i < dataFile.length; i++) {
                            data.push({
                                "code": dataFile[i][0].trim(),
                                "name": dataFile[i][1].trim(),
                                "codeRequirement": dataFile[i][2].trim(),
                                "uom": dataFile[i][3].trim(),
                            });
                        }
                    }
                    var dataError = [], errorMessage;
                    for (var i = 0; i < data.length; i++) {
                        errorMessage = "";
                        if (data[i]["code"] === "" || data[i]["code"] === undefined) {
                            errorMessage = errorMessage + "Kode tidak boleh kosong, ";
                        }
                        if (data[i]["name"] === "" || data[i]["name"] === undefined) {
                            errorMessage = errorMessage + "Nama tidak boleh kosong, ";
                        }
                        if (data[i]["uom"] === "" || data[i]["uom"] === undefined) {
                            errorMessage = errorMessage + "uom tidak boleh kosong, ";
                        }

                        if (!(uom.data.find(o => o.unit.toLowerCase() == data[i]["uom"].toLowerCase()))) {
                            errorMessage = errorMessage + "UOM tidak terdaftar dalam master UOM,";
                        }

                        for (var j = 0; j < category.length; j++) {
                            if (category[j]["code"] === data[i]["code"]) {
                                errorMessage = errorMessage + "Kode tidak boleh duplikat, ";
                            }
                            if (category[j]["name"] === data[i]["name"]) {
                                errorMessage = errorMessage + "Nama tidak boleh duplikat";
                            }
                        }
                        if (errorMessage !== "") {
                            dataError.push({ "code": data[i]["code"], "name": data[i]["name"], "uom": data[i]["uom"], "codeRequirement": data[i]["codeRequirement"], "Error": errorMessage });
                        }
                    }
                    if (dataError.length === 0) {
                        var newCategory = [];
                        for (var i = 0; i < data.length; i++) {
                            var valid = new Category(data[i]);
                            var now = new Date();
                            var uomData = (uom.data.find(o => o.unit.toLowerCase() == data[i]["uom"].toLowerCase()))
                            j += 1;
                            valid.stamp(this.user.username, 'manager');
                            valid.uomId = uomData._id;
                            valid.uom = uomData;
                            valid._createdDate = now
                            this.collection.insert(valid)
                                .then(id => {
                                    this.getSingleById(id)
                                        .then(resultItem => {
                                            newCategory.push(resultItem)
                                            resolve(newCategory);
                                        })
                                        .catch(e => {
                                            reject(e);
                                        });
                                })
                                .catch(e => {
                                    reject(e);
                                });
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
            name: `ix_${map.master.collection.Category}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var codeIndex = {
            name: `ix_${map.master.collection.Category}_code`,
            key: {
                code: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
