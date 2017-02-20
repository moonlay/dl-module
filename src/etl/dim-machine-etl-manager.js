"use strict"

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var MachineManager = require("../managers/master/machine-manager");

module.exports = class DimMachineEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.machineManager = new MachineManager(db, user);
    }

    run() {
        return this.extract()
            .then((data) => this.transform(data))
            .then((data) => this.load(data));
    }

    extract() {
        var timestamp = new Date(1970, 1, 1);
        return this.machineManager.collection.find({
            _deleted: false

        }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {
            return {
                machineCode: `'${item.code}'`,
                machineName: `'${item.name}'`,
                machineManufacture: `'${item.manufacture}'`,
                machineYear: `'${item.year}'`,
                machineProcess: `'${item.process}'`,
                machineCondition: `'${item.condition}'`
            }
        });
        return Promise.resolve([].concat.apply([], result));
    }

    load(data) {
        return this.sql.getConnection()
            .then((request) => {

                var sqlQuery = '';

                var count = 1;
                for (var item of data) {
                    sqlQuery = sqlQuery.concat(`insert into [DL_Dim_Mesin]([Kode Mesin], [Nama Mesin], [Manufaktur Mesin], [Tahun Mesin], [Proses Mesin], [Kondisi Mesin]) values(${item.machineCode}, ${item.machineName}, ${item.machineManufacture}, ${item.machineYear}, ${item.machineProcess}, ${item.machineCondition});\n`);

                    count = count + 1;
                }

                request.multiple = true;

                return request.query(sqlQuery)
                    // return request.query('select count(*) from dimdivisi')
                    // return request.query('select top 1 * from dimdivisi')

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


