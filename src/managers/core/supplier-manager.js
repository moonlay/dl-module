'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var Supplier = require("dl-models").core.Supplier;

module.exports = class SupplierManager {
    constructor(db, user) {
        this.db = db;
        this.user = user;
        this.supplierCollection = this.db.collection("suppliers");
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
                var filterCode = {
                    'code': {
                        '$regex': regex
                    }
                };
                var filterName = {
                    'name': {
                        '$regex': regex
                    }
                };
                var $or = {
                    '$or': [filterCode, filterName]
                };

                query['$and'].push($or);
            }

            this.supplierCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(suppliers => {
                    resolve(suppliers);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    create(supplier) {
        return new Promise((resolve, reject) => {
            this._validate(supplier)
                .then(validSupplier => {

                    this.supplierCollection.insert(validSupplier)
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

    update(supplier) {
        return new Promise((resolve, reject) => {
            this._validate(supplier)
                .then(validSupplier => {
                    this.supplierCollection.update(validSupplier)
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

    delete(supplier) {
        return new Promise((resolve, reject) => {
            this._validate(supplier)
                .then(validSupplier => {
                    validSupplier._deleted = true;
                    this.supplierCollection.update(validSupplier)
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

    _validate(supplier) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = supplier;
            // 1. begin: Declare promises.
            var getSupplierPromise = this.supplierCollection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        code: valid.code
                    }]
            });
            // 1. end: Declare promises.

            // 2. begin: Validation.
            Promise.all([getSupplierPromise])
                .then(results => {
                    var _supplier = results[0];

                    if (!valid.code || valid.code == '')
                        errors["code"] = "code is required";
                    else if (_supplier) {
                        errors["code"] = "code already exists";
                    }

                    if (!valid.name || valid.name == '')
                        errors["name"] = "name is required";


                    // 2c. begin: check if data has any error, reject if it has.
                    for (var prop in errors) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid = new Supplier(supplier);
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
                .then(supplier => {
                    resolve(supplier);
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
                .then(supplier => {
                    resolve(supplier);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleByQuery(query) {
        return new Promise((resolve, reject) => {
            this.supplierCollection
                .single(query)
                .then(supplier => {
                    resolve(supplier);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    getSingleByQueryOrDefault(query) {
        return new Promise((resolve, reject) => {
            this.supplierCollection
                .singleOrDefault(query)
                .then(supplier => {
                    resolve(supplier);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }
}