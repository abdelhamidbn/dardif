const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    distance: {
        type: Number,
        require: true
    },
    specification: [String],
    description: {
        type: String,
        required: true,
        trim: true
    },
    pictures: [{
        public_id: String,
        url: String
    }],
    apartments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Apartments"
    }]

}, { timestamps: true });

const Building = mongoose.model("Buildings", buildingSchema);


module.exports = Building;