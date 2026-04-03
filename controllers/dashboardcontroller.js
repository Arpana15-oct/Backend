const Record = require("../models/recordmodel");

// Helper to validate a date string
const parseDate = (dateStr) => {
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Helper function to build match filter for dashboard queries
const buildMatchFilter = (req) => {
  const filter = {};

  if (req.user.role !== "admin") {
    filter.createdBy = req.user._id;
  }

  const { startDate, endDate } = req.query;

  if (startDate || endDate) {
    filter.date = {};

    if (startDate) {
      const parsed = parseDate(startDate);
      if (!parsed) return { error: "Invalid startDate." };
      filter.date.$gte = parsed;
    }

    if (endDate) {
      const parsed = parseDate(endDate);
      if (!parsed) return { error: "Invalid endDate." };
      filter.date.$lte = parsed;
    }
  }

  return filter;
};

// Get dashboard summary
const getDashboardSummary = async (req, res) => {
  try {
    const matchFilter = buildMatchFilter(req);

    if (matchFilter.error) {
      return res.status(400).json({ success: false, message: matchFilter.error });
    }

    const summary = await Record.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;

    summary.forEach((item) => {
      if (item._id === "income") totalIncome = item.total;
      if (item._id === "expense") totalExpense = item.total;
    });

    return res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
      },
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary.",
      ...(isDev && { error: error.message }),
    });
  }
};

// Get total amounts by category for income and expenses
const getCategoryTotals = async (req, res) => {
  try {
    const matchFilter = buildMatchFilter(req);

    if (matchFilter.error) {
      return res.status(400).json({ success: false, message: matchFilter.error });
    }

    const categoryTotals = await Record.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            category: "$category",
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id.category",
          type: "$_id.type",
          total: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      count: categoryTotals.length,
      data: categoryTotals,
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category totals.",
      ...(isDev && { error: error.message }),
    });
  }
};

// Get recent activity (latest 5 records)
const getRecentActivity = async (req, res) => {
  try {
    const matchFilter = buildMatchFilter(req);

    if (matchFilter.error) {
      return res.status(400).json({ success: false, message: matchFilter.error });
    }

    const records = await Record.find(matchFilter)
      .sort({ date: -1, createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to fetch recent activity.",
      ...(isDev && { error: error.message }),
    });
  }
};

// Get monthly trends (total income and expense by month)
const getMonthlyTrends = async (req, res) => {
  try {
    const matchFilter = buildMatchFilter(req);

    if (matchFilter.error) {
      return res.status(400).json({ success: false, message: matchFilter.error });
    }

    const trends = await Record.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          type: "$_id.type",
          total: 1,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      count: trends.length,
      data: trends,
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to fetch monthly trends.",
      ...(isDev && { error: error.message }),
    });
  }
};

// Get current month summary
const getThisMonthSummary = async (req, res) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const matchFilter = buildMatchFilter(req);

    if (matchFilter.error) {
      return res.status(400).json({ success: false, message: matchFilter.error });
    }

    // Override date filter with current month range
    matchFilter.date = { $gte: firstDay, $lte: lastDay };

    const summary = await Record.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;

    summary.forEach((item) => {
      if (item._id === "income") totalIncome = item.total;
      if (item._id === "expense") totalExpense = item.total;
    });

    return res.status(200).json({
      success: true,
      data: {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
      },
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to fetch this month summary.",
      ...(isDev && { error: error.message }),
    });
  }
};

// Get top spending categories
const getTopSpendingCategories = async (req, res) => {
  try {
    const matchFilter = buildMatchFilter(req);

    if (matchFilter.error) {
      return res.status(400).json({ success: false, message: matchFilter.error });
    }

    matchFilter.type = "expense";

    const topCategories = await Record.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          total: 1,
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]);

    return res.status(200).json({
      success: true,
      count: topCategories.length,
      data: topCategories,
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top spending categories.",
      ...(isDev && { error: error.message }),
    });
  }
};

module.exports = {
  getDashboardSummary,
  getCategoryTotals,
  getRecentActivity,
  getMonthlyTrends,
  getThisMonthSummary,
  getTopSpendingCategories,
};