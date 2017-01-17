'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");
var sqlConnect = require('./sqlConnect');

// internal deps 
require('mongodb-toolkit');

var UnitManager = require('../managers/master/unit-manager');

module.exports = class DimUnitEtlManager {
    constructor(db, user) {
        this.unitManager = new UnitManager(db, user);
    }
    run() {
        return this.extract()
            .then((data) => {
                return this.transform(data)
            })
            .then((data) => {
                return this.load(data)
            });
    }

    extract() {
        var timestamp = new Date(1970, 1, 1);
        return this.unitManager.collection.find({
            _deleted: false
        }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {

            return {
                unitCode: item.code,
                divisionName: item.division.name,
                unitName: item.name
            };
        });
        return Promise.resolve([].concat.apply([], result));
    }

    load(data) {
        return sqlConnect.getConnect()
            .then((request) => {

                var sqlQuery = '';

                var count = 1;
                for (var item of data) {
                    sqlQuery = sqlQuery.concat("insert into DL_Dim_Unit(ID_dim_unit, Kode_unit, Nama_Divisi, Nama_unit) values(" + count + ", '" + item.unitCode + "', '" + item.divisionName + "', '" + item.unitName + "'); ");

                    count = count + 1;
                }

                request.multiple = true;

                return request.query(sqlQuery)
                    // return request.query('select count(*) from Dimunit')
                    // return request.query('select top 1 * from Dimunit')
                    .then((results) => {
                        console.log(results);
                        return Promise.resolve();
                    })
            })
            .catch((err) => {
                console.log(err);
                return Promise.reject(err);
            });
    }
}
