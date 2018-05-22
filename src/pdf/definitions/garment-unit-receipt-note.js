var global = require('../../global');

module.exports = function (unitReceiptNote, offset) {

    var items = [].concat.apply([], unitReceiptNote.items);

    var iso = "FM-00-AD-09-004B/R1";
    var number = unitReceiptNote.no;

    var locale = global.config.locale;

    var moment = require('moment');
    moment.locale(locale.name);

    var header = [{
        alignment: "center",
        text: 'BON PENERIMAAN BARANG',
        style: ['size10', 'bold']
    }, {
        columns: [
            {
                columns: [{
                    width: '*',
                    stack: [{
                        text: 'PT DAN LIRIS',
                        style: ['size08', 'bold']
                    }, {
                        text: 'BANARAN, GROGOL, SUKOHARJO',
                        style: ['size08']
                    }]
                }]

            },
            {
                columns: [{
                    width: '*',
                    stack: [{
                        alignment: "right",
                        text: ' ',
                        style: ['size08', 'bold']
                    } ]
                }]

            }]
    }];

    var subHeader = [{
        columns: [
            {
                width: '50%',
                stack: [{
                    columns: [{
                        width: '33%',
                        text: 'Tgl. Terima'
                    }, {
                        width: '2%',
                        text: ':'
                    }, {
                        width: '*',
                        text: `${moment(unitReceiptNote.deliveryOrderDate).add(offset, 'h').format(locale.date.format)}`
                    }]
                }, {
                    columns: [{
                        width: '33%',
                        text: 'Diterima dari'
                    }, {
                        width: '2%',
                        text: ':'
                    }, {
                        width: '*',
                        text: unitReceiptNote.supplier.name
                    }]
                }, {
                    columns: [{
                        width: '33%',
                        text: 'Dasar Penerimaan'
                    }, {
                        width: '2%',
                        text: ':'
                    }, {
                        width: '*',
                        text: unitReceiptNote.deliveryOrderNo
                    }]
                }
                ],
                style: ['size07']
            },
            {
                width: '10%',
                text: ''
            },
            {
                width: '40%',
                stack: [{
                    columns: [{
                        width: '45%',
                        text: 'Tgl. Bon Penerimaan'
                    }, {
                        width: '2%',
                        text: ':'
                    }, {
                        width: '*',
                        text: `${moment(unitReceiptNote.date).add(offset, 'h').format(locale.date.format)}`
                    }]
                }, {
                    columns: [{
                        width: '45%',
                        text: 'Bagian'
                    }, {
                        width: '2%',
                        text: ':'
                    }, {
                        width: '*',
                        text: unitReceiptNote.unit.name
                    }]
                }, {
                    columns: [{
                        width: '45%',
                        text: 'No.'
                    }, {
                        width: '2%',
                        text: ':'
                    }, {
                        width: '*',
                        text: unitReceiptNote.no
                    }]
                }],
                style: ['size07']
            }
        ]
    }, '\n'];

    var line = [{
        canvas: [{
            type: 'line',
            x1: 0,
            y1: 5,
            x2: 378,
            y2: 5,
            lineWidth: 0.5
        }
        ]
    }, '\n'];

    var thead = [
        {
            text: 'No.',
            style: 'tableHeader'
        }, {
            text: 'Nama barang',
            style: 'tableHeader'
        }, {
            text: 'Jumlah',
            style: 'tableHeader'
        }, {
            text: 'Satuan',
            style: 'tableHeader'
        }, {
            text: 'Keterangan',
            style: 'tableHeader'
        }];

    var tbody = items.map(function (item, index) {
        return [{
            text: (index + 1).toString() || '',
            style: ['size06', 'center']
        }, {
            text: item.product.code + " - " + item.product.name,
            style: ['size06', 'left']
        }, {
            text: parseFloat(item.deliveredQuantity).toLocaleString(locale, locale.decimal),
            style: ['size06', 'center']
        }, {
            text: item.deliveredUom.unit,
            style: ['size06', 'center']
        }, {
            text: `${item.purchaseRequestRefNo};${item.roNo};${item.artikel};${item.remark}` || '',
            style: ['size06', 'left']
        }];
    });

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada barang",
            style: ['size06', 'center'],
            colSpan: 5
        }, "", "", "", ""]
    ];

    var table = [{
        table: {
            widths: ['5%', '40%', '20%', '10%', '25%'],
            headerRows: 1,
            body: [].concat([thead], tbody)
        }
    }];

    var footer = [
        '\n', {
            stack: [{
                text: `Sukoharjo, ${moment(unitReceiptNote.date).add(offset, 'h').format(locale.date.format)}`,
                alignment: "right"
            }, {
                columns: [{
                    width: '35%',
                    stack: ['Mengetahui\n\n\n\n\n', '(_______________________)'],
                    style: 'center'
                }, {
                    width: '30%',
                    text: ''
                }, {
                    width: '35%',
                    stack: ['Yang Menerima\n\n\n\n\n', '(_______________________)'],
                    style: 'center'
                }]
            }
            ],
            style: ['size07']
        }
    ];

    var dd = {
        pageSize: 'A6',
        pageOrientation: 'landscape',
        pageMargins: 20,
        content: [].concat(header, line, subHeader, table, footer),
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
                fontSize: 7,
                color: 'black',
                alignment: 'center'
            }
        }
    };

    return dd;
}