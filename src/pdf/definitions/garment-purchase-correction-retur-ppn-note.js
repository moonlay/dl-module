var global = require('../../global');

module.exports = function (data, offset) {
    var header = [
        {
            text: 'PT. DAN LIRIS',
            style: ['size08', 'bold']
        },
        {
            stack: [
                'Head Office   : ',
                'Kelurahan Banaran, Kecamatan Grogol',
                'Sukoharjo 57193 - INDONESIA',
                'PO.BOX 166 Solo 57100',
                'Telp. (0271) 740888, 714400',
                'Fax. (0271) 735222, 740777'
            ],
            style: ['size07', 'bold']
        },
        {
            alignment: "center",
            text: 'NOTA KOREKSI PAJAK',
            style: ['size09', 'bold']
        },
        '\n'
    ];

    var locale = global.config.locale;
    var moment = require('moment');
    moment.locale(locale.name);

    var subHeader = [
        {
            columns: [{
                width: '15%',
                text: 'No. Nota Koreksi',
                style: ['size08']
            }, {
                width: '2%',
                text: ':',
                style: ['size08']
            }, {
                width: '33%',
                text: data.no,
                style: ['size08']
            },
            {
                width: '15%',
                text: 'Kode Supplier',
                style: ['size08']
            }, {
                width: '2%',
                text: ':',
                style: ['size08']
            }, {
                width: '33%',
                text: data.deliveryOrder.supplier.code,
                style: ['size08']
            }]
        },
        {
            columns: [
                {
                    width: '15%',
                    text: 'No. Nota Pajak',
                    style: ['size08']
                }, {
                    width: '2%',
                    text: ':',
                    style: ['size08']
                }, {
                    width: '33%',
                    text: data.invoiceIncomeTaxNo,
                    style: ['size08']
                }, {
                    width: '15%',
                    text: 'Nama Supplier',
                    style: ['size08']
                }, {
                    width: '2%',
                    text: ':',
                    style: ['size08']
                }, {
                    width: '33%',
                    text: data.deliveryOrder.supplier.name,
                    style: ['size08']
                }]
        }
    ];

    var thead = [
        {
            text: 'No. Surat Jalan',
            style: ['size08', 'bold', 'center']
        }, {
            text: 'Tgl. Surat Jalan',
            style: ['size08', 'bold', 'center']
        }, {
            text: 'Tgl. Jatuh Tempo',
            style: ['size08', 'bold', 'center']
        }, {
            text: 'No. Invoice',
            style: ['size08', 'bold', 'center']
        }, {
            text: 'Keterangan Barang',
            style: ['size08', 'bold', 'center']
        }, {
            text: 'Total PPN (Rp)',
            style: ['size08', 'bold', 'center']
        }
    ];

    var tbody = data.items.map(function (item, index) {
        return [{
            text: data.deliveryOrder.no,
            style: ['size08', 'left']
        }, {
            text: `${moment(item.date).add(offset, 'h').format("DD MMM YYYY")}`,
            style: ['size08', 'left']
        }, {
            text: `${moment(data.deliveryOrder.supplierDoDate).add(offset, 'h').format("DD MMM YYYY")}`,
            style: ['size08', 'left']
        }, {
            text: item.invoiceNo,
            style: ['size08', 'left']
        }, {
            text: `${item.product.code} ${item.product.name}`,
            style: ['size08', 'left']
        }, {
            text: parseFloat(item.totalCorrection * 0.1).toLocaleString(locale, locale.currency),
            style: ['size08', 'right']
        }];
    });
    var sum = data.items.map(item => item.totalCorrection * 0.1)
        .reduce(function (prev, curr, index, arr) {
            return prev + curr;
        }, 0);

    var tfoot = [
        [{
            text: 'Total PPN (Rp)',
            style: ['size08', 'bold', 'right'],
            colSpan: 5
        }, "", "", "", "", {
            text: parseFloat(sum).toLocaleString(locale, locale.currency),
            style: ['size08', 'bold', 'right']
        }]
    ];

    var table = [{
        table: {
            widths: ['15%', '15%', '15%', '15%', '15%', '25%'],
            headerRows: 1,
            body: [].concat([thead], tbody, tfoot)
        }
    }];

    var footer = ['\n\n\n', {
        table: {
            widths: ['25%', '25%', '25%', '25%'],
            body: [
                [
                    {
                        text: 'Staff Pembelian',
                        style: ['size08', 'bold', 'center']
                    }, {
                        text: 'Administrasi',
                        style: ['size08', 'bold', 'center']
                    }, {
                        text: 'Keuangan',
                        style: ['size08', 'bold', 'center']
                    }, {
                        text: 'Pembukuan',
                        style: ['size08', 'bold', 'center']
                    }
                ],
                [
                    {
                        stack: ['\n\n\n\n',
                            {
                                text: '(Nama & Tanggal)',
                                style: ['size08', 'center']
                            }
                        ]
                    }, {
                        stack: ['\n\n\n\n',
                            {
                                text: '(Nama & Tanggal)',
                                style: ['size08', 'center']
                            }
                        ]
                    }, {
                        stack: ['\n\n\n\n',
                            {
                                text: '(Nama & Tanggal)',
                                style: ['size08', 'center']
                            }
                        ]
                    }, {
                        stack: ['\n\n\n\n',
                            {
                                text: '(Nama & Tanggal)',
                                style: ['size08', 'center']
                            }
                        ]
                    }
                ]
            ],
            style: ['center']
        }
    }];

    var purchasePriceCorrectionPDFDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: 20,
        content: [].concat(header, subHeader, table, ['\n'], footer),
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
            }
        }
    };

    return purchasePriceCorrectionPDFDefinition;
}