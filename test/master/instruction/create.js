require("should");
var OrderDataUtil = require("../../data-util/master/order-type-data-util");
var InstructionDataUtil = require("../../data-util/master/instruction-data-util");
var OrderTypeManager = require("../../../src/managers/master/order-type-manager");
var InstructionManager = require("../../../src/managers/master/instruction-manager");
var orderTypeValidate = require("dl-models").validator.master.orderType;
var instructionValidate = require("dl-models").validator.master.instruction;
var codeGenerator = require('../../../src/utils/code-generator');
var orderTypeManager = null;
var instructionManager = null;
var helper = require("../../helper");


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            orderTypeManager = new OrderTypeManager(db, {
                username: 'dev'
            });
            instructionManager = new InstructionManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

// var dataSolid;
// it("#01. should success when create data order type with name Solid", function (done) {
//     OrderDataUtil.getNewData()
//         .then(solid => {
//             solid.name = "Solid";
//             orderTypeManager.create(solid)
//                 .then(id => {
//                     orderTypeManager.getSingleByIdOrDefault(id)
//                         .then(result => {
//                             orderTypeValidate(result);
//                             dataSolid = result;
//                             done();
//                         })
//                         .catch((e) => {
//                             done(e);
//                         });
//                 })
//                 .catch((e) => {
//                     done(e);
//                 });
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

// var dataPrinting;
// it("#02. should success when create data order type with name Printing", function(done) {
//     OrderDataUtil.getNewData()
//         .then(solid =>{
//             solid.name = "Printing";
//             orderTypeManager.create(solid)
//                 .then(id => {
//                     orderTypeManager.getSingleByIdOrDefault(id)
//                         .then(result => {
//                             orderTypeValidate(result);
//                             dataPrinting = result;
//                             done();
//                         })
//                         .catch((e) => {
//                             done(e);
//                         });
//                 })
//                 .catch((e) => {
//                     done(e);
//                 });
//         })
//         .catch((e) => {
//             done(e);
//         });
// }); 

// var dataYarnDyed;
// it("#03. should success when create data order type with name Yarn Dyed", function(done) {
//     OrderDataUtil.getNewData()
//         .then(solid =>{
//             solid.name = "Yarn Dyed";
//             orderTypeManager.create(solid)
//                 .then(id => {
//                     orderTypeManager.getSingleByIdOrDefault(id)
//                         .then(result => {
//                             orderTypeValidate(result);
//                             dataYarnDyed = result;
//                             done();
//                         })
//                         .catch((e) => {
//                             done(e);
//                         });
//                 })
//                 .catch((e) => {
//                     done(e);
//                 });
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

// var insSolidId;
// var dataInsSolid;
// it("#04. should success when create data instruction with order type Solid", function(done) {
//     InstructionDataUtil.getTestData({
//         name : "Instruction Solid",
//         orderType : dataSolid
//     })
//     .then(data =>{
//         instructionValidate(data);
//         dataInsSolid = data;
//         insSolidId = data._id;
//         done();
//     })
//     .catch((e) => {
//         done(e);
//     });
// });

// var insPrintingId;
// var dataInsPrinting;
// it("#05. should success when create data instruction with order type Printing", function(done) {
//     InstructionDataUtil.getTestData({
//         name : "Instruction Printing",
//         orderType : dataPrinting
//     })
//     .then(data =>{
//         instructionValidate(data);
//         dataInsPrinting = data;
//         insPrintingId = data._id;
//         done();
//     })
//     .catch((e) => {
//         done(e);
//     });
// });

// var insYarnDyedId;
// var dataInsYarnDyed;
// it("#06. should success when create data instruction with order type Yarn Dyed", function(done) {
//     InstructionDataUtil.getTestData({
//         name : "Instruction Yarn Dyed",
//         orderType : dataYarnDyed
//     })
//     .then(data =>{
//         instructionValidate(data);
//         dataInsYarnDyed = data;
//         insYarnDyedId = data._id;
//         done();
//     })
//     .catch((e) => {
//         done(e);
//     });
// });

// it("#07. should error when create data instruction with same order type Solid", function(done) {
//     var data = dataInsSolid;
//     delete data._id;
//     instructionManager.create(data)
//     .then(result =>{
//         done("#07. should error when create data instruction with same order type Solid");
//     })
//     .catch((e) => {
//         e.name.should.equal("ValidationError");
//         e.should.have.property("errors");
//         e.errors.should.instanceof(Object);
//         done();
//     });
// });

// it("#08. should error when create data instruction with same order type Printing", function(done) {
//     var data = dataInsPrinting;
//     delete data._id;
//     instructionManager.create(data)
//     .then(result =>{
//         done("#08. should error when create data instruction with same order type Printing");
//     })
//     .catch((e) => {
//         e.name.should.equal("ValidationError");
//         e.should.have.property("errors");
//         e.errors.should.instanceof(Object);
//         done();
//     });
// });

// it("#09. should error when create data instruction with same order type Yarn Dyed", function(done) {
//     var data = dataInsYarnDyed;
//     delete data._id;
//     instructionManager.create(data)
//     .then(result =>{
//         done("#09. should error when create data instruction with same order type Yarn Dyed");
//     })
//     .catch((e) => {
//         e.name.should.equal("ValidationError");
//         e.should.have.property("errors");
//         e.errors.should.instanceof(Object);
//         done();
//     });
// });

// it("#10. should success when destroy all data test", function(done) {
//     var destroyInsSolid = instructionManager.destroy(insSolidId);
//     var destroyInsPrinting = instructionManager.destroy(insPrintingId);
//     var destroyInsYarnDyed = instructionManager.destroy(insYarnDyedId);
//     var destroySolid = orderTypeManager.destroy(dataSolid._id);
//     var destroyPrinting = orderTypeManager.destroy(dataPrinting._id);
//     var destroyYarnDyed = orderTypeManager.destroy(dataYarnDyed._id);
//     Promise.all([destroyInsSolid, destroyInsPrinting, destroyInsYarnDyed, destroySolid, destroyPrinting, destroyYarnDyed])
//         .then((result) => {
//             result.should.be.instanceof(Array);
//             result[0].should.be.Boolean();
//             result[0].should.equal(true);
//             result[1].should.be.Boolean();
//             result[1].should.equal(true);
//             result[2].should.be.Boolean();
//             result[2].should.equal(true);
//             result[3].should.be.Boolean();
//             result[3].should.equal(true);
//             result[4].should.be.Boolean();
//             result[4].should.equal(true);
//             result[5].should.be.Boolean();
//             result[5].should.equal(true);
//             done();
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

it("#01. should success when create data order type with name Printing", function (done) {
    InstructionDataUtil.getNewData()
        .then(solid => {
            solid.steps[0].process = null;
            instructionManager.create(solid)
                .then(id => {
                    done();
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});