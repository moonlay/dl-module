function test(name, path) {
    describe(name, function () {
        require(path);
    })
}


describe('#dl-module', function (done) {
    this.timeout(2 * 60000);
    //console.log(path);

    //Master
    test('@manager/UoM-manager', './managers/UoM-manager-test');
    test('@manager/supplier-manager', './managers/supplier-manager-test');
    test('@manager/buyer-manager', './managers/buyer-manager-test');
    test('@manager/accessories-manager', './managers/accessories-manager-test');
    test('@manager/fabric-manager', './managers/fabric-manager-test');
    test('@manager/textile-manager', './managers/textile-manager-test');
    test('@manager/sparepart-manager', './managers/sparepart-manager-test');
    test('@manager/general-merchandise-manager', './managers/general-merchandise-manager-test');

    //PO
    test('@po/po-garment-sparepart-manager', './po/po-garment-sparepart-manager-test');
    test('@po/po-garment-general-manager', './po/po-garment-general-manager-test');
})
