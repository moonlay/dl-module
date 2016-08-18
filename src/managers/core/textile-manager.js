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
            this._validate(textile).then(validTextile => {
                this.productManager.create(validTextile)
                    .then(id => {
                        resolve(id);
                    })
                    .catch(e => {
                        reject(e);
                    });
            }).catch(e => {
                reject(e);
            })
        })
    }

    update(textile) {
        textile = new Textile(textile);
        return new Promise((resolve, reject) => {
            this._validate(textile).then(validTextile => {
                this.productManager.update(validTextile)
                    .then(id => {
                        resolve(id);
                    })
                    .catch(e => {
                        reject(e);
                    })
            }).catch(e => {
                reject(e);
            })
        })
    }

    delete(textile) {
        textile = new Textile(textile);
        return new Promise((resolve, reject) => {
            this._validate(textile).then(validTextile => {
                this.productManager.delete(validTextile)
                    .then(id => {
                        resolve(id);
                    })
                    .catch(e => {
                        reject(e);
                    })
            }).catch(e => {
                reject(e);
            })
        })
    }

    _validate(textile) {
        // Additional validations, specific to this Product only.
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = new Textile(textile);

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
                reject(new ValidationError('Textile Manager : data does not pass validation', errors));
            }
            resolve(valid);
        });
    }
};
