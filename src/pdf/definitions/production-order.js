var global = require('../../global');

module.exports = function (productionOrder) {

    var details = [].concat.apply([], productionOrder.details);

    var lampStandards = [].concat.apply([], productionOrder.lampStandards);

    var iso = "FM-PJ-00-03-021";

    var locale = global.config.locale; 

    var number=productionOrder.orderNo;

    var spelling=productionOrder.shippingQuantityTolerance;
    var orderQuantity=productionOrder.orderQuantity;
    var spellOrder=((spelling/100)*orderQuantity)+orderQuantity;
    var runWidth=productionOrder.RUNWidth.toString();

    var moment = require('moment');
    moment.locale(locale.name); 

    var header = [{
        columns: [{
            columns: [{
                width: '*',
                stack: [{
                    text: iso,
                    style: ['size07','bold'],
                    alignment: "right"
                }, {
                        text: 'SURAT PERINTAH PRODUKSI',
                        style: ['size12','bold'],
                        alignment: "center"
                    }]
            }]

        }]
    },'\n'];

    var thead=[];
    var tbody=[];
    var tfoot=[];
    var table=[];
    var remark=productionOrder.remark;
    var remarks=productionOrder.remark.split(" ");
    for(var i=0; i<remarks.length; i++){
        if(remarks[i].length>21)
            remarks[i]=remarks[i].replace(/(.{20})/g,"$&" + '\n');
    }
    remark=remarks.toString().replace(/,/g, " ");

    var packing=productionOrder.packingInstruction;
    var packings=productionOrder.packingInstruction.split(" ");
    for(var i=0; i<packings.length; i++){
        if(packings[i].length>21)
            packings[i]=packings[i].replace(/(.{20})/g,"$&" + '\n');
    }
    packing=packings.toString().replace(/,/g, " ");

    if(productionOrder.orderType.name.trim().toLowerCase()=="printing" || productionOrder.orderType.name.toLowerCase()=="yarn dyed")
    {
        thead = [{
                text: 'Acuan/Color Way',
                style: 'tableHeader'
            },{
                text: 'Warna yang Diminta',
                style: 'tableHeader'
            },{
                text: 'Jumlah',
                style: 'tableHeader'
            }];
            
        tfoot = [[{
            text: 'Total',
            style: 'tableHeader',
            colSpan:2
        }, "", {
                text: parseFloat(productionOrder.orderQuantity).toLocaleString(locale) +" "+productionOrder.uom.unit,
                style: 'tableHeader'
            }]];

        tbody = details.map(function (detail, index) {
            var colorReq=detail.colorRequest;
            var colorTemplate=detail.colorTemplate;
            var words=detail.colorRequest.split(" ");
            var words2=detail.colorTemplate.split(" ");
            for(var i=0; i<words.length; i++){
                if(words[i].length>10)
                    words[i]=words[i].replace(/(.{9})/g,"$&" + '\n');
            }
            for(var i=0; i<words2.length; i++){
                if(words2[i].length>10)
                    words2[i]=words2[i].replace(/(.{9})/g,"$&" + '\n');
            }
            colorReq=words.toString().replace(/,/g, " ");
            colorTemplate=words2.toString().replace(/,/g, " ")
            return [{
                text: colorTemplate ,
                style: ['size07', 'center']
            },{
                text: colorReq ,
                style: ['size07', 'center'],
            },{
                text: parseFloat(detail.quantity).toLocaleString(locale) + " "+detail.uom.unit ,
                style: ['size07', 'center']
            } ]
        });

        tbody = tbody.length > 0 ? tbody : [
            [{
                text: "tidak ada detail",
                style: ['size07', 'center'],
                colSpan: 3
            }, "", ""]
        ];

        table = [{
            table: {
                widths: ['35%', '35%', '30%'],
                headerRows: 1,
                body: [].concat([thead], tbody,tfoot),

            }
        }];
    }
   else{
        thead = [{
                text: 'Acuan/Color Way',
                style: 'tableHeader'
            },{
                text: 'Warna yang Diminta',
                style: 'tableHeader'
            }, 
            {
                text: 'Jenis Warna',
                style: 'tableHeader'
            }, {
                text: 'Jumlah',
                style: 'tableHeader'
            }];
            
        tfoot = [[{
            text: 'Total',
            style: 'tableHeader',
            colSpan:3
        }, "", "", {
                text: parseFloat(productionOrder.orderQuantity).toLocaleString(locale) +" "+productionOrder.uom.unit,
                style: 'tableHeader'
            }]];

        tbody = details.map(function (detail, index) {
            var colorReq=detail.colorRequest;
            var colorTemplate=detail.colorTemplate;
            var words=detail.colorRequest.split(" ");
            var words2=detail.colorTemplate.split(" ");
            for(var i=0; i<words.length; i++){
                if(words[i].length>8)
                    words[i]=words[i].replace(/(.{7})/g,"$&" + '\n');
            }
            for(var i=0; i<words2.length; i++){
                if(words2[i].length>8)
                    words2[i]=words2[i].replace(/(.{7})/g,"$&" + '\n');
            }
            colorReq=words.toString().replace(/,/g, " ");
            colorTemplate=words2.toString().replace(/,/g, " ")
            
            return [{
                text: colorTemplate ,
                style: ['size07', 'center']
            },{
                text: colorReq ,
                style: ['size07', 'center'],
            },{
                text: detail.colorType.name ,
                style: ['size07', 'center']
            },{
                text: parseFloat(detail.quantity).toLocaleString(locale) + " "+detail.uom.unit ,
                style: ['size07', 'center']
            } ]
        });

        tbody = tbody.length > 0 ? tbody : [
            [{
                text: "tidak ada detail",
                style: ['size07', 'center'],
                colSpan: 4
            }, "", "",""]
        ];

        table = [{
            table: {
                widths: ['25%', '25%', '25%','25%'],
                headerRows: 1,
                body: [].concat([thead], tbody,tfoot)
            }
        }];
    }

    var datas=[];
    if(productionOrder.orderType.name.trim().toLowerCase()=="printing"){
        datas=[{
                columns: [
                    {
                        width: '40%',
                        text: 'No. Sales Contract'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.salesContractNo
                    }]
            },{
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
                        text: 'Tipe Buyer'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.buyer.type
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
                        text: 'Konstruksi Material'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.materialConstruction.name
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Nomor Benang Material'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.yarnMaterial.name
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Lebar Material'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.materialWidth
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
                        text: 'Jumlah Order'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:parseFloat(orderQuantity).toLocaleString(locale) + " " + productionOrder.uom.unit
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Jumlah Order + Toleransi Jumlah Kirim'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:parseFloat(spellOrder).toLocaleString(locale)+" " + productionOrder.uom.unit
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Asal Material'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.materialOrigin
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
                        text: 'Jenis Finish'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.finishType.name
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Kode Design'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.designCode
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Nomor Design'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.designNumber
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
                        text: 'Lebar RUN (cm)'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:runWidth
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Tulisan Pinggir Kain'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.articleFabricEdge
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
                        text: 'Standar Test'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.standardTest.name, 
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
                        text: 'Packing Instruction'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:packing
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
                        text: 'Keterangan'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:remark
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Nama Staff Penjualan'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.account.username
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
                        text:`${moment(productionOrder._createdDate).format(locale.date.format)}`
                    }]
            }
        ];
    }
    else{ //jika jenis order != PRINTING
        datas=[{
                columns: [
                    {
                        width: '40%',
                        text: 'No. Sales Contract'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.salesContractNo
                    }]
            }, {
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
                        text: 'Tipe Buyer'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.buyer.type
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
                        text: 'Konstruksi Material'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.materialConstruction.name
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Nomor Benang Material'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.yarnMaterial.name
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Lebar Material'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.materialWidth
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
                        text: 'Jumlah Order'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:parseFloat(orderQuantity).toLocaleString(locale) + " " + productionOrder.uom.unit
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Jumlah Order + Toleransi Jumlah Kirim'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:parseFloat(spellOrder).toLocaleString(locale)+" " + productionOrder.uom.unit
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Asal Material'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.materialOrigin
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
                        text: 'Jenis Finish'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.finishType.name
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
                        text: 'Standar Test'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.standardTest.name, 
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
                        text: 'Packing Instruction'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:packing
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
                        text: 'Keterangan'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:remark
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: 'Nama Staff Penjualan'
                    }, {
                        width: '3%',
                        text:':'
                    },
                    {
                        width: '*',
                        text:productionOrder.account.username
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
                        text:`${moment(productionOrder._createdDate).format(locale.date.format)}`
                    }]
            }
        ];
    }
    var lampList=[];
        for(var lamp of productionOrder.lampStandards){
            lampList.push(lamp.lampStandard.name + "\n");
        }
    
    var Lampthead = [{
                text: 'Standar Lampu',
                style: 'tableHeader'
            }];
            
       var Lamptbody = lampStandards.map(function (lamp, index) {
            return [{
                text: lamp.lampStandard.name ,
                style: ['size07', 'left']
            } ]
        });


        var Lamptable = [{
            table: {
                widths: ['100%'],
                headerRows: 1,
                body: [].concat([Lampthead], Lamptbody)
            }
        }];
    
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

    var Table=[{
        table:{
            widths: ['55%', '45%'],
            body:[
                [{
                    stack:[datas],
                    style: ['size07']
                    },
                    {stack:[Lamptable,'\n',table]}
                ],
                [
                    {
                        colSpan:2,
                        stack:['\n','\n',table2]
                    },''
                ]
            ]
        },
        layout: 'noBorders'
    }];

   
    var pr = {
        pageSize: 'A5',
        pageOrientation: 'portrait',
        pageMargins: 20,
        content: [].concat(header, Table),
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