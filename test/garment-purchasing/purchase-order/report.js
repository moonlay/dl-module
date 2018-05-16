require("should");
var dataUtil = require("../../data-util/garment-purchasing/purchase-order-data-util");
var helper = require("../../helper");
var validatePO = require("dl-models").validator.garmentPurchasing.garmentPurchaseOrder;
var moment = require('moment');

var Manager = require("../../../src/managers/garment-purchasing/purchase-order-manager");
var manager = null;


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdId;
it("#01. should success when create new data", function (done) {
    dataUtil.getNewData()
        .then((data) => manager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdData;
it(`#02. should success when get created data with id`, function (done) {
    manager.getSingleById(createdId)
        .then((data) => {
            data.should.instanceof(Object);
            validatePO(data);
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});


var resultForExcelTest = {};
it('#03. should success when create report', function (done) {
    var info = {};
    info.filter = { _createdBy: createdData._createdBy };
    info.no = createdData._id;
    info.buyer = createdData.buyerId;
    info.category = createdData.items[0].categoryId;
    info.unit = createdData.unitId;
    info.dateFrom = createdData.date;
    info.dateTo = createdData.date.toISOString().split("T", "1").toString();

    manager.getReport(info)
        .then(result => {
            resultForExcelTest = result;
            var POdata = result.data;
            POdata.should.instanceof(Array);
            POdata.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});


it('#04. should success when get data for Excel Report', function (done) {
    var query = {};

    manager.getXls(resultForExcelTest, query)
        .then(xlsData => {
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});


it("#05. should success when destroy all unit test data", function (done) {
    manager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it("#06. should success when read data", function (done) {
    manager.read({ keyword: "Moonlay Technologies" })
        .then((result) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#07. should success when get data kedatangan with date', function (done) {
    var dateFrom =  createdData.date;
    var dateTo   =  createdData.date;
    var kategori = "Bahan Baku";
    var offset = 7;
    manager.getDataTest( dateFrom, dateTo, kategori,offset)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#08. should success when get data kedatangan detail with date', function (done) {
    var dateFrom =  createdData.date;
    var dateTo   =  createdData.date;
    var kategori = "Bahan Baku";
    var supplier = null;
     var offset =7;
    manager.getDataTestSub(supplier,dateFrom,dateTo,kategori,offset)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});


it('#09. should success when get data pengiriman with date', function (done) {
    var dateFrom =  createdData.date;
    var dateTo   =  createdData.date;
    var offset = 7;
    manager.getDataKirim( dateFrom, dateTo,offset)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#10. should success when get data pengiriman detail with date', function (done) {
    var dateFrom =  createdData.date;
    var dateTo   =  createdData.date;
    var supplier = null;
     var offset =7;
    manager.getDataKirimSub(supplier,dateFrom,dateTo,offset)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

var resultForExcelTest = {};
it('#11. should success when get data with Start Date, End Date and Duration 0-7 days', function (done) {
    var query = {};
    query.dateFrom = new Date(createdData._createdDate);
    query.dateTo = new Date(createdData._createdDate);
    query.duration = "0-7 hari";

    manager.getDurationPOIntPoExt(query)
        .then(result => {
            var po = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#12. should success when get data with date, unit and Duration 8-14 days', function (done) {
    var query = {};
    query.unitId= createdData.unit._id;
    query.dateFrom = new Date(createdData._createdDate);
    query.dateTo = new Date(createdData._createdDate);
    query.duration = "8-14 hari";

    manager.getDurationPOIntPoExt(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#13. should success when get data with Start Date, End Date and Duration 15-30 days', function (done) {
    var query = {};
    query.dateFrom = new Date(createdData._createdDate);
    query.dateTo = new Date(createdData._createdDate);
    query.duration = "15-30 hari";

    manager.getDurationPOIntPoExt(query)
        .then(result => {
            var po = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#14. should success when get data with Start Date, End Date and Duration >30 days', function (done) {
    var query = {};
    query.dateFrom = new Date(createdData._createdDate);
    query.dateTo = new Date(createdData._createdDate);
    query.duration = "> 30 hari";

    manager.getDurationPOIntPoExt(query)
        .then(result => {
            var po = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#15. should success when get data for Excel Report', function (done) {
    var query = {};
    query.duration = "0-7 hari";

    manager.getXlsDurationPOIntPOExt(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#16. should success when get data for Excel Report using dateFrom only', function (done) {
    var query = {};
    query.dateFrom = new Date(createdData._createdDate);
    query.duration = "8-14 hari";

    manager.getXlsDurationPOIntPOExt(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#17. should success when get data for Excel Report using dateTo only', function (done) {
    var query = {};
    query.dateTo = new Date(createdData._createdDate);
    query.duration = "> 30 hari";

    manager.getXlsDurationPOIntPOExt(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#18. should success when get data for Excel Report using both dateFrom and dateTo', function (done) {
    var query = {};
    query.dateFrom = new Date(createdData._createdDate);
    query.dateTo = new Date(createdData._createdDate);
    query.duration = "15-30 hari";

    manager.getXlsDurationPOIntPOExt(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#19. should success when get data with date and unit', function (done) {
    var query = {};
    query.unitId = createdData.unit._id;
    query.dateFrom = new Date(createdData._createdDate);
    query.dateTo = new Date(createdData._createdDate);
  
    manager.getDurationPOIntPoExt(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#20. should success when get data with date and unit', function (done) {
    var query = {};
    query.dateFrom = new Date(createdData._createdDate);
    query.dateTo = new Date(createdData._createdDate);
  
    manager.getDurationPOIntPoExt(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});


it('#21. should success when get data with date, user, unit and Duration 8-14 days', function (done) {
    var query = {};
    query.unitId= createdData.unit._id;
    query.user= createdData._createdBy;
    query.dateFrom = new Date(createdData._createdDate);
    query.dateTo = new Date(createdData._createdDate);
    query.duration = "8-14 hari";

    manager.getDurationPOIntPoExt(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#22. should success when get data for Excel Report using both dateFrom, dateTo and unit', function (done) {
    var query = {};
    query.unitId = createdData.unit._id;
    query.dateFrom = new Date(createdData._createdDate);
    query.dateTo = new Date(createdData._createdDate);
    query.duration = "15-30 hari";

    manager.getXlsDurationPOIntPOExt(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

var resultForExcelTest = {};
it('#23. should success when get data with Start Date, End Date and Duration 0-30 days', function (done) {
    var query = {};
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "0-30 hari";

    manager.getDurationPoExtDo(query)
        .then(result => {
            var po = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#24. should success when get data with date, unit and Duration 31-60 days', function (done) {
    var query = {};
    query.unitId= createdData.unit._id;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "31-60 hari";

    manager.getDurationPoExtDo(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#25. should success when get data with Start Date, End Date and Duration >60 days', function (done) {
    var query = {};
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "> 60 hari";

    manager.getDurationPoExtDo(query)
        .then(result => {
            var po = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#26. should success when get data for Excel Report', function (done) {
    var query = {};
    query.duration = "0-30 hari";

    manager.getXlsDurationPoExtDo(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#27. should success when get data for Excel Report using dateFrom only', function (done) {
    var query = {};
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "31-60 hari";

    manager.getXlsDurationPoExtDo(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#28. should success when get data for Excel Report using dateTo only', function (done) {
    var query = {};
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "> 60 hari";

    manager.getXlsDurationPoExtDo(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#29. should success when get data for Excel Report using both dateFrom and dateTo', function (done) {
    var query = {};
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "0-30 hari";

    manager.getXlsDurationPoExtDo(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#30. should success when get data with date and unit', function (done) {
    var query = {};
    query.unitId = createdData.unit._id;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
  
    manager.getDurationPoExtDo(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#31. should success when get data with date and unit', function (done) {
    var query = {};
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
  
    manager.getDurationPoExtDo(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});


it('#32. should success when get data with date, user, unit and Duration 0-30 days', function (done) {
    var query = {};
    query.unitId= createdData.unit._id;
    query.user= createdData._createdBy;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "0-30 hari";

    manager.getDurationPoExtDo(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#33. should success when get data for Excel Report using both dateFrom, dateTo and unit', function (done) {
    var query = {};
    query.unitId = createdData.unit._id;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "0-30 hari";

    manager.getXlsDurationPoExtDo(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});
it('#34. should success when get data with date, user, unit and Duration 31-60 days', function (done) {
    var query = {};
    query.unitId= createdData.unit._id;
    query.user= createdData._createdBy;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "31-60 hari";

    manager.getDurationPoExtDo(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#35. should success when get data for Excel Report using both dateFrom, dateTo and unit', function (done) {
    var query = {};
    query.unitId = createdData.unit._id;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "31-60 hari";

    manager.getXlsDurationPoExtDo(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});
it('#36. should success when get data with date and supplier', function (done) {
    var query = {};
    query.supplierId = createdData.items[0].supplier._id;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
  
    manager.getDurationPoExtDo(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});
it('#37. should success when get data for Excel Report using both dateFrom, dateTo and supplier', function (done) {
    var query = {};
    query.supplierId = createdData.items[0].supplier._id;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);

    manager.getXlsDurationPoExtDo(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});
it('#38. should success when get data with unit and supplier', function (done) {
    var query = {};
    query.unitId = createdData.unit._id;
    query.supplierId = createdData.items[0].supplier._id;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
  
    manager.getDurationPoExtDo(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});
it('#39. should success when get data for Excel Report using both unit and supplier', function (done) {
    var query = {};
    query.unitId = createdData.unit._id;
    query.supplierId = createdData.items[0].supplier._id;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);

    manager.getXlsDurationPoExtDo(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});
it('#40. should success when get data with date, user, supplier, unit and Duration 0-30 days', function (done) {
    var query = {};
    query.unitId= createdData.unit._id;
    query.supplierId = createdData.items[0].supplier._id;
    query.user= createdData._createdBy;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "0-30 hari";

    manager.getDurationPoExtDo(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});
it('#41. should success when get data with date, supplier and Duration 31-60 days', function (done) {
    var query = {};
    query.supplierId = createdData.items[0].supplier._id;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "31-60 hari";

    manager.getDurationPoExtDo(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});
it('#42. should success when get data for Excel Report using both dateFrom, dateTo, supplier and unit', function (done) {
    var query = {};
    query.unitId = createdData.unit._id;
   query.supplierId = createdData.items[0].supplier._id;
    query.dateFrom = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.dateTo = new Date(createdData.items[0].purchaseOrderExternal._createdDate);
    query.duration = "31-60 hari";

    manager.getXlsDurationPoExtDo(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});