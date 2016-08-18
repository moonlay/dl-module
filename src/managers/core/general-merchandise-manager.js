'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var ProductManager = require("./product-manager");
var DLModels = require('dl-models');
var map = DLModels.map;
var GeneralMerchandise = DLModels.core.GeneralMerchandise;

module.exports = class GeneralMerchandiseManager {
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
                _type: map.core.type.GeneralMerchandise
            }

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
                .then(generalMerchandises => {
                    resolve(generalMerchandises);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    readByGeneralMerchandiseId(generalMerchandiseId, paging) {
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
            var generalMerchandise = {
                generalMerchandiseId: new ObjectId(generalMerchandiseId)
            };
            var query = {
                '$and': [deleted, generalMerchandise]
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
                .then(generalMerchandise => {
                    resolve(generalMerchandise);
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
                _type: map.core.type.GeneralMerchandise
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
                _type: map.core.type.GeneralMerchandise
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
                _type: map.core.type.GeneralMerchandise
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
                .then(generalMerchandise => {
                    resolve(generalMerchandise);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    create(generalMerchandise) {
        generalMerchandise = new GeneralMerchandise(generalMerchandise);
        return new Promise((resolve, reject) => {
            this._validate(generalMerchandise)
                .then(validGeneralMerchandise => {
                    this.productManager.create(validGeneralMerchandise)
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

    update(generalMerchandise) {
        generalMerchandise = new GeneralMerchandise(generalMerchandise);
        return new Promise((resolve, reject) => {
            this._validate(generalMerchandise)
                .then(validGeneralMerchandise => {
                    this.productManager.update(validGeneralMerchandise)
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

    delete(generalMerchandise) {
        generalMerchandise = new GeneralMerchandise(generalMerchandise);
        return new Promise((resolve, reject) => {
            this._validate(generalMerchandise)
                .then(validGeneralMerchandise => {
                    this.productManager.delete(validGeneralMerchandise)
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

    _validate(generalMerchandise) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = new GeneralMerchandise(generalMerchandise);

            // Get existing documents if needed.
            // var getGeneralMerchandisePromise = this.generalMerchandiseCollection.singleOrDefault({
            //     "$and": [{
            //         _id: {
            //             '$ne': new ObjectId(valid._id)
            //         }
            //     }, {
            //             code: valid.code
            //         }]
            // });

            // if (!valid.name || valid.name == '')
            //     errors["name"] = "name is required";
            for (var prop in errors) {
                var ValidationError = require('../../validation-error');
                reject(new ValidationError('General Merchandise Manager : data does not pass validation', errors));
            }
            resolve(valid);

        });
    }
};
