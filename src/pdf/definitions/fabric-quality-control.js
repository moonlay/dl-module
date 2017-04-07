var global = require("../../global");

module.exports = function (qualityControl) {

    var items = [].concat.apply([], qualityControl.fabricGradeTests);

    var iso = "Nomor ISO";

    var moment = require("moment");
    moment.locale(locale.name);

    var header = [{
        columns: [{
            width: "*",
            stack: [{
                text: iso,
                style: ["size09"],
                alignment: "right"
            }, "\n",
            {
                text: "Pemeriksaan Kain",
                style: ["size11", "bold"],
                alignment: "center"
            }]
        }]
    }, "\n"];

    var body = [{
        columns: [{
            width: "25%",
            text: "Tanggal IM",
            style: ["size09"]
        },
        {
            width: "3%",
            text: ":",
            style: ["size09"]
        },
        {
            width: "*",
            text: `${moment(qualityControl.dateIm).format("MMMM DD, YYYY")}`,
            style: ["size09"]
        }]
    },
    {
        columns: [{
            width: "25%",
            text: "Shift",
            style: ["size09"]
        },
        {
            width: "3%",
            text: ":",
            style: ["size09"]
        },
        {
            width: "*",
            text: `${qualityControl.shiftIm}`,
            style: ["size09"]
        }]
    },
    {
        columns: [{
            width: "25%",
            text: "Operator IM",
            style: ["size09"]
        },
        {
            width: "3%",
            text: ":",
            style: ["size09"]
        },
        {
            width: "*",
            text: `${qualityControl.operatorIm}`,
            style: ["size09"]
        }]
    },
    {
        columns: [{
            width: "25%",
            text: "Nomor Mesin IM",
            style: ["size09"]
        },
        {
            width: "3%",
            text: ":",
            style: ["size09"]
        },
        {
            width: "*",
            text: `${qualityControl.machineNoIm}`,
            style: ["size09"]
        }]
    },
    {
        columns: [{
            width: "25%",
            text: "Nomor Kereta",
            style: ["size09"]
        },
        {
            width: "3%",
            text: ":",
            style: ["size09"]
        },
        {
            width: "*",
            text: `${qualityControl.cartNo}`,
            style: ["size09"]
        }]
    },
    {
        columns: [{
            width: "25%",
            text: "Nomor Order",
            style: ["size09"]
        },
        {
            width: "3%",
            text: ":",
            style: ["size09"]
        },
        {
            width: "*",
            text: `${qualityControl.productionOrderNo}`,
            style: ["size09"]
        }]
    },
    {
        columns: [{
            width: "25%",
            text: "Jenis Order",
            style: ["size09"]
        },
        {
            width: "3%",
            text: ":",
            style: ["size09"]
        },
        {
            width: "*",
            text: `${qualityControl.productionOrderType}`,
            style: ["size09"]
        }]
    },
    {
        columns: [{
            width: "25%",
            text: "Konstruksi",
            style: ["size09"]
        },
        {
            width: "3%",
            text: ":",
            style: ["size09"]
        },
        {
            width: "*",
            text: `${qualityControl.construction}`,
            style: ["size09"]
        }]
    },
    {
        columns: [{
            width: "25%",
            text: "Buyer",
            style: ["size09"]
        },
        {
            width: "3%",
            text: ":",
            style: ["size09"]
        },
        {
            width: "*",
            text: `${qualityControl.buyer}`,
            style: ["size09"]
        }]
    },
    {
        columns: [{
            width: "25%",
            text: "Warna",
            style: ["size09"]
        },
        {
            width: "3%",
            text: ":",
            style: ["size09"]
        },
        {
            width: "*",
            text: `${qualityControl.color}`,
            style: ["size09"]
        }]
    },
    {
        columns: [{
            width: "25%",
            text: "Jumlah Order",
            style: ["size09"]
        },
        {
            width: "3%",
            text: ":",
            style: ["size09"]
        },
        {
            width: "*",
            text: `${qualityControl.orderQuantity} ${qualityControl.uom}`,
            style: ["size09"]
        }]
    },
    {
        columns: [{
            width: "25%",
            text: "Packing Instruction",
            style: ["size09"]
        },
        {
            width: "3%",
            text: ":",
            style: ["size09"]
        },
        {
            width: "*",
            text: `${qualityControl.packingInstruction}`,
            style: ["size09"]
        }]
    }];

    var thead = [{
        text: "No Pcs",
        style: "tableHeader"
    },
    {
        text: "Panjang Pcs",
        style: "tableHeader"
    },
    {
        text: "Lebar Pcs",
        style: "tableHeader"
    },
    {
        text: "Aval",
        style: "tableHeader"
    },
    {
        text: "Sampel",
        style: "tableHeader"
    },
    {
        text: "Nilai",
        style: "tableHeader"
    },
    {
        text: "Grade",
        style: "tableHeader"
    }];

    var tbody = items.map((item) => {
        return [{
            text: `${item.pcsNo}`,
            style: ["size08"],
            alignment: "left"
        },
        {
            text: `${item.initLength}`,
            style: ["size08"],
            alignment: left
        },
        {
            text: `${item.width}`,
            style: ["size08"],
            alignment: left
        },
        {
            text: `${item.avalLength}`,
            style: ["size08"],
            alignment: left
        },
        {
            text: `${item.sampleLength}`,
            style: ["size08"],
            alignment: left
        },
        {
            text: `${item.score}`,
            style: ["size08"],
            alignment: left
        },
        {
            text: `${item.grade}`,
            style: ["size08"],
            alignment: left
        }]
    });

    var tfoot = [
        [{
            text: " ",
            style: ['size08'],
            alignment: "center"
        }, "", "", "", "", "", ""]
    ];

    var table = [{
        table: {
            widths: ["10%", "15%", "15%", "15%", "15%", "15%", "15%"],
            headerRows: 1,
            body: [].concat([thead], tbody, tfoot)
        }
    }];

    var thead2 = [{
        text: "Dibuat Oleh",
        style: "tableHeader"
    },
    {
        text: "Mengetahui",
        style: "tableHeader"
    },
    {
        text: "Menyetujui",
        style: "tableHeader"
    }];

    var tbody2 = [
        [{
            text: " ",
            style: ["size30"],
            alignment: "center"
        }, "", ""]
    ];

    var table2 = [{
        table: {
            widths: ["33.3%", "33.3%", "33.4%"],
            headerRows: 1,
            body: [].concat([thead], tbody, tfoot)
        }
    }];

    var Qc = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 130, 40, 40],
        content: [].concat(header, body, table, table2),
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

    return Qc;
}