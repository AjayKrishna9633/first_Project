import Order from '../../models/orderModel.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { StatusCodes } from 'http-status-codes';

const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // 10 orders per page
        const skip = (page - 1) * limit;

        let query = { orderStatus: 'delivered' };

        // Date Filtering Logic
        let start, end;
        const now = new Date();

        if (period === 'daily') {
            start = new Date(now.setHours(0, 0, 0, 0));
            end = new Date(now.setHours(23, 59, 59, 999));
        } else if (period === 'weekly') {
            const currentDay = now.getDay();
            start = new Date(now);
            start.setDate(now.getDate() - currentDay);
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        } else if (period === 'monthly') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
        } else if (period === 'yearly') {
            start = new Date(now.getFullYear(), 0, 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), 11, 31);
            end.setHours(23, 59, 59, 999);
        } else if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }

        if (start && end) {
            query.createdAt = { $gte: start, $lte: end };
        }

        // Fetch all orders for statistics (without pagination)
        const allOrders = await Order.find(query);

        // Calculate Aggregates from all orders
        const totalSales = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalCouponDiscount = allOrders.reduce((sum, order) => sum + (order.couponDiscount || 0), 0);
        const totalWalletDiscount = allOrders.reduce((sum, order) => sum + (order.walletAmountUsed || 0), 0);
        const totalDiscount = totalCouponDiscount + totalWalletDiscount;
        const totalOrders = allOrders.length;
        const grossSales = totalSales + totalDiscount;

        // Fetch paginated orders for display
        const orders = await Order.find(query)
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalOrders / limit);

        // Render Sales Report Page
        res.render('admin/salesReport', {
            orders,
            totalSales,
            totalCouponDiscount,
            totalWalletDiscount,
            totalDiscount,
            grossSales,
            totalOrders,
            currentPage: page,
            totalPages,
            period: period || '',
            startDate: startDate || '',
            endDate: endDate || '',
            admin: req.session.admin
        });

    } catch (error) {
        console.error('Get sales report error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Server Error');
    }
};

const downloadPDF = async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        let query = { orderStatus: 'delivered' };

        let start, end;
        const now = new Date();
        if (period === 'daily') {
            start = new Date(now.setHours(0, 0, 0, 0));
            end = new Date(now.setHours(23, 59, 59, 999));
        } else if (period === 'weekly') {
            const currentDay = now.getDay();
            start = new Date(now);
            start.setDate(now.getDate() - currentDay);
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        } else if (period === 'monthly') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
        } else if (period === 'yearly') {
            start = new Date(now.getFullYear(), 0, 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), 11, 31);
            end.setHours(23, 59, 59, 999);
        } else if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }

        if (start && end) {
            query.createdAt = { $gte: start, $lte: end };
        }

        const orders = await Order.find(query)
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 });

        // Calculate totals
        const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalCouponDiscount = orders.reduce((sum, order) => sum + (order.couponDiscount || 0), 0);
        const totalWalletDiscount = orders.reduce((sum, order) => sum + (order.walletAmountUsed || 0), 0);
        const totalDiscount = totalCouponDiscount + totalWalletDiscount;
        const grossSales = totalSales + totalDiscount;

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('SALES REPORT', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(0.5);
        
        if (start && end) {
            doc.fontSize(11).text(`Period: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`, { align: 'center' });
        } else {
            doc.fontSize(11).text('Period: All Time', { align: 'center' });
        }
        
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(1);

        // Summary Section
        doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        doc.text(`Total Orders: ${orders.length}`);
        doc.text(`Gross Sales: ₹${grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        doc.text(`Coupon Discount: -₹${totalCouponDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        doc.text(`Wallet Discount: -₹${totalWalletDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        doc.text(`Total Discount: -₹${totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        doc.fontSize(12).font('Helvetica-Bold').text(`Net Sales: ₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { underline: true });
        
        doc.moveDown(1.5);

        // Orders Table
        doc.fontSize(14).font('Helvetica-Bold').text('Order Details', { underline: true });
        doc.moveDown(0.5);

        // Table Header
        const tableTop = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Order ID', 50, tableTop, { width: 80 });
        doc.text('Date', 130, tableTop, { width: 70 });
        doc.text('Customer', 200, tableTop, { width: 100 });
        doc.text('Amount', 300, tableTop, { width: 60, align: 'right' });
        doc.text('Discount', 360, tableTop, { width: 60, align: 'right' });
        doc.text('Payment', 420, tableTop, { width: 60 });
        doc.text('Status', 480, tableTop, { width: 70 });

        doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
        doc.moveDown(0.5);

        // Table Rows
        doc.font('Helvetica').fontSize(8);
        orders.forEach((order, index) => {
            const y = doc.y;
            
            // Check if we need a new page
            if (y > 700) {
                doc.addPage();
                doc.y = 50;
            }

            const orderDiscount = (order.couponDiscount || 0) + (order.walletAmountUsed || 0);
            
            doc.text(order.orderNumber, 50, doc.y, { width: 80 });
            doc.text(order.createdAt.toLocaleDateString(), 130, doc.y, { width: 70 });
            doc.text((order.userId?.fullName || 'Guest').substring(0, 15), 200, doc.y, { width: 100 });
            doc.text(`₹${order.totalAmount.toLocaleString('en-IN')}`, 300, doc.y, { width: 60, align: 'right' });
            doc.text(`₹${orderDiscount.toLocaleString('en-IN')}`, 360, doc.y, { width: 60, align: 'right' });
            doc.text(order.paymentMethod.toUpperCase(), 420, doc.y, { width: 60 });
            doc.text(order.orderStatus, 480, doc.y, { width: 70 });
            
            doc.moveDown(0.8);
        });

        doc.end();

    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Error generating PDF');
    }
}

const downloadExcel = async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        let query = { orderStatus: 'delivered' };

        let start, end;
        const now = new Date();
        if (period === 'daily') {
            start = new Date(now.setHours(0, 0, 0, 0));
            end = new Date(now.setHours(23, 59, 59, 999));
        } else if (period === 'weekly') {
            const currentDay = now.getDay();
            start = new Date(now);
            start.setDate(now.getDate() - currentDay);
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        } else if (period === 'monthly') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
        } else if (period === 'yearly') {
            start = new Date(now.getFullYear(), 0, 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), 11, 31);
            end.setHours(23, 59, 59, 999);
        } else if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }

        if (start && end) {
            query.createdAt = { $gte: start, $lte: end };
        }

        const orders = await Order.find(query)
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 });

        // Calculate totals
        const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalCouponDiscount = orders.reduce((sum, order) => sum + (order.couponDiscount || 0), 0);
        const totalWalletDiscount = orders.reduce((sum, order) => sum + (order.walletAmountUsed || 0), 0);
        const totalDiscount = totalCouponDiscount + totalWalletDiscount;
        const grossSales = totalSales + totalDiscount;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Add title and summary
        worksheet.mergeCells('A1:H1');
        worksheet.getCell('A1').value = 'SALES REPORT';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        worksheet.mergeCells('A2:H2');
        worksheet.getCell('A2').value = `Generated on: ${new Date().toLocaleString()}`;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        if (start && end) {
            worksheet.mergeCells('A3:H3');
            worksheet.getCell('A3').value = `Period: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
            worksheet.getCell('A3').alignment = { horizontal: 'center' };
        }

        // Summary section
        worksheet.addRow([]);
        worksheet.addRow(['Summary']);
        worksheet.getCell('A5').font = { bold: true, size: 12 };
        worksheet.addRow(['Total Orders:', orders.length]);
        worksheet.addRow(['Gross Sales:', `₹${grossSales.toFixed(2)}`]);
        worksheet.addRow(['Coupon Discount:', `-₹${totalCouponDiscount.toFixed(2)}`]);
        worksheet.addRow(['Wallet Discount:', `-₹${totalWalletDiscount.toFixed(2)}`]);
        worksheet.addRow(['Total Discount:', `-₹${totalDiscount.toFixed(2)}`]);
        worksheet.addRow(['Net Sales:', `₹${totalSales.toFixed(2)}`]);
        worksheet.getCell('A11').font = { bold: true };
        worksheet.getCell('B11').font = { bold: true };

        // Add spacing
        worksheet.addRow([]);
        worksheet.addRow([]);

        // Table headers
        const headerRow = worksheet.addRow([
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

        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F2937' }
        };
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // Column widths
        worksheet.columns = [
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

        // Add data rows
        orders.forEach(order => {
            worksheet.addRow([
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

        // Style all cells
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Excel generation error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Error generating Excel');
    }
}

export default {
    getSalesReport,
    downloadPDF,
    downloadExcel
};
