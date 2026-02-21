const mongoose = require('mongoose');

const MonthEndReportSchema = new mongoose.Schema({
    month: { type: String, required: true }, // e.g., "January 2024"
    year: { type: Number, required: true },
    monthNumber: { type: Number, required: true }, // 1-12
    beginningInventory: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    cogs: { type: Number, default: 0 },
    endingInventory: { type: Number, default: 0 },
    variance: { type: Number, default: 0 },
    accuracy: { type: Number, default: 100 },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'completed' },
    lastUpdated: { type: Date, default: Date.now },
    categoryBreakdown: {
        type: Map,
        of: Number
    }
}, { timestamps: true });

module.exports = mongoose.model('MonthEndReport', MonthEndReportSchema);
