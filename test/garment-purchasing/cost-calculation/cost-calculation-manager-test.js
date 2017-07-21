var helper = require("../helper");
var CostCalculationManager = require("../../src/managers/cost-calculation/cost-calculation-manager");
var instanceManager = null;

require("should");

function getData() {

    var CostCalculation = require('dl-models').costCalculation.CostCalculation;
    var Buyer = require('dl-models').core.Buyer;
    var costCalculation = new CostCalculation();

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
     //header
        costCalculation.konfeksi='1B';
        costCalculation.RO='3' + code + stamp;;
        costCalculation.CostCalcutationDate=new Date();
        costCalculation.section='1' + code + stamp;;
        costCalculation.repeat=true;
        costCalculation.article='1' + code + stamp;;
        costCalculation.description=`description for ${code}`;
        costCalculation.quantity=100;
        costCalculation.comodity=`como for ${code}`;
        costCalculation.fabricAllowance=80;
        costCalculation.accessoriesAllowance=90;
        costCalculation.sizeRange='X,M,L';
        costCalculation.deliveryDate=new Date();
        costCalculation.confirmDate=new Date();
        costCalculation.SHCutting=120;
        costCalculation.SHSewing=750;
        costCalculation.SHFinnishing=580;
        costCalculation.SHTotal=80;
        costCalculation.efficiencyAllowance=10;
        costCalculation.pricePerSecond=20;
        costCalculation.confirmPrice=400;
        costCalculation.rateUSD=10;

        //footer
        costCalculation.Freight=20;
        costCalculation.insurance=50;
        costCalculation.productionCost=60;
        costCalculation.transportationCost=50;
        costCalculation.OTL1=70;
        costCalculation.OTL2=70;
        costCalculation.risk=50;
        costCalculation.commision=30;
        costCalculation.netPerFOB=20;
        costCalculation.netPerFOBAllowance=10;

        //body
        this.poAccessories=[];
        this.poFabric=[];
        
        //remarks and details
        costCalculation.remarks=[`remarks 1 for ${code}`, `remarks 2 for ${code}`, `remarks 3 for ${code}`];
        costCalculation.details=[`details 1 for ${code}`, `details 2 for ${code}`, `details 3 for ${code}`];

        var buyer = new Buyer({
        _id:code,
        code: '123',
        name: 'Buyer01',
        contact: '0812....',
        address: 'test',
        tempo: 0
    });
    
    costCalculation.buyer=buyer;
    return costCalculation;

}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new CostCalculationManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#01. should success when read data', function (done) {
    instanceManager.read()
        .then(documents => {
            //process documents
            documents.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId;
it('#02. should success when create new data', function (done) {
    var data = getData();
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdData;
it(`#03. should success when get created data with id`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            // validate.product(data);
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#04. should success when update created data`, function (done) {
    createdData.RO += '[updated]';
    
    instanceManager.update(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#05. should success when get updated data with id`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            data.RO.should.equal(createdData.RO);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#06. should success when posting created data`, function (done) {
    instanceManager.post(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#07. should success when delete data`, function (done) {
    instanceManager.delete(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#08. should error when create new data with same code', function (done) {
    var data = Object.assign({}, createdData);
    delete data._id;
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done("Should not be able to create data with same code");
        })
        .catch(e => {
            e.errors.should.have.property('RO');
            done();
        })
});

it('#09. should error when create blank data ', function (done) {
    instanceManager.create({})
        .then(id => {
            done("Should not be error when create blank data");
        })
        .catch(e => {
            try {
                e.errors.should.have.property('RO');
                e.errors.should.have.property('konfeksi');
                done();
            } catch (ex) {
                done(ex);
            }
        })
});
