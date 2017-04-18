var global = require('../../global');

module.exports = function (unitReceiptNote) {

    var items = [].concat.apply([], unitReceiptNote.items);

    var iso = "FM-AG2-00-GU-06-004";
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
                            text: 'PT. AMBASSADOR GARMINDO',
                            style: ['size15', 'bold']
                        }, {
                                text: 'BANARAN, GROGOL, SUKOHARJO',
                                style: ['size09']
                            }]
                    }]

                },
                {
                    columns: [{
                        width: '*',
                        stack: [{
                            alignment: "right",
                            text: ' ',
                            style: ['size15', 'bold']
                        }, {
                                alignment: "right",
                                text: iso,
                                style: ['size08', 'bold']
                            }]
                    }]

                }]
        }];

    var subHeader = [{
        columns: [
            {
                width: '50%',
                stack: [{
                    columns: [{
                        width: '25%',
                        text: 'Tanggal'
                    }, {
                            width: '5%',
                            text: ':'
                        }, {
                            width: '*',
                            text: `${moment(unitReceiptNote.date).format(locale.date.format)}`
                        }]
                }, {
                        columns: [{
                            width: '25%',
                            text: 'Diterima dari'
                        }, {
                                width: '5%',
                                text: ':'
                            }, {
                                width: '*',
                                text: unitReceiptNote.supplier.name
                            }]
                    }
                ],
                style: ['size08']
            },
            {
                width: '10%',
                text: ''
            },
            {
                width: '40%',
                stack: [{
                    columns: [{
                        width: '25%',
                        text: 'Bagian'
                    }, {
                            width: '5%',
                            text: ':'
                        }, {
                            width: '*',
                            text: unitReceiptNote.unit.name
                        }]
                }, {
                        columns: [{
                            width: '25%',
                            text: 'No.'
                        }, {
                                width: '5%',
                                text: ':'
                            }, {
                                width: '*',
                                text: unitReceiptNote.no
                            }]
                    }],
                style: ['size08']
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

    var thead = [{
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
            style: ['size08', 'center']
        }, {
                text: item.product.code + " - " + item.product.name,
                style: ['size08', 'left']
            }, {
                text: parseFloat(item.deliveredQuantity).toLocaleString(locale, locale.decimal),
                style: ['size08', 'center']
            }, {
                text: item.deliveredUom.unit,
                style: ['size08', 'center']
            }, {
                text: item.remark || '',
                style: ['size08', 'left']
            }];
    });

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada barang",
            style: ['size08', 'center'],
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
                text: `Sukoharjo, ${moment(unitReceiptNote.date).format(locale.date.format)}`,
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
            style: ['size08']
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
                fontSize: 8,
                color: 'black',
                alignment: 'center'
            }
        }
    };

    return dd;
}