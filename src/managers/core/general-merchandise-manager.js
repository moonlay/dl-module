'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var GeneralMerchandise = DLModels.core.GeneralMerchandise;
var ProductManager = require("./product-manager");

module.exports = class GeneralMerchandiseManager {
    constructor(db, user) {
        this.db = db;
        this.user = user; this.productManager = new ProductManager(db, user);
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
            };

            var query = _paging.keyword ? {
                '$and': [deleted, type]
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
                query['$and'].push(type);
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

    getSingleByQueryOrDefault(query) {
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
            this.productManager.create(generalMerchandise)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                });
        })

    }

    update(generalMerchandise) {
        generalMerchandise = new GeneralMerchandise(generalMerchandise);
        return new Promise((resolve, reject) => {
            this.productManager.update(generalMerchandise)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                })
        })
    }

    delete(generalMerchandise) {
        generalMerchandise = new GeneralMerchandise(generalMerchandise);
        return new Promise((resolve, reject) => {
            this.productManager.delete(generalMerchandise)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                })
        })
    }
};
