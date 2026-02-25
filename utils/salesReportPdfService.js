import PDFDocument from 'pdfkit';

class SalesReportPdfService {
    constructor() {
        this.doc = null;
    }

    generateReport(orders, stats, dateRange) {
        return new Promise((resolve, reject) => {
            try {
                this.doc = new PDFDocument({ margin: 50 });
                
                const buffers = [];
                this.doc.on('data', buffers.push.bind(buffers));
                this.doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });

                this.generateHeader(dateRange);
                this.generateSummary(stats);
                this.generateOrdersTable(orders);

                this.doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    generateHeader(dateRange) {
        this.doc
            .fontSize(24)
            .font('Helvetica-Bold')
            .text('SALES REPORT', { align: 'center' })
            .moveDown(0.5);
        
        this.doc
            .fontSize(10)
            .font('Helvetica')
            .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' })
            .moveDown(0.5);
        
        if (dateRange.start && dateRange.end) {
            this.doc
                .fontSize(11)
                .text(`Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`, { align: 'center' });
        } else {
            this.doc
                .fontSize(11)
                .text('Period: All Time', { align: 'center' });
        }
        
        this.doc.moveDown(1);
        this.generateHr(this.doc.y);
        this.doc.moveDown(1);
    }

    generateSummary(stats) {
        this.doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Summary', { underline: true })
            .moveDown(0.5);
        
        this.doc
            .fontSize(11)
            .font('Helvetica')
            .text(`Total Orders: ${stats.totalOrders}`)
            .text(`Gross Sales: ₹${stats.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
            .text(`Coupon Discount: -₹${stats.totalCouponDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
            .text(`Wallet Discount: -₹${stats.totalWalletDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
            .text(`Total Discount: -₹${stats.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        
        this.doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text(`Net Sales: ₹${stats.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { underline: true })
            .moveDown(1.5);
    }

    generateOrdersTable(orders) {
        this.doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Order Details', { underline: true })
            .moveDown(0.5);

        const tableTop = this.doc.y;
        this.doc.fontSize(9).font('Helvetica-Bold');
        
        this.doc
            .text('Order ID', 50, tableTop, { width: 80 })
            .text('Date', 130, tableTop, { width: 70 })
            .text('Customer', 200, tableTop, { width: 100 })
            .text('Amount', 300, tableTop, { width: 60, align: 'right' })
            .text('Discount', 360, tableTop, { width: 60, align: 'right' })
            .text('Payment', 420, tableTop, { width: 60 })
            .text('Status', 480, tableTop, { width: 70 });

        this.generateHr(this.doc.y + 5);
        this.doc.moveDown(0.5);

        this.doc.font('Helvetica').fontSize(8);
        
        orders.forEach((order) => {
            const y = this.doc.y;
            
            if (y > 700) {
                this.doc.addPage();
                this.doc.y = 50;
            }

            const orderDiscount = (order.couponDiscount || 0) + (order.walletAmountUsed || 0);
            
            this.doc
                .text(order.orderNumber, 50, this.doc.y, { width: 80 })
                .text(order.createdAt.toLocaleDateString(), 130, this.doc.y, { width: 70 })
                .text((order.userId?.fullName || 'Guest').substring(0, 15), 200, this.doc.y, { width: 100 })
                .text(`₹${order.totalAmount.toLocaleString('en-IN')}`, 300, this.doc.y, { width: 60, align: 'right' })
                .text(`₹${orderDiscount.toLocaleString('en-IN')}`, 360, this.doc.y, { width: 60, align: 'right' })
                .text(order.paymentMethod.toUpperCase(), 420, this.doc.y, { width: 60 })
                .text(order.orderStatus, 480, this.doc.y, { width: 70 });
            
            this.doc.moveDown(0.8);
        });
    }

    generateHr(y) {
        this.doc
            .strokeColor('#aaaaaa')
            .lineWidth(1)
            .moveTo(50, y)
            .lineTo(550, y)
            .stroke();
    }
}

export default SalesReportPdfService;
