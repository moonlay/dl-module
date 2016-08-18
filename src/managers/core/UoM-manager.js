'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var UoM = DLModels.core.UoM;

module.exports = class UoMManager {

    constructor(db, user) {
        this.db = db;
        this.user = user;
        this.UoMCollection = this.db.use(map.core.collection.UoM);
    }

    read(paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: '_id',
            asc: true
        }, paging);

        return new Promise((resolve, reject) => {
            var deleted = {
                _deleted: false
            };
            var query = _paging.keyword ? {
                '$and': [deleted]
            } : deleted;

            if (_paging.keyword) {
                var regex = new RegExp(_paging.keyword, "i");
                var filterCategory = {
                    'category': {
                        '$regex': regex
                    }
                };
                // var filterName = {
                //     'name': {
                //         '$regex': regex
                //     }
                // };
                // var $or = {
                //     '$or': [filterCode, filterName]
                // };

                query['$and'].push(filterCategory);
            }

            this.UoMCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(UoMs => {
                    resolve(UoMs);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    readListCategory(paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: '_id',
            asc: true
        }, paging);

        return new Promise((resolve, reject) => {
            var deleted = {
                _deleted: false
            };
            var query = _paging.keyword ? {
                '$and': [deleted]
            } : deleted;

            if (_paging.keyword) {
                var regex = new RegExp(_paging.keyword, "i");
                var filterCategory = {
                    'category': {
                        '$regex': regex
                    }
                };
                // var filterName = {
                //     'name': {
                //         '$regex': regex
                //     }
                // };
                // var $or = {
                //     '$or': [filterCode, filterName]
                // };

                query['$and'].push(filterCategory);
            }

            this.UoMCollection
                .where(query, { users: 0 })
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(UoMs => {
                    var listCategory = [];

                    for (var i = 0; i < UoMs.length; i++) {
                        var category = {};
                        category._id = UoMs[i]._id;
                        category.category = UoMs[i].category;
                        category.default = UoMs[i].default;
                        listCategory.push(category);
                    }

                    resolve(listCategory);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    create(UoM) {
        return new Promise((resolve, reject) => {
            this._validate(UoM)
                .then(validUoM => {

                    this.UoMCollection.insert(validUoM)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    update(UoM) {
        return new Promise((resolve, reject) => {
            this._validate(UoM)
                .then(validUoM => {
                    this.UoMCollection.update(validUoM)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    delete(UoM) {
        return new Promise((resolve, reject) => {
            this._validate(UoM)
                .then(validUoM => {
                    validUoM._deleted = true;
                    this.UoMCollection.update(validUoM)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    _validate(uom) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = uom;
            // 1. begin: Declare promises.
            var getUoMPromise = this.UoMCollection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        category: valid.category
                    }]
            });
            // 1. end: Declare promises.

            // 2. begin: Validation.
            Promise.all([getUoMPromise])
                .then(results => {
                    var _UoM = results[0];

                    if (!valid.category || valid.category == '')
                        errors["category"] = "category is required";
                    else if (_UoM) {
                        errors["category"] = "category already exists";
                    }

                    if (!valid.default)
                        errors["default"] = "default is required";
                    else {

                        if (!valid.default.mainUnit || valid.default.mainUnit == '')
                            errors["default"] = "default is required";
                        else {
                            if (valid.default.mainUnit != valid.default.convertedUnit || valid.default.mainValue != valid.default.convertedValue)
                                errors["default"] = "main unit and main value must be equal with converted unit and converted value";
                            else {
                                if (valid.units.length == 0)
                                    errors["units"] = "units is required";
                                else {
                                    var i = 1;
                                    for (var item of valid.units) {
                                        if (item['mainValue'] != valid.default.mainValue || item['mainUnit'] != valid.default.mainUnit) {
                                            errors["units"] = "main unit and main value in units must be equal with main unit and main value in default";
                                            break;
                                        }

                                        if (item['convertedUnit'] == '') {
                                            errors["units"] = "converted unit is required";
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    for (var prop in errors) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid = new UoM(uom);
                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    getById(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);
            var query = {
                _id: new ObjectId(id),
                _deleted: false
            };
            this.getSingleByQuery(query)
                .then(UoM => {
                    resolve(UoM);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getByIdOrDefault(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);
            var query = {
                _id: new ObjectId(id),
                _deleted: false
            };
            this.getSingleByQueryOrDefault(query)
                .then(UoM => {
                    resolve(UoM);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleByQuery(query) {
        return new Promise((resolve, reject) => {
            this.UoMCollection
                .single(query)
                .then(UoM => {
                    resolve(UoM);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    getSingleByQueryOrDefault(query) {
        return new Promise((resolve, reject) => {
            this.UoMCollection
                .singleOrDefault(query)
                .then(UoM => {
                    resolve(UoM);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }
}