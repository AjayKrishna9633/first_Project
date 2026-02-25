import Order from '../../models/orderModel.js';
import StatusCodes from '../../utils/statusCodes.js';
import SalesReportPdfService from '../../utils/salesReportPdfService.js';
import SalesReportExcelService from '../../utils/salesReportExcelService.js';

const buildDateFilter = (period, startDate, endDate) => {
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

    return { start, end };
};

const calculateSalesMetrics = async (dateFilter) => {
    const pipeline = [
        {
            $match: {
                createdAt: dateFilter,
                orderStatus: { $in: ['delivered', 'returned'] }
            }
        },
        {
            $facet: {
                deliveredOrders: [
                    { $match: { orderStatus: 'delivered' } },
                    {
                        $group: {
                            _id: null,
                            totalDeliveredSales: { $sum: '$totalAmount' },
                            totalCouponDiscount: { $sum: { $ifNull: ['$couponDiscount', 0] } },
                            totalWalletDiscount: { $sum: { $ifNull: ['$walletAmountUsed', 0] } },
                            deliveredOrderCount: { $sum: 1 }
                        }
                    }
                ],
                refundedOrders: [
                    {
                        $match: {
                            $or: [
                                { orderStatus: 'returned' },
                                { refundStatus: 'processed' }
                            ]
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalRefundAmount: { $sum: { $ifNull: ['$refundAmount', 0] } },
                            refundedOrderCount: { $sum: 1 }
                        }
                    }
                ],
                cancelledOrders: [
                    { $match: { orderStatus: 'cancelled' } },
                    {
                        $group: {
                            _id: null,
                            cancelledOrderCount: { $sum: 1 }
                        }
                    }
                ]
            }
        }
    ];

    const result = await Order.aggregate(pipeline);
    
    const deliveredData = result[0].deliveredOrders[0] || {
        totalDeliveredSales: 0,
        totalCouponDiscount: 0,
        totalWalletDiscount: 0,
        deliveredOrderCount: 0
    };

    const refundData = result[0].refundedOrders[0] || {
        totalRefundAmount: 0,
        refundedOrderCount: 0
    };

    const cancelledData = result[0].cancelledOrders[0] || {
        cancelledOrderCount: 0
    };

    const totalDiscount = deliveredData.totalCouponDiscount + deliveredData.totalWalletDiscount;
    const grossSales = deliveredData.totalDeliveredSales + totalDiscount;
    const netSales = deliveredData.totalDeliveredSales - refundData.totalRefundAmount;

    return {
        totalDeliveredSales: deliveredData.totalDeliveredSales,
        totalCouponDiscount: deliveredData.totalCouponDiscount,
        totalWalletDiscount: deliveredData.totalWalletDiscount,
        totalDiscount,
        grossSales,
        totalRefundAmount: refundData.totalRefundAmount,
        netSales,
        deliveredOrderCount: deliveredData.deliveredOrderCount,
        refundedOrderCount: refundData.refundedOrderCount,
        cancelledOrderCount: cancelledData.cancelledOrderCount,
        totalOrders: deliveredData.deliveredOrderCount + refundData.refundedOrderCount + cancelledData.cancelledOrderCount
    };
};

const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const { start, end } = buildDateFilter(period, startDate, endDate);

        let dateFilter = {};
        if (start && end) {
            dateFilter = { $gte: start, $lte: end };
        }

        const metrics = await calculateSalesMetrics(dateFilter);

        const orders = await Order.find({
            orderStatus: 'delivered',
            ...(start && end ? { createdAt: dateFilter } : {})
        })
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const refundedOrders = await Order.find({
            $or: [
                { orderStatus: 'returned' },
                { refundStatus: 'processed' }
            ],
            ...(start && end ? { createdAt: dateFilter } : {})
        })
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(5);

        const totalPages = Math.ceil(metrics.deliveredOrderCount / limit);

        res.render('admin/salesReport', {
            orders,
            refundedOrders,
            totalSales: metrics.totalDeliveredSales,
            totalCouponDiscount: metrics.totalCouponDiscount,
            totalWalletDiscount: metrics.totalWalletDiscount,
            totalDiscount: metrics.totalDiscount,
            grossSales: metrics.grossSales,
            totalRefundAmount: metrics.totalRefundAmount,
            netSales: metrics.netSales,
            totalOrders: metrics.totalOrders,
            deliveredOrderCount: metrics.deliveredOrderCount,
            refundedOrderCount: metrics.refundedOrderCount,
            cancelledOrderCount: metrics.cancelledOrderCount,
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
        
        const { start, end } = buildDateFilter(period, startDate, endDate);

        let dateFilter = {};
        if (start && end) {
            dateFilter = { $gte: start, $lte: end };
        }

        const metrics = await calculateSalesMetrics(dateFilter);

        const orders = await Order.find({
            orderStatus: 'delivered',
            ...(start && end ? { createdAt: dateFilter } : {})
        })
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 });

        const refundedOrders = await Order.find({
            $or: [
                { orderStatus: 'returned' },
                { refundStatus: 'processed' }
            ],
            ...(start && end ? { createdAt: dateFilter } : {})
        })
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 });

        const stats = {
            totalOrders: metrics.totalOrders,
            totalSales: metrics.totalDeliveredSales,
            totalCouponDiscount: metrics.totalCouponDiscount,
            totalWalletDiscount: metrics.totalWalletDiscount,
            totalDiscount: metrics.totalDiscount,
            grossSales: metrics.grossSales,
            totalRefundAmount: metrics.totalRefundAmount,
            netSales: metrics.netSales,
            deliveredOrderCount: metrics.deliveredOrderCount,
            refundedOrderCount: metrics.refundedOrderCount,
            cancelledOrderCount: metrics.cancelledOrderCount
        };

        const dateRange = { start, end };

        const pdfService = new SalesReportPdfService();
        const pdfBuffer = await pdfService.generateReport(orders, stats, dateRange, refundedOrders);

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
        
        const { start, end } = buildDateFilter(period, startDate, endDate);

        let dateFilter = {};
        if (start && end) {
            dateFilter = { $gte: start, $lte: end };
        }

        const metrics = await calculateSalesMetrics(dateFilter);

        const orders = await Order.find({
            orderStatus: 'delivered',
            ...(start && end ? { createdAt: dateFilter } : {})
        })
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 });

        const refundedOrders = await Order.find({
            $or: [
                { orderStatus: 'returned' },
                { refundStatus: 'processed' }
            ],
            ...(start && end ? { createdAt: dateFilter } : {})
        })
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 });

        const stats = {
            totalOrders: metrics.totalOrders,
            totalSales: metrics.totalDeliveredSales,
            totalCouponDiscount: metrics.totalCouponDiscount,
            totalWalletDiscount: metrics.totalWalletDiscount,
            totalDiscount: metrics.totalDiscount,
            grossSales: metrics.grossSales,
            totalRefundAmount: metrics.totalRefundAmount,
            netSales: metrics.netSales,
            deliveredOrderCount: metrics.deliveredOrderCount,
            refundedOrderCount: metrics.refundedOrderCount,
            cancelledOrderCount: metrics.cancelledOrderCount
        };

        const dateRange = { start, end };

        const excelService = new SalesReportExcelService();
        const workbook = await excelService.generateReport(orders, stats, dateRange, refundedOrders);

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
