var global = require('../../global');

module.exports = function (productionOrder) {

    var details = [].concat.apply([], productionOrder.details);

    var iso = "FM.7-MK-03-015";

    var locale = global.config.locale; 

    var number=productionOrder.orderNo;

    var spelling=productionOrder.spelling;
    var orderQuantity=productionOrder.orderQuantity;
    var spellOrder=((spelling/100)*orderQuantity)+orderQuantity;;

    var moment = require('moment');
    moment.locale(locale.name); 

    var header = [{
        columns: [{
            columns: [{
                width: '*',
                stack: [{
                    text: iso,
                    style: ['size06','bold'],
                    alignment: "right"
                }, {
                        text: 'SURAT PERINTAH PRODUKSI',
                        style: ['size12','bold'],
                        alignment: "center"
                    }]
            }]

        }]
    }];

   
    var thead = [{
        text: 'Warna yang Diminta',
        style: 'tableHeader'
    }, {
            text: 'Acuan/Color Way',
            style: 'tableHeader'
        },
        {
            text: 'Jenis Warna',
            style: 'tableHeader'
        }, {
            text: 'Jumlah',
            style: 'tableHeader'
        }];
        
    var tfoot = [[{
        text: 'Total',
        style: 'tableHeader',
        colSpan:3
    }, "", "", {
            text: productionOrder.orderQuantity +" "+productionOrder.uom.unit,
            style: 'tableHeader'
        }]];

    var tbody = details.map(function (detail, index) {
        return [{
            text: detail.colorRequest ,
            style: ['size07', 'center']
        },{
            text: detail.colorTemplate ,
            style: ['size07', 'center']
        },{
            text: detail.colorType.name ,
            style: ['size07', 'center']
        },{
            text: detail.quantity + " "+detail.uom.unit ,
            style: ['size07', 'center']
        } ]
    });

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada detail",
            style: ['size06', 'center'],
            colSpan: 4
        }, "", "",""]
    ];

    var table = [{
        table: {
            widths: ['25%', '25%', '25%','25%'],
            headerRows: 1,
            body: [].concat([thead], tbody,tfoot)
        }
    }];
    var datas=[
        {
            columns: [
                {
                    width: '40%',
                    text: 'Nomor Order'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.orderNo
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Nama Buyer'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.buyer.name
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Jenis Proses'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.processType.name
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Material'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.material.name
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Konstruksi'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.construction
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Jenis Order'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.orderType.name
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Jumlah Order'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:orderQuantity + " " + productionOrder.uom.unit
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Jumlah Order + Spelling'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:spellOrder+" " + productionOrder.uom.unit
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Asal Kain Greige'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.originGreigeFabric
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Lebar Finish'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.finishWidth
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Design'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.design
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Standar Handling'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.handlingStandard
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'RUN'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.RUN
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Standar Shrinkage'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.shrinkageStandard, 
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Panjang Roll'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.rollLength
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Standar Lampu'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.lampStandard.name
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Sample'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.sample
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Keterangan'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:productionOrder.remark
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Tanggal Delivery'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:`${moment(productionOrder.deliveryDate).format(locale.date.format)}`
                }]
        },{
            columns: [
                {
                    width: '40%',
                    text: 'Tanggal Order dibuat'
                }, {
                    width: '3%',
                    text:':'
                },
                {
                    width: '*',
                    text:`${moment(productionOrder._updatedDate).format(locale.date.format)}`
                }]
        }, '\n'
    ];

    var body = [
        '\n', {
            stack: [{
                columns: [{
                    width: '55%',
                    stack:[datas]
                },
                {
                    width:'*',
                    stack:[table]
                }]
            }
            ],
            style: ['size08']
        }, '\n'
    ];

    var thead2 = [{
        text: 'DIBUAT OLEH',
        style: 'tableHeader'
    }, {
            text: 'MENGETAHUI',
            style: 'tableHeader'
        }, {
            text: 'MENYETUJUI',
            style: 'tableHeader',
            colSpan:2
        },""];
        
    var tfoot2 = [[{
        text: 'PENJUALAN',
        style: 'tableHeader'
    }, {
            text: 'KABAG PENJUALAN',
            style: 'tableHeader'
        }, {
            text: 'KABAG F/P',
            style: 'tableHeader'
        },{
            text: 'PPIC F/P',
            style: 'tableHeader'
        }]];

    var tbody2 = [[{
        text: " ",
        style: ['size30', 'center']
    }, "", "",""]];

    var table2 = [{
        table: {
            widths: ['25%', '25%', '25%', '25%'],
            headerRows: 1,
            body: [].concat([thead2], tbody2,tfoot2)
        }
    }];
    var pr = {
        pageSize: 'A5',
        pageOrientation: 'portrait',
        pageMargins: 20,
        content: [].concat(header,body,table2),
        styles: {
            size06: {
                fontSize: 6
            },
            size07: {
                fontSize: 7
            },
            size08: {
                fontSize: 8
            },
            size09: {
                fontSize: 9
            },
            size10: {
                fontSize: 10
            },
            size12: {
                fontSize: 12
            },
            size15: {
                fontSize: 15
            },
            size30: {
                fontSize: 30
            },
            bold: {
                bold: true
            },
            center: {
                alignment: 'center'
            },
            left: {
                alignment: 'left'
            },
            right: {
                alignment: 'right'
            },
            justify: {
                alignment: 'justify'
            },
            tableHeader: {
                bold: true,
                fontSize: 8,
                color: 'black',
                alignment: 'center'
            }
        }
    };

    return pr;
}