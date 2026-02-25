import PDFDocument from 'pdfkit';

class SalesReportPdfService {
    constructor() {
        this.doc = null;
    }

    generateReport(orders, stats, dateRange, refundedOrders = []) {
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
                
                if (refundedOrders.length > 0) {
                    this.doc.addPage();
                    this.generateRefundsSection(refundedOrders);
                }

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
            .text(`Delivered Orders: ${stats.deliveredOrderCount}`)
            .text(`Refunded Orders: ${stats.refundedOrderCount}`)
            .text(`Cancelled Orders: ${stats.cancelledOrderCount}`)
            .moveDown(0.5)
            .text(`Gross Sales: ₹${stats.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
            .text(`Coupon Discount: -₹${stats.totalCouponDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
            .text(`Wallet Discount: -₹${stats.totalWalletDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
            .text(`Total Discount: -₹${stats.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        
        this.doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text(`Delivered Sales: ₹${stats.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { underline: true })
            .moveDown(0.3);
        
        this.doc
            .fontSize(11)
            .font('Helvetica')
            .fillColor('#dc2626')
            .text(`Total Refunds: -₹${stats.totalRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
            .fillColor('#000000')
            .moveDown(0.3);
        
        this.doc
            .fontSize(13)
            .font('Helvetica-Bold')
            .fillColor('#059669')
            .text(`Net Sales: ₹${stats.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { underline: true })
            .fillColor('#000000')
            .moveDown(1.5);
    }

    generateOrdersTable(orders) {
        this.doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Order Details', { underline: true })
            .moveDown(0.5);

        const columns = {
            orderId: { x: 50, width: 70 },
            date: { x: 125, width: 65 },
            customer: { x: 195, width: 90 },
            amount: { x: 290, width: 65 },
            discount: { x: 360, width: 65 },
            payment: { x: 430, width: 60 },
            status: { x: 495, width: 60 }
        };

        const tableTop = this.doc.y;
        this.doc.fontSize(9).font('Helvetica-Bold');
        
        this.doc
            .text('Order ID', columns.orderId.x, tableTop, { width: columns.orderId.width, align: 'left' })
            .text('Date', columns.date.x, tableTop, { width: columns.date.width, align: 'left' })
            .text('Customer', columns.customer.x, tableTop, { width: columns.customer.width, align: 'left' })
            .text('Amount', columns.amount.x, tableTop, { width: columns.amount.width, align: 'right' })
            .text('Discount', columns.discount.x, tableTop, { width: columns.discount.width, align: 'right' })
            .text('Payment', columns.payment.x, tableTop, { width: columns.payment.width, align: 'left' })
            .text('Status', columns.status.x, tableTop, { width: columns.status.width, align: 'left' });

        this.generateHr(tableTop + 15);
        this.doc.moveDown(1);

        this.doc.font('Helvetica').fontSize(8);
        
        orders.forEach((order) => {
            if (this.doc.y > 700) {
                this.doc.addPage();
                this.doc.y = 50;
            }

            const rowY = this.doc.y;
            const orderDiscount = (order.couponDiscount || 0) + (order.walletAmountUsed || 0);
            
            this.doc
                .text(order.orderNumber, columns.orderId.x, rowY, { width: columns.orderId.width, align: 'left' })
                .text(order.createdAt.toLocaleDateString('en-IN'), columns.date.x, rowY, { width: columns.date.width, align: 'left' })
                .text((order.userId?.fullName || 'Guest').substring(0, 12), columns.customer.x, rowY, { width: columns.customer.width, align: 'left' })
                .text(`₹${order.totalAmount.toFixed(2)}`, columns.amount.x, rowY, { width: columns.amount.width, align: 'right' })
                .text(`₹${orderDiscount.toFixed(2)}`, columns.discount.x, rowY, { width: columns.discount.width, align: 'right' })
                .text(order.paymentMethod.substring(0, 8).toUpperCase(), columns.payment.x, rowY, { width: columns.payment.width, align: 'left' })
                .text(order.orderStatus.substring(0, 10), columns.status.x, rowY, { width: columns.status.width, align: 'left' });
            
            this.doc.y = rowY + 18;
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

    generateRefundsSection(refundedOrders) {
        this.doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Refunded Orders', { underline: true })
            .moveDown(0.5);

        const columns = {
            orderId: { x: 50, width: 70 },
            date: { x: 125, width: 65 },
            customer: { x: 195, width: 90 },
            amount: { x: 290, width: 65 },
            refund: { x: 360, width: 65 },
            status: { x: 430, width: 70 }
        };

        const tableTop = this.doc.y;
        this.doc.fontSize(9).font('Helvetica-Bold');
        
        this.doc
            .text('Order ID', columns.orderId.x, tableTop, { width: columns.orderId.width, align: 'left' })
            .text('Date', columns.date.x, tableTop, { width: columns.date.width, align: 'left' })
            .text('Customer', columns.customer.x, tableTop, { width: columns.customer.width, align: 'left' })
            .text('Amount', columns.amount.x, tableTop, { width: columns.amount.width, align: 'right' })
            .text('Refund', columns.refund.x, tableTop, { width: columns.refund.width, align: 'right' })
            .text('Status', columns.status.x, tableTop, { width: columns.status.width, align: 'left' });

        this.generateHr(tableTop + 15);
        this.doc.moveDown(1);

        this.doc.font('Helvetica').fontSize(8);
        
        refundedOrders.forEach((order) => {
            if (this.doc.y > 700) {
                this.doc.addPage();
                this.doc.y = 50;
            }

            const rowY = this.doc.y;
            
            this.doc
                .text(order.orderNumber, columns.orderId.x, rowY, { width: columns.orderId.width, align: 'left' })
                .text(order.createdAt.toLocaleDateString('en-IN'), columns.date.x, rowY, { width: columns.date.width, align: 'left' })
                .text((order.userId?.fullName || 'Guest').substring(0, 12), columns.customer.x, rowY, { width: columns.customer.width, align: 'left' })
                .text(`₹${order.totalAmount.toFixed(2)}`, columns.amount.x, rowY, { width: columns.amount.width, align: 'right' })
                .fillColor('#dc2626')
                .text(`₹${(order.refundAmount || 0).toFixed(2)}`, columns.refund.x, rowY, { width: columns.refund.width, align: 'right' })
                .fillColor('#000000')
                .text(order.orderStatus.substring(0, 10), columns.status.x, rowY, { width: columns.status.width, align: 'left' });
            
            this.doc.y = rowY + 18;
        });
    }
}

export default SalesReportPdfService;
