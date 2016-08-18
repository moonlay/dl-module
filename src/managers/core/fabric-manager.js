'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var ProductManager = require("./product-manager");
var DLModels = require('dl-models');
var map = DLModels.map;
var Fabric = DLModels.core.Fabric;

module.exports = class FabricManager {
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
                _type: map.core.type.Fabric
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
                .then(fabrics => {
                    resolve(fabrics);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    readByFabricId(fabricId, paging) {
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
            var fabric = {
                fabricId: new ObjectId(fabricId)
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
                .then(fabric => {
                    resolve(fabric);
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
                _type: map.core.type.Fabric
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
                _type: map.core.type.Fabric
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
                _type: map.core.type.Fabric
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
                .then(fabric => {
                    resolve(fabric);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    create(fabric) {
        fabric = new Fabric(fabric);
        return new Promise((resolve, reject) => {
            this._validate(fabric)
                .then(validFabric => {
                    this.productManager.create(validFabric)
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

    update(fabric) {
        fabric = new Fabric(fabric);
        return new Promise((resolve, reject) => {
            this._validate(fabric)
                .then(validFabric => {
                    this.productManager.update(validFabric)
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

    delete(fabric) {
        fabric = new Fabric(fabric);
        return new Promise((resolve, reject) => {
            this._validate(fabric)
                .then(validFabric => {
                    this.productManager.delete(validFabric)
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

    _validate(fabric) {
        // Additional validations, specific to this Product only.
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = new Fabric(fabric);

            // Get existing documents if needed.
            // var getFabricPromise = this.fabricCollection.singleOrDefault({
            //     "$and": [{
            //         _id: {
            //             '$ne': new ObjectId(valid._id)
            //         }
            //     }, {
            //             code: valid.code
            //         }]
            // });

            // if (!valid.price || valid.price == 0)
            //     errors["price"] = "Harga tidak boleh kosong dan bernilai 0";

            for (var prop in errors) {
                var ValidationError = require('../../validation-error');
                reject(new ValidationError('Fabric Manager : data does not pass validation', errors));
            }
            resolve(valid);
        });
    }
};
