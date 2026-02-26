import PDFDocument from 'pdfkit';


class InvoiceService {
    constructor() {
        this.doc = null;
    }

    generateInvoice(order, user) {
        return new Promise((resolve, reject) => {
            try {
                // Create a new PDF document
                this.doc = new PDFDocument({ margin: 50 });
                
                // Buffer to store PDF data
                const buffers = [];
                this.doc.on('data', buffers.push.bind(buffers));
                this.doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });

                // Generate invoice content
                this.generateHeader();
                this.generateCustomerInformation(order, user);
                this.generateInvoiceTable(order);
                this.generateFooter();

                // Finalize the PDF
                this.doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    generateHeader() {
        this.doc
            .fillColor('#444444')
            .fontSize(20)
            .text('GEARGRID', 50, 45)
            .fontSize(10)
            .text('Your Premium Tech Store', 200, 50, { align: 'right' })
            .text('123 Tech Street', 200, 65, { align: 'right' })
            .text('Bangalore, KA, 560001', 200, 80, { align: 'right' })
            .text('India', 200, 95, { align: 'right' })
            .moveDown();
    }

  generateCustomerInformation(order, user) {
    const customerInformationTop = 200;

    this.doc
        .fillColor('#444444')
        .fontSize(20)
        .text('Invoice', 50, 160);

    this.generateHr(185);

    const customerInformationLeft = 50;
    const customerInformationRight = 350;

    this.doc
        .fontSize(10)
        .text('Invoice Number:', customerInformationLeft, customerInformationTop)
        .font('Helvetica-Bold')
        .text(order.orderNumber, customerInformationLeft + 100, customerInformationTop)
        .font('Helvetica')
        .text('Invoice Date:', customerInformationLeft, customerInformationTop + 18)
        .text(this.formatDate(order.createdAt), customerInformationLeft + 100, customerInformationTop + 18)
        .text('Payment Method:', customerInformationLeft, customerInformationTop + 36)
        .text(order.paymentMethod.toUpperCase(), customerInformationLeft + 100, customerInformationTop + 36)

        .font('Helvetica-Bold')
        .text('Bill To:', customerInformationRight, customerInformationTop)
        .font('Helvetica')
        .text(order.shippingAddress.fullName, customerInformationRight, customerInformationTop + 18)
        .text(order.shippingAddress.streetAddress, customerInformationRight, customerInformationTop + 36)
        .text('', customerInformationRight, customerInformationTop + 54)  // Plathara
        
        .text(order.shippingAddress.state, customerInformationRight, customerInformationTop + 64)  // Kerala
        .text(`${order.shippingAddress.pinCode}, ${order.shippingAddress.country}`, customerInformationRight, customerInformationTop + 74)
        .text(`Phone: ${order.shippingAddress.phone}`, customerInformationRight, customerInformationTop + 90)
        .moveDown();

    this.generateHr(customerInformationTop + 160); // More space before the table
}


    generateInvoiceTable(order) {
    let i;
    const invoiceTableTop = 380;

    // Table headers
    this.doc.font('Helvetica-Bold');
    this.generateTableRow(
        invoiceTableTop,
        'Item',
        'Description',
        'Unit Cost',
        'Quantity',
        'Line Total'
    );
    this.generateHr(invoiceTableTop + 20);
    this.doc.font('Helvetica');

    // Table rows
    let position = invoiceTableTop + 30;
    for (i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const productName = item.productId.productName || 'Product';
        let description = `Color: ${item.variantId?.color || 'N/A'}`;
        
        // Add status indicator for cancelled/returned items
        if (item.status === 'cancelled') {
            description += ' [CANCELLED]';
        } else if (item.status === 'returned') {
            description += ' [RETURNED]';
        }
        
        this.generateTableRow(
            position,
            productName,
            description,
            this.formatCurrency(item.price),
            item.quantity,
            this.formatCurrency(item.totalPrice)
        );

        position += 30;
    }

    this.generateHr(position + 20);

    // Calculate totals
    const activeItems = order.items.filter(item => item.status === 'active');
    const cancelledItems = order.items.filter(item => item.status === 'cancelled');
    const returnedItems = order.items.filter(item => item.status === 'returned');
    const originalTotal = order.snapshotFinalTotal || order.originalTotalAmount || order.totalAmount;

    // Subtotal
    const subtotalPosition = position + 30;
    this.generateTableRow(
        subtotalPosition,
        '',
        '',
        'Subtotal',
        '',
        this.formatCurrency(order.subtotal)
    );

    let currentPosition = subtotalPosition + 20;

    // Show coupon discount if applied
    if (order.couponCode && order.snapshotCouponDiscount > 0) {
        this.doc.fillColor('#22c55e');
        this.generateTableRow(
            currentPosition,
            '',
            '',
            `Coupon (${order.couponCode})`,
            '',
            '-' + this.formatCurrency(order.snapshotCouponDiscount)
        );
        this.doc.fillColor('#444444');
        currentPosition += 20;
    }

    // Show cancelled items total if any
    if (cancelledItems.length > 0) {
        const cancelledTotal = cancelledItems.reduce((sum, item) => sum + item.totalPrice, 0);
        this.doc.fillColor('#ef4444');
        this.generateTableRow(
            currentPosition,
            '',
            '',
            `Cancelled Items (${cancelledItems.length})`,
            '',
            '-' + this.formatCurrency(cancelledTotal)
        );
        this.doc.fillColor('#444444');
        currentPosition += 20;
    }

    // Show returned items total if any
    if (returnedItems.length > 0) {
        const returnedTotal = returnedItems.reduce((sum, item) => sum + item.totalPrice, 0);
        this.doc.fillColor('#f97316');
        this.generateTableRow(
            currentPosition,
            '',
            '',
            `Returned Items (${returnedItems.length})`,
            '',
            '-' + this.formatCurrency(returnedTotal)
        );
        this.doc.fillColor('#444444');
        currentPosition += 20;
    }

    // Shipping
    this.generateTableRow(
        currentPosition,
        '',
        '',
        'Shipping',
        '',
        order.shippingCost === 0 ? 'FREE' : this.formatCurrency(order.shippingCost)
    );
    currentPosition += 20;

    // Tax
    this.generateTableRow(
        currentPosition,
        '',
        '',
        'Tax',
        '',
        this.formatCurrency(order.tax)
    );
    currentPosition += 25;

    // Original Total (if different from current)
    if (cancelledItems.length > 0 || returnedItems.length > 0) {
        this.doc.font('Helvetica');
        this.generateTableRow(
            currentPosition,
            '',
            '',
            'Original Total',
            '',
            this.formatCurrency(originalTotal)
        );
        currentPosition += 20;
    }

    // Current Total
    this.doc.font('Helvetica-Bold');
    this.generateTableRow(
        currentPosition,
        '',
        '',
        cancelledItems.length > 0 || returnedItems.length > 0 ? 'Current Total' : 'Total',
        '',
        this.formatCurrency(order.totalAmount)
    );
    currentPosition += 25;

    // Show refund information if any
    if (order.refundAmount > 0) {
        this.doc.font('Helvetica').fillColor('#22c55e');
        this.generateTableRow(
            currentPosition,
            '',
            '',
            'Total Refunded',
            '',
            this.formatCurrency(order.refundAmount)
        );
        this.doc.fillColor('#444444');
        currentPosition += 20;
    }

    // Show coupon invalidation notice if applicable
    if (order.couponCode && !order.couponValid && order.couponInvalidationReason) {
        currentPosition += 10;
        this.doc
            .fontSize(9)
            .fillColor('#f59e0b')
            .text('Note: ' + order.couponInvalidationReason, 50, currentPosition, { width: 500, align: 'right' })
            .fillColor('#444444')
            .fontSize(10);
    }

    this.doc.font('Helvetica');
}


    generateFooter() {
        const footerTop = 700;
        
        this.doc
            .fontSize(10)
            .text(
                'Thank you for your business with GEARGRID!',
                50,
                footerTop,
                { align: 'center', width: 500 }
            )
            .text(
                'For support, contact us at support@geargrid.com or +91 1234567890',
                50,
                footerTop + 15,
                { align: 'center', width: 500 }
            );
    }

    generateTableRow(y, item, description, unitCost, quantity, lineTotal) {
        this.doc
            .fontSize(10)
            .text(item, 50, y, { width: 90, align: 'left' })
            .text(description, 150, y, { width: 90, align: 'left' })
            .text(unitCost, 250, y, { width: 90, align: 'right' })
            .text(quantity, 350, y, { width: 90, align: 'right' })
            .text(lineTotal, 450, y, { width: 90, align: 'right' });
    }

    generateHr(y) {
        this.doc
            .strokeColor('#aaaaaa')
            .lineWidth(1)
            .moveTo(50, y)
            .lineTo(550, y)
            .stroke();
    }

    formatCurrency(amount) {
       return 'Rs. ' + amount.toLocaleString('en-IN');
    }

    formatDate(date) {
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
}

export default InvoiceService;
