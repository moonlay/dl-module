"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require("dl-models");
var map = DLModels.map;
var Supplier = DLModels.master.Supplier;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class SupplierManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection("garment-suppliers");
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

    _validate(supplier) {
        var errors = {};
        var valid = supplier;
        // 1. begin: Declare promises.
        var getSupplierPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code,
            _deleted: false
        });

        // 2. begin: Validation.
        return Promise.all([getSupplierPromise])
            .then(results => {
                var _supplier = results[0];

                if (!valid.code || valid.code == "")
                    errors["code"] = i18n.__("Supplier.code.isRequired:%s is required", i18n.__("Supplier.code._:Code")); //"Kode harus diisi ";
                else if (_supplier) {
                    errors["code"] = i18n.__("Supplier.code.isExists:%s is required", i18n.__("Supplier.code._:Code")); //"Kode sudah ada";
                }

                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("Supplier.name.isExists:%s is required", i18n.__("Supplier.name._:Name")); //"Nama harus diisi";

                if (!valid.import)
                    valid.import = false;

                if (!valid.useIncomeTax)
                    valid.useIncomeTax = false;                    

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid = new Supplier(supplier);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    getSupplier() {
        return new Promise((resolve, reject) => {
            var query = {
                _deleted: false
            };

            this.collection
                .where(query)
                .execute()
                .then(divisions => {
                    resolve(divisions);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    insert(dataFile) {
        return new Promise((resolve, reject) => {
            var supplier;
            this.getSupplier()
                .then(results => {
                    supplier = results.data;
                    var data = [];
                    if (dataFile != "") {
                        for (var i = 1; i < dataFile.length; i++) {
                            data.push({
                                "code": dataFile[i][0].trim(),
                                "name": dataFile[i][1].trim(),
                                "address": dataFile[i][2].trim(),
                                "contact": dataFile[i][3].trim(),
                                "PIC": dataFile[i][4].trim(),
                                "import": dataFile[i][5].trim(),
                                "NPWP": dataFile[i][6].trim(),
                                "serialNumber": dataFile[i][7].trim(),
                                "useIncomeTax": dataFile[i][8].trim()                              
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
                        if (data[i]["import"] === "" || data[i]["import"] === undefined) {
                            errorMessage = errorMessage + "Import tidak boleh kosong, ";
                        } else if ((data[i]["import"]).toString() !== "TRUE" && (data[i]["import"]).toString() !== "FALSE") {
                            errorMessage = errorMessage + "Import harus diisi dengan true atau false, ";
                        }
                        if (data[i]["useIncomeTax"] === "" || data[i]["useIncomeTax"] === undefined) {
                            errorMessage = errorMessage + "Pakai PPN tidak boleh kosong, ";
                        } else if ((data[i]["useIncomeTax"]).toString() !== "TRUE" && (data[i]["useIncomeTax"]).toString() !== "FALSE") {
                            errorMessage = errorMessage + "Pakai PPN harus diisi dengan true atau false, ";
                        }
                        for (var j = 0; j < supplier.length; j++) {
                            if (supplier[j]["code"] === data[i]["code"]) {
                                errorMessage = errorMessage + "Kode tidak boleh duplikat";
                            }
                        }
                        if (errorMessage !== "") {
                            dataError.push({ "code": data[i]["code"], "name": data[i]["name"], "address": data[i]["address"], "contact": data[i]["contact"], "PIC": data[i]["PIC"], "import": data[i]["import"], "NPWP": data[i]["NPWP"], "serialNumber": data[i]["serialNumber"], "useIncomeTax": data[i]["useIncomeTax"], "Error": errorMessage });
                        }
                    }
                    if (dataError.length === 0) {
                        var newSupplier = [];
                        for (var i = 0; i < data.length; i++) {
                            if ((data[i]["import"]).toString() === "TRUE") {
                                data[i]["import"] = true;
                            }
                            if ((data[i]["import"]).toString() === "FALSE") {
                                data[i]["import"] = false;
                            }
                            if ((data[i]["useIncomeTax"]).toString() === "TRUE") {
                                data[i]["useIncomeTax"] = true;
                            }
                            if ((data[i]["useIncomeTax"]).toString() === "FALSE") {
                                data[i]["useIncomeTax"] = false;
                            }                            
                            var valid = new Supplier(data[i]);
                            var now = new Date();
                            valid.stamp(this.user.username, 'manager');
                            valid._createdDate = now;
                            this.collection.insert(valid)
                                .then(id => {
                                    this.getSingleById(id)
                                        .then(resultItem => {
                                            newSupplier.push(resultItem)
                                            resolve(newSupplier);
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
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Supplier}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Supplier}_code`,
            key: {
                code: 1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }  
}
