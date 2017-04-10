var global = require("../../global");

module.exports = function (qualityControl) {

    var items = [].concat.apply([], qualityControl.fabricGradeTests);

    var iso = "Nomor ISO";

    var locale = global.config.locale;

    var moment = require("moment");
    moment.locale(locale.name);

    var shiftIm = qualityControl.shiftIm ? qualityControl.shiftIm : "";
    var operatorIm = qualityControl.operatorIm ? qualityControl.operatorIm : "";
    var machineNoIm = qualityControl.machineNoIm ? qualityControl.machineNoIm : "";
    var cartNo = qualityControl.cartNo ? qualityControl.cartNo : "";
    var productionOrderNo = qualityControl.productionOrderNo ? qualityControl.productionOrderNo : "";
    var productionOrderType = qualityControl.productionOrderType ? qualityControl.productionOrderType : "";
    var construction = qualityControl.construction ? qualityControl.construction : "";
    var buyer = qualityControl.buyer ? qualityControl.buyer : "";
    var color = qualityControl.color ? qualityControl.color : "";
    var orderQuantity = qualityControl.orderQuantity ? qualityControl.orderQuantity : "";
    var packingInstruction = qualityControl.packingInstruction ? qualityControl.packingInstruction : "";
    var uom = qualityControl.uom ? qualityControl.uom : "";

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
            text: `${moment(qualityControl.dateIm).format("DD MMMM YYYY")}`,
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
            text: `${shiftIm}`,
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
            text: `${operatorIm}`,
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
            text: `${machineNoIm}`,
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
            text: `${cartNo}`,
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
            text: `${productionOrderNo}`,
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
            text: `${productionOrderType}`,
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
            text: `${construction}`,
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
            text: `${buyer}`,
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
            text: `${color}`,
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
            text: `${orderQuantity} ${uom}`,
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
            text: `${packingInstruction}`,
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
            text: `${item.initLength} YDS`,
            style: ["size08"],
            alignment: "left"
        },
        {
            text: `${item.width} YDS`,
            style: ["size08"],
            alignment: "left"
        },
        {
            text: `${item.avalLength} YDS`,
            style: ["size08"],
            alignment: "left"
        },
        {
            text: `${item.sampleLength} YDS`,
            style: ["size08"],
            alignment: "left"
        },
        {
            text: `${item.finalScore}`,
            style: ["size08"],
            alignment: "left"
        },
        {
            text: `${item.grade}`,
            style: ["size08"],
            alignment: "left"
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

    var tfoot2 = [
        [{
            text: "ADMIN QC",
            bold: true,
            fontSize: 8,
            color: 'black',
            alignment: 'center'
        },
        {
            text: "KABAG QC",
            bold: true,
            fontSize: 8,
            color: 'black',
            alignment: 'center'
        },
        {
            text: "KASUBSIE QC",
            bold: true,
            fontSize: 8,
            color: 'black',
            alignment: 'center'
        }]
    ];

    var table2 = [{
        table: {
            widths: ["33%", "33%", "34%"],
            headerRows: 1,
            body: [].concat([thead2], tbody2, tfoot2)
        }
    }];

    var Qc = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 130, 40, 40],
        content: [].concat(header, body, "\n", "\n", table, "\n", "\n", table2),
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