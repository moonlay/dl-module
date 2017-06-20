var global = require('../../global');

module.exports = function (unitPaymentCorrection) {

    var items = unitPaymentCorrection.items.map((item) => {
        return {
            quantity: item.quantity,
            uom: item.uom,
            product: item.product,
            pricePerUnit: item.pricePerUnit,
            priceTotal: item.priceTotal
        };
    });

    items = [].concat.apply([], items);

    var currency = unitPaymentCorrection.items.find(r => true).currency.code;

    var locale = global.config.locale;

    var moment = require('moment');
    moment.locale(locale.name);

    var numberLocaleOptions = {
        style: 'decimal',
        maximumFractionDigits: 4

    };
    var header = [
        {
            text: 'NOTA RETUR',
            style: ['size11', 'center']
        }, '\n',
        {
            stack: [
                `Nomor : ${unitPaymentCorrection.returNoteNo}`,
                `(Atas Faktur Pajak Nomor : ${unitPaymentCorrection.unitPaymentOrder.incomeTaxNo} Tanggal : ${moment(unitPaymentCorrection.unitPaymentOrder.incomeTaxDate).format(locale.date.format)})`
            ],
            style: ['size09', 'center']

        }
    ];

    var line = [
        {
            canvas: [{
                type: 'line',
                x1: 0,
                y1: 5,
                x2: 378,
                y2: 5,
                lineWidth: 0.5
            }
            ]
        }, '\n'
    ];

    var subHeaderDanliris = [
        {
            text: 'Pembeli BKP',
            style: ['size09', 'bold']
        },
        {
            columns: [{
                width: '10%',
                text: 'Nama',
                style: ['size09']
            }, {
                width: '3%',
                text: ':',
                style: ['size09']
            }, {
                width: '*',
                text: 'PT. DAN LIRIS',
                style: ['size09']
            }]
        },
        {
            columns: [{
                width: '10%',
                text: 'Alamat',
                style: ['size09']
            }, {
                width: '3%',
                text: ':',
                style: ['size09']
            }, {
                width: '*',
                text: 'Banaran, Grogol, Sukoharjo',
                style: ['size09']
            }]
        },
        {
            columns: [{
                width: '10%',
                text: 'N P W P',
                style: ['size09']
            }, {
                width: '3%',
                text: ':',
                style: ['size09']
            }, {
                width: '*',
                text: '01.139.907.8 - 532.000',
                style: ['size09']
            }]
        }
    ];

    var subHeaderSupplier = [
        {
            text: 'Kepada Penjual',
            style: ['size09', 'bold']
        },
        {
            columns: [{
                width: '10%',
                text: 'Nama',
                style: ['size09']
            }, {
                width: '3%',
                text: ':',
                style: ['size09']
            }, {
                width: '*',
                text: `${unitPaymentCorrection.unitPaymentOrder.supplier.name}`,
                style: ['size09']
            }]
        },
        {
            columns: [{
                width: '10%',
                text: 'Alamat',
                style: ['size09']
            }, {
                width: '3%',
                text: ':',
                style: ['size09']
            }, {
                width: '*',
                text: `${unitPaymentCorrection.unitPaymentOrder.supplier.address}`,
                style: ['size09']
            }]
        },
        {
            columns: [{
                width: '10%',
                text: 'N P W P',
                style: ['size09']
            }, {
                width: '3%',
                text: ':',
                style: ['size09']
            }, {
                width: '*',
                text: `${unitPaymentCorrection.unitPaymentOrder.supplier.NPWP}`,
                style: ['size09']
            }]
        }
    ];

    var thead = [
        {
            text: 'No.',
            style: 'tableHeader'
        }, {
            text: 'Macam dan Jenis BKP',
            style: 'tableHeader'
        }, {
            text: 'Kuantum',
            style: 'tableHeader'
        }, {
            text: 'Harga Satuan Menurut Faktur Pajak',
            style: 'tableHeader'
        }, {
            text: 'Harga Jual BKP',
            style: 'tableHeader'
        }
    ];

    var tbody = items.map(function (item, index) {
        return [{
            text: (index + 1).toString() || '',
            style: ['size08', 'center']
        }, {
            text: item.product.name,
            style: ['size08', 'left']
        }, {
            text: `${item.quantity} ${item.uom.unit}`,
            style: ['size08', 'right']
        }, {
            columns: [{
                width: '15%',
                text: currency,
                style: ['size08']
            }, {
                width: '*',
                text: parseFloat(item.pricePerUnit).toLocaleString(locale, locale.currency),
                style: ['size08', 'right']
            }]
        }, {
            columns: [{
                width: '15%',
                text: currency,
                style: ['size08']
            }, {
                width: '*',
                text: parseFloat(item.priceTotal).toLocaleString(locale, locale.currency),
                style: ['size08', 'right']
            }]
        }];
    });

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada data",
            style: ['size08', 'center'],
            colSpan: 5
        }, "", "", "", ""]
    ];

    var initialValue = {
        priceTotal: 0
    };
    var sum = (items.length > 0 ? items : [initialValue])
        .map(item => item.priceTotal)
        .reduce(function (prev, curr, index, arr) {
            return prev + curr;
        }, 0);

    var vatTax = sum * 0.1;

    var tfoot = [
        [{
            text: 'Jumlah Harga Jual BKP yang dikembalikan',
            style: ['size07', 'left'],
            colSpan: 4
        }, null, null, null, {
            columns: [{
                width: '10%',
                text: currency
            }, {
                width: '*',
                text: parseFloat(sum).toLocaleString(locale, locale.currency),
                style: ['right']
            }],
            style: ['size07']
        }],
        [{
            text: 'PPN yang diminta kembali',
            style: ['size07', 'left'],
            colSpan: 4
        }, null, null, null, {
            columns: [{
                width: '10%',
                text: currency
            }, {
                width: '*',
                text: parseFloat(vatTax).toLocaleString(locale, locale.currency),
                style: ['right']
            }],
            style: ['size07']
        }],
        [{
            stack: [
                '\n',
                `Sukoharjo, ${moment(unitPaymentCorrection.date).format(locale.date.format)}`,
                '\n\n\n\n',
                '_____________________________',
                '\n'
            ],
            colSpan: 5,
            style: ['size08', 'right']
        }, null, null, null, null
        ],
        [{
            stack: [{
                text: 'Lembar ke-1 : untuk PKP Penjual',
                style: ['size07']
            }, {
                text: 'Lembar ke-2 : untuk Pembeli',
                style: ['size07']
            }, {
                text: 'Lembar ke-3 : untuk LPP tempat Pembeli terdaftar (dalam hal Pembeli bukan PKP',
                style: ['size07']
            }
            ],
            colSpan: 5,
            style: ['size07', 'left']
        }, null, null, null, null
        ],
        [{
            text: ' ',
            colSpan: 5
        }, null, null, null, null]
    ];

    var table = [{
        table: {
            widths: ['5%', '30%', '15%', '25%', '25%'],
            headerRows: 1,
            body: [].concat([thead], tbody, tfoot)
        }
    }];

    var dd = {
        pageSize: 'A5',
        pageOrientation: 'portrait',
        pageMargins: 20,
        content: [].concat(header, line, subHeaderDanliris, '\n', subHeaderSupplier, '\n', table),
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
            size11: {
                fontSize: 11
            },
            size15: {
                fontSize: 15
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
    }

    return dd;
}