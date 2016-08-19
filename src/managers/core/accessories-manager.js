'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var ProductManager = require("./product-manager");
var DLModels = require('dl-models');
var map = DLModels.map;
var Accessories = DLModels.core.Accessories;

module.exports = class AccessoriesManager {
    constructor(db, user) {
        this.db = db;
        this.user = user;
        this.productManager = new ProductManager(db, user);
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
            var type = {
                _type: map.core.type.Accessories
            };

            var query = {
                '$and': [deleted, type]
            };

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

            this.productManager.productCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(accessories => {
                    resolve(accessories);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    readByAccessoriesId(accessoriesId, paging) {
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
            var accessories = {
                accessoriesId: new ObjectId(accessoriesId)
            };
            var query = {
                '$and': [deleted, fabric]
            };

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


            this.productManager.productCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(accessories => {
                    resolve(accessories);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getById(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);
            var query = {
                _id: new ObjectId(id),
                _deleted: false,
                _type: map.core.type.Accessories
            };
            this.getSingleByQuery(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getByCode(code) {
        return new Promise((resolve, reject) => {
            if (code === '')
                resolve(null);
            var query = {
                code: code,
                _deleted: false,
                _type: map.core.type.Accessories
            };
            this.getSingleByQuery(query)
                .then(module => {
                    resolve(module);
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
                _deleted: false,
                _type: map.core.type.Accessories
            };
            this.getSingleOrDefaultByQuery(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleByQuery(query) {
        return new Promise((resolve, reject) => {
            this.productManager.productCollection
                .single(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    getSingleOrDefaultByQuery(query) {
        return new Promise((resolve, reject) => {
            this.productManager.productCollection
                .singleOrDefault(query)
                .then(accessories => {
                    resolve(accessories);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    create(accessories) {
        accessories = new Accessories(accessories);
        return new Promise((resolve, reject) => {
            this._validate(accessories)
                .then(validAccessories => {
                    this.productManager.create(validAccessories)
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

    update(accessories) {
        accessories = new Accessories(accessories);
        return new Promise((resolve, reject) => {
            this._validate(accessories)
                .then(validAccessories => {
                    this.productManager.update(validAccessories)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    delete(accessories) {
        accessories = new Accessories(accessories);
        return new Promise((resolve, reject) => {
            this._validate(accessories)
                .then(validAccessories => {
                    this.productManager.delete(validAccessories)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    _validate(accessories) {
        // Additional validations, specific to this Product only.
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = new Accessories(accessories);
            for (var prop in errors) {
                var ValidationError = require('../../validation-error');
                reject(new ValidationError('Accessories Manager : data does not pass validation', errors));
            }
            resolve(valid);
        });
    }
};
