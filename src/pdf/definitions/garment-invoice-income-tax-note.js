var global = require('../../global');

module.exports = function (data, offset) {

    var items = data.items.map(dataItem => {
        var _items = dataItem.items.map(item => {
            return {
                deliveryOrderNo: dataItem.deliveryOrderNo,
                date: dataItem.deliveryOrderSupplierDoDate,
                no: data.no,
                product: item.product.name,
                price: item.pricePerDealUnit * item.deliveredQuantity * 0.1,
            }
        });
        _items = [].concat.apply([], _items);
        return _items;
    });
    items = [].concat.apply([], items);

    var locale = global.config.locale;
    var moment = require('moment');
    moment.locale(locale.name);

    var header = [
        {
            text: 'PT. DAN LIRIS',
            style: ['size08', 'bold']
        },
        {
            stack: [
                'Head Office   : ',
                'Kelurahan Banaran',
                'Kecamatan Grogol',
                'Sukoharjo 57193 - INDONESIA',
                'PO.BOX 166 Solo 57100',
                'Telp. (0271) 740888, 714400',
                'Fax. (0271) 735222, 740777'
            ],
            style: ['size07', 'bold']
        },
        {
            alignment: "center",
            text: 'NOTA PAJAK PPN',
            style: ['size09', 'bold']
        },
        '\n'
    ];

    var subHeader = [
        {
            columns: [{
                width: '15%',
                text: 'No. Nota Pajak',
                style: ['size08']
            }, {
                width: '2%',
                text: ':',
                style: ['size08']
            }, {
                width: '*',
                text: data.incomeTaxInvoiceNo,
                style: ['size08']
            }]
        },
        {
            columns: [{
                width: '15%',
                text: 'Kode Supplier',
                style: ['size08']
            }, {
                width: '2%',
                text: ':',
                style: ['size08']
            }, {
                width: '*',
                text: data.supplier.code,
                style: ['size08']
            }]
        },
        {
            columns: [{
                width: '15%',
                text: 'Nama Supplier',
                style: ['size08']
            }, {
                width: '2%',
                text: ':',
                style: ['size08']
            }, {
                width: '*',
                text: data.supplier.name,
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
            text: 'No. Invoice',
            style: ['size08', 'bold', 'center']
        }, {
            text: 'Nama Barang',
            style: ['size08', 'bold', 'center']
        }, {
            text: 'Sub Total Pph',
            style: ['size08', 'bold', 'center']
        }
    ];

    var tbody = items.map(function (item, index) {
        return [{
            text: item.deliveryOrderNo,
            style: ['size08', 'left']
        }, {
            text: `${moment(item.date).add(offset, 'h').format("DD MMM YYYY")}`,
            style: ['size08', 'right']
        }, {
            text: item.no,
            style: ['size08', 'right']
        }, {
            text: item.product,
            style: ['size08', 'left']
        }, {
            text: parseFloat(item.price).toLocaleString(locale, locale.currency),
            style: ['size08', 'right']
        }];
    });

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada barang",
            style: ['size08', 'center'],
            colSpan: 5
        }, "", "", "", ""]
    ];

    var sum = items.map(item => item.price)
        .reduce(function (prev, curr, index, arr) {
            return prev + curr;
        }, 0);

    var tfoot = [
        [{
            text: 'Total Ppn',
            style: ['size08', 'bold', 'right'],
            colSpan: 4
        }, "", "", "", {
            text: parseFloat(sum).toLocaleString(locale, locale.currency),
            style: ['size08', 'bold', 'right']
        }]
    ];

    var table = [{
        table: {
            widths: ['15%', '15%', '15%', '30%', '25%'],
            headerRows: 1,
            body: [].concat([thead], tbody, tfoot)
        }
    }];

    var footer = ['\n\n\n\n\n', {
        table: {
            widths: ['33%', '33%', '33%'],
            body: [
                [
                    {
                        text: 'Administrasi',
                        style: ['size08', 'bold', 'center']
                    }, {
                        text: 'Staff Pembelian',
                        style: ['size08', 'bold', 'center']
                    }, {
                        text: 'Verifikasi',
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
                    }
                ]
            ]
        }
    }];

    var dd = {
        pageSize: 'A5',
        pageOrientation: 'portrait',
        pageMargins: 20,
        content: [].concat(header, subHeader, table, footer),
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

    return dd;
};