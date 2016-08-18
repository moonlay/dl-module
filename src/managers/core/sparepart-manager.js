'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var ProductManager = require("./product-manager");
var dlModel = require("dl-models");
var Sparepart = dlModel.core.Sparepart;
var map = dlModel.map;

module.exports = class SparepartManager {
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
                _type: map.core.type.Sparepart
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
                .then(spareparts => {
                    resolve(spareparts);
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
                _type: map.core.type.Sparepart
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
                _type: map.core.type.Sparepart
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
                .then(sparepart => {
                    resolve(sparepart);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    create(sparepart) {
        sparepart = new Sparepart(sparepart);
        return new Promise((resolve, reject) => {
            this.productManager.create(sparepart)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                });
        })

    }

    update(sparepart) {
        sparepart = new Sparepart(sparepart);
        return new Promise((resolve, reject) => {
            this.productManager.update(sparepart)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                })
        })
    }

    delete(sparepart) {
        sparepart = new Sparepart(sparepart);
        return new Promise((resolve, reject) => {
            this.productManager.delete(sparepart)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                })
        })
    }
};
