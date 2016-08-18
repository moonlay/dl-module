'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var ProductManager = require("./product-manager");
var dlModel = require("dl-models");
var Textile = dlModel.core.Textile;
var map = dlModel.map;

module.exports = class TextileManager {
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
                _type: map.core.type.Textile
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
            }

            this.productManager.productCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(textiles => {
                    resolve(textiles);
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
                _type: map.core.type.Textile
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
                _type: map.core.type.Textile
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
                .then(textile => {
                    resolve(textile);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    create(textile) {
        textile = new Textile(textile);
        return new Promise((resolve, reject) => {
            this.productManager.create(textile)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                });
        })

    }

    update(textile) {
        textile = new Textile(textile);
        return new Promise((resolve, reject) => {
            this.productManager.update(textile)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                })
        })
    }

    delete(textile) {
        textile = new Textile(textile);
        return new Promise((resolve, reject) => {
            this.productManager.delete(textile)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                })
        })
    }
};
