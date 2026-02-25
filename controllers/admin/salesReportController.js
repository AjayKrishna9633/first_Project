import Order from '../../models/orderModel.js';
import StatusCodes from '../../utils/statusCodes.js';
import SalesReportPdfService from '../../utils/salesReportPdfService.js';
import SalesReportExcelService from '../../utils/salesReportExcelService.js';

const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

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

        const allOrders = await Order.find(query);

        const totalSales = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalCouponDiscount = allOrders.reduce((sum, order) => sum + (order.couponDiscount || 0), 0);
        const totalWalletDiscount = allOrders.reduce((sum, order) => sum + (order.walletAmountUsed || 0), 0);
        const totalDiscount = totalCouponDiscount + totalWalletDiscount;
        const totalOrders = allOrders.length;
        const grossSales = totalSales + totalDiscount;

        const orders = await Order.find(query)
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalOrders / limit);

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

        const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalCouponDiscount = orders.reduce((sum, order) => sum + (order.couponDiscount || 0), 0);
        const totalWalletDiscount = orders.reduce((sum, order) => sum + (order.walletAmountUsed || 0), 0);
        const totalDiscount = totalCouponDiscount + totalWalletDiscount;
        const grossSales = totalSales + totalDiscount;

        const stats = {
            totalOrders: orders.length,
            totalSales,
            totalCouponDiscount,
            totalWalletDiscount,
            totalDiscount,
            grossSales
        };

        const dateRange = { start, end };

        const pdfService = new SalesReportPdfService();
        const pdfBuffer = await pdfService.generateReport(orders, stats, dateRange);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.pdf`);
        res.send(pdfBuffer);

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

        const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalCouponDiscount = orders.reduce((sum, order) => sum + (order.couponDiscount || 0), 0);
        const totalWalletDiscount = orders.reduce((sum, order) => sum + (order.walletAmountUsed || 0), 0);
        const totalDiscount = totalCouponDiscount + totalWalletDiscount;
        const grossSales = totalSales + totalDiscount;

        const stats = {
            totalOrders: orders.length,
            totalSales,
            totalCouponDiscount,
            totalWalletDiscount,
            totalDiscount,
            grossSales
        };

        const dateRange = { start, end };

        const excelService = new SalesReportExcelService();
        const workbook = await excelService.generateReport(orders, stats, dateRange);

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
