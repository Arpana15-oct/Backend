const mongoose = require("mongoose");
const Record = require("../models/recordmodel");

const ALLOWED_TYPES = ["income", "expense"];
const ALLOWED_SORT_FIELDS = ["date", "amount", "createdAt", "category", "type"];

// Create a new financial record
const createRecord = async (req, res) => {
  try {
    const { amount, type, category, date, note } = req.body;

    if (amount === undefined || !type || !category || !date) {
      return res.status(400).json({
        success: false,
        message: "Amount, type, category, and date are required.",
      });
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be either 'income' or 'expense'.",
      });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number.",
      });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format.",
      });
    }

    const record = await Record.create({
      amount,
      type,
      category,
      date: parsedDate,
      note,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Financial record created successfully.",
      data: record,
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to create record.",
      ...(isDev && { error: error.message }),
    });
  }
};

// Get all records with filtering, pagination, sorting, and search
const getRecords = async (req, res) => {
  try {
    const {
      type,
      category,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10,
      sortBy = "date",
      order = "desc",
    } = req.query;

    const filter = {};

    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    if (type) {
      if (!ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Type must be either 'income' or 'expense'.",
        });
      }
      filter.type = type;
    }

    if (category) filter.category = category;

    if (startDate || endDate) {
      filter.date = {};

      if (startDate) {
        const parsedStart = new Date(startDate);
        if (isNaN(parsedStart.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid startDate." });
        }
        filter.date.$gte = parsedStart;
      }

      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (isNaN(parsedEnd.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid endDate." });
        }
        filter.date.$lte = parsedEnd;
      }
    }

    // Merge search with $and to avoid conflicting with type/category filters
    if (search) {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { category: { $regex: search, $options: "i" } },
            { note: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10)); // cap at 100
    const skip = (pageNumber - 1) * pageSize;

    const finalSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "date";
    const sortOrder = order === "asc" ? 1 : -1;

    const [records, total] = await Promise.all([
      Record.find(filter)
        .sort({ [finalSortBy]: sortOrder })
        .skip(skip)
        .limit(pageSize),
      Record.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: records.length,
      total,
      currentPage: pageNumber,
      totalPages: Math.ceil(total / pageSize),
      data: records,
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to fetch records.",
      ...(isDev && { error: error.message }),
    });
  }
};

// Get a single record by ID
const getRecordById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid record ID." });
    }

    const filter = { _id: id };

    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    const record = await Record.findOne(filter);

    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found." });
    }

    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to fetch record.",
      ...(isDev && { error: error.message }),
    });
  }
};

// Update a record by ID
const updateRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid record ID." });
    }

    // Strip fields that should never be updated
    const { createdBy, _id, __v, ...allowedUpdates } = req.body;

    // Validate type if provided
    if (allowedUpdates.type && !ALLOWED_TYPES.includes(allowedUpdates.type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be either 'income' or 'expense'.",
      });
    }

    // Validate amount if provided
    if (allowedUpdates.amount !== undefined) {
      if (typeof allowedUpdates.amount !== "number" || allowedUpdates.amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a positive number.",
        });
      }
    }

    // Validate date if provided
    if (allowedUpdates.date) {
      const parsedDate = new Date(allowedUpdates.date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid date format." });
      }
      allowedUpdates.date = parsedDate;
    }

    const filter = { _id: id };
    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    const updatedRecord = await Record.findOneAndUpdate(filter, allowedUpdates, {
      new: true,
      runValidators: true,
    });

    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        message: "Record not found or access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Record updated successfully.",
      data: updatedRecord,
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to update record.",
      ...(isDev && { error: error.message }),
    });
  }
};

// Delete a record by ID
const deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid record ID." });
    }

    const filter = { _id: id };
    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    const deletedRecord = await Record.findOneAndDelete(filter);

    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        message: "Record not found or access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Record deleted successfully.",
      data: deletedRecord,
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to delete record.",
      ...(isDev && { error: error.message }),
    });
  }
};

module.exports = {
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
};