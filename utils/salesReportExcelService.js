import ExcelJS from 'exceljs';

class SalesReportExcelService {
    constructor() {
        this.workbook = null;
        this.worksheet = null;
    }

    async generateReport(orders, stats, dateRange, refundedOrders = []) {
        try {
            this.workbook = new ExcelJS.Workbook();
            this.worksheet = this.workbook.addWorksheet('Sales Report');

            this.generateHeader(dateRange);
            this.generateSummary(stats);
            this.generateOrdersTable(orders);
            
            if (refundedOrders.length > 0) {
                this.generateRefundsTable(refundedOrders);
            }
            
            this.applyBorders();

            return this.workbook;

        } catch (error) {
            throw error;
        }
    }

    generateHeader(dateRange) {
        this.worksheet.mergeCells('A1:I1');
        this.worksheet.getCell('A1').value = 'SALES REPORT';
        this.worksheet.getCell('A1').font = { size: 16, bold: true };
        this.worksheet.getCell('A1').alignment = { horizontal: 'center' };

        this.worksheet.mergeCells('A2:I2');
        this.worksheet.getCell('A2').value = `Generated on: ${new Date().toLocaleString()}`;
        this.worksheet.getCell('A2').alignment = { horizontal: 'center' };

        if (dateRange.start && dateRange.end) {
            this.worksheet.mergeCells('A3:I3');
            this.worksheet.getCell('A3').value = `Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`;
            this.worksheet.getCell('A3').alignment = { horizontal: 'center' };
        }
    }

    generateSummary(stats) {
        this.worksheet.addRow([]);
        this.worksheet.addRow(['Summary']);
        this.worksheet.getCell('A5').font = { bold: true, size: 12 };
        
        this.worksheet.addRow(['Total Orders:', stats.totalOrders]);
        this.worksheet.addRow(['Delivered Orders:', stats.deliveredOrderCount]);
        this.worksheet.addRow(['Refunded Orders:', stats.refundedOrderCount]);
        this.worksheet.addRow(['Cancelled Orders:', stats.cancelledOrderCount]);
        this.worksheet.addRow([]);
        this.worksheet.addRow(['Gross Sales:', `₹${stats.grossSales.toFixed(2)}`]);
        this.worksheet.addRow(['Coupon Discount:', `-₹${stats.totalCouponDiscount.toFixed(2)}`]);
        this.worksheet.addRow(['Wallet Discount:', `-₹${stats.totalWalletDiscount.toFixed(2)}`]);
        this.worksheet.addRow(['Total Discount:', `-₹${stats.totalDiscount.toFixed(2)}`]);
        this.worksheet.addRow(['Delivered Sales:', `₹${stats.totalSales.toFixed(2)}`]);
        
        const refundRow = this.worksheet.addRow(['Total Refunds:', `-₹${stats.totalRefundAmount.toFixed(2)}`]);
        refundRow.getCell(2).font = { color: { argb: 'FFDC2626' } };
        
        const netSalesRow = this.worksheet.addRow(['Net Sales:', `₹${stats.netSales.toFixed(2)}`]);
        netSalesRow.font = { bold: true, color: { argb: 'FF059669' } };

        this.worksheet.addRow([]);
        this.worksheet.addRow([]);
    }

    generateOrdersTable(orders) {
        const headerRow = this.worksheet.addRow([
            'Order ID',
            'Date',
            'Customer',
            'Email',
            'Total Amount',
            'Coupon Discount',
            'Wallet Discount',
            'Payment Method',
            'Status'
        ]);

        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F2937' }
        };

        this.worksheet.columns = [
            { width: 20 },
            { width: 15 },
            { width: 20 },
            { width: 25 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 12 }
        ];

        orders.forEach(order => {
            this.worksheet.addRow([
                order.orderNumber,
                order.createdAt.toLocaleDateString(),
                order.userId?.fullName || 'Guest',
                order.userId?.email || 'N/A',
                `₹${order.totalAmount.toFixed(2)}`,
                `₹${(order.couponDiscount || 0).toFixed(2)}`,
                `₹${(order.walletAmountUsed || 0).toFixed(2)}`,
                order.paymentMethod.toUpperCase(),
                order.orderStatus
            ]);
        });
    }

    applyBorders() {
        this.worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });
    }

    generateRefundsTable(refundedOrders) {
        this.worksheet.addRow([]);
        this.worksheet.addRow(['Refunded Orders']);
        const titleCell = this.worksheet.lastRow.getCell(1);
        titleCell.font = { bold: true, size: 12 };
        this.worksheet.addRow([]);

        const headerRow = this.worksheet.addRow([
            'Order ID',
            'Date',
            'Customer',
            'Email',
            'Order Amount',
            'Refund Amount',
            'Payment Method',
            'Status'
        ]);

        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDC2626' }
        };

        refundedOrders.forEach(order => {
            const row = this.worksheet.addRow([
                order.orderNumber,
                order.createdAt.toLocaleDateString(),
                order.userId?.fullName || 'Guest',
                order.userId?.email || 'N/A',
                `₹${order.totalAmount.toFixed(2)}`,
                `₹${(order.refundAmount || 0).toFixed(2)}`,
                order.paymentMethod.toUpperCase(),
                order.orderStatus
            ]);
            
            row.getCell(6).font = { color: { argb: 'FFDC2626' } };
        });
    }
}

export default SalesReportExcelService;
