const mongoose = require('mongoose');

const apartmentSchema = new mongoose.Schema({
    number: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    space: {
        type: Number,
        require: true
    },
    type: {
        type: String,
        enum: ['Appartement', 'Studio'],
        required: true
    },
    pricePerDay: {
        type: Number,
        required: true
    },
    specification: [String],
    notAvailable: [{
        type: Date,
    }],
    pictures: [{
        public_id: String,
        url: String
    }],
    building: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Buildings",
        required: true
    }

}, { timestamps: true });

const Apartment = mongoose.model("Apartments", apartmentSchema);

module.exports = Apartment;