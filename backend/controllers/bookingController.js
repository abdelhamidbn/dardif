const Booking = require('../models/Booking');
const Building = require('../models/Building');
const Apartment = require('../models/Apartment');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// new booking
exports.createBooking = catchAsyncErrors(async (req, res, next) => {
    const { paymentInfo, dates, totalPrice, phone } = req.body;

    // validation of payment info
    const intent = await stripe.paymentIntents.retrieve(paymentInfo.id);

    if (intent.status !== "succeeded" || intent.amount !== (totalPrice * 100)) {
        return next(new ErrorHandler("Invalid Payment Info", 400));
    }
    
    const building = await Building.findById(req.params.id);
    if (!building) {
        return next(new ErrorHandler("Building not found", 404));
    }

    const apartment = await Apartment.findById(req.params.apartment);
    if (!apartment) {
        return next(new ErrorHandler("Apartment not found", 404))
    }

    const isBuildingsApartment = building.apartments.includes(apartment.id);
    if (!isBuildingsApartment) {
        return next(new ErrorHandler("This Apartment is not available in this building", 400))
    }

    if (dates.length < 1) {
        return next(new ErrorHandler("Please insert booking dates", 400))
    }

    const isValidDate = dates.every((date) => Date.parse(new Date().toDateString()) <= Date.parse(new Date(date).toDateString()))
    if (!isValidDate) {
        return next(new ErrorHandler("given date is before than current date"));
    }

    const hasDuplicate = dates.length !== new Set(dates).size;
    if (hasDuplicate) {
        return next(new ErrorHandler("Can't book same date more than once", 400))
    }

    if (apartment.notAvailable.length > 0) {
        const notAvailableCopy = apartment.notAvailable.map((apartment) => Date.parse(apartment));

        const isBooked = dates.some((date) => {
            return notAvailableCopy.includes(Date.parse(new Date(date)))
        });

        if (isBooked) return next(new ErrorHandler("Apartment already booked", 400));
    }

    let formattedDates = [];
    dates.forEach((date) => {
        apartment.notAvailable.push(date);
        formattedDates.push(date);
    })

    await Booking.create({
        user: req.user.id,
        building: building.id,
        apartment: apartment.id,
        dates: formattedDates,
        totalPrice,
        phone,
        paymentInfo,
        paidAt: Date.now()
    })

    await apartment.save();

    res.status(201).json({
        success: true
    })
})

// update booking status -- admin
exports.updateBooking = catchAsyncErrors(async (req, res, next) => {
    const status = req.body.status;

    if (status !== "Complete" && status !== "Checked") {
        return next(new ErrorHandler("Can't change booking status", 400));
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        return next(new ErrorHandler("Booking not found", 404));
    }

    if (status === 'Complete') {
        if (booking.status === "Complete") return next(new ErrorHandler("Can't change booking status", 400));

        const apartment = await Apartment.findById(booking.apartment);
        const bookingDatesCopy = booking.dates.map((date) => Date.parse(date));

        apartment.notAvailable = apartment.notAvailable.filter((date) => {
            return !bookingDatesCopy.includes(Date.parse(date));
        });

        await apartment.save();
        booking.status = status;
        await booking.save();
    }

    if (status === "Checked") {
        if (booking.status === "Checked") return next(new ErrorHandler("User already checked in", 400));
        if (booking.status === "Complete") return next(new ErrorHandler("Can't change booking status", 400));

        booking.status = status;
        await booking.save();
    }

    const bookings = await Booking.find();

    res.status(200).json({
        success: true,
        bookings
    })
})

// get own booking details
exports.getOwnBookingDetails = catchAsyncErrors(async (req, res, next) => {
    const booking = await Booking.findById(req.params.id).populate('apartment').populate('building');

    if (!booking) {
        return next(new ErrorHandler("Booking not found", 404));
    }

    if (booking.user.toString() !== req.user.id) {
        return next(new ErrorHandler("Access denied", 403));
    }

    res.status(200).json({
        success: true,
        booking
    })
})

// get own all bookings
exports.getOwnBookings = catchAsyncErrors(async (req, res, next) => {
    const bookings = await Booking.find({
        user: req.user.id
    })

    if (!bookings) {
        return next(new ErrorHandler("You have no booking yet", 404));
    }

    res.status(200).json({
        success: true,
        bookings
    })
})

// get all bookings -- admin 
exports.getAllBookings = catchAsyncErrors(async (req, res, next) => {
    const bookings = await Booking.find();

    res.status(200).json({
        success: true,
        bookings
    })
})

// get booking details -- admin
exports.getBookingDetails = catchAsyncErrors(async (req, res, next) => {
    const booking = await Booking.findById(req.params.id).populate('apartment').populate('building');
    if (!booking) {
        return next(new ErrorHandler("Booking not found", 404));
    }

    res.status(200).json({
        success: true,
        booking
    })
})

// send stripe api key to client
exports.sendStripeApiKey = catchAsyncErrors((req, res, next) => {
    res.status(200).json({
        message: "success",
        stripeApiKey: process.env.STRIPE_API_KEY
    })
})

// send stripe secret key
exports.sendStripeSecretKey = catchAsyncErrors(async (req, res, next) => {
    const myPayment = await stripe.paymentIntents.create({
        amount: (req.body.amount * 100),
        currency: 'bdt',
        metadata: {
            company: 'DarDif'
        }
    });

    res.status(200).json({
        success: true,
        client_secret: myPayment.client_secret
    });
});


