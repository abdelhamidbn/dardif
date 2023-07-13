const Apartment = require('../models/Apartment');
const Building = require('../models/Building');
const Booking = require('../models/Booking');
const cloudinary = require('cloudinary').v2;
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');
const getDataUri = require('../utils/getDataUri');

// create apartment -- admin
exports.createApartment = catchAsyncErrors(async (req, res, next) => {
    const buildingId = req.params.id;
    const { number, name, type, specification, pricePerDay } = req.body;

    const building = await Building.findById(buildingId);
    if (!building) {
        return next(new ErrorHandler("Building not found", 404));
    }

    const isDuplicate = await Apartment.findOne({
        building: building.id,
        number
    })

    if (isDuplicate) {
        return next(new ErrorHandler("Duplicate apartment number", 400))
    }

    const apartment = await Apartment.create({
        number,
        name,
        type,
        specification,
        pricePerDay,
        building: building.id
    })

    building.apartments.push(apartment.id);
    await building.save();

    res.status(201).json({
        success: true,
        apartment
    })
})

// upload apartment pictures -- admin
exports.uploadApartmentPictures = catchAsyncErrors(async (req, res, next) => {
    const pictures = req.files;
    const id = req.params.id;

    if (pictures.length < 1) {
        return next(new ErrorHandler('Please upload apartment pictures', 400));
    }

    const apartment = await Apartment.findById(id);

    if (!apartment) {
        return next(new ErrorHandler('Apartment not found', 404));
    }


    const picturePath = await Promise.all(pictures.map(async (picture) => {
        const pictureUri = getDataUri(picture);

        const myCloud = await cloudinary.uploader.upload(pictureUri.content, {
            folder: '/DarDif/apartments',
            crop: "scale",
        })

        return {
            public_id: myCloud.public_id,
            url: myCloud.secure_url
        }
    }))

    // destroy previous pictures
    if (apartment.pictures.length > 0) {
        await Promise.all(apartment.pictures.map(async (picture) => {
            await cloudinary.uploader.destroy(picture.public_id)
            return;
        }));
    }

    apartment.pictures = picturePath;
    await apartment.save();

    res.status(200).json({
        success: true,
        apartment
    })
})

// update apartment details
exports.updateApartment = catchAsyncErrors(async (req, res, next) => {
    const id = req.params.id;
    const { number, name, type, bedCount, specification, pricePerDay } = req.body;

    if (number) {
        return next(new ErrorHandler("Apartment number can't be changed", 400))
    }

    const apartment = await Apartment.findByIdAndUpdate(id, {
        $set: {
            name,
            type,
            bedCount,
            specification,
            pricePerDay,
        }
    }, { new: true })

    if (!apartment) {
        return next(new ErrorHandler('Apartment not found', 404));
    }

    res.status(200).json({
        success: true,
        apartment
    })
})


// delete apartment -- admin
exports.deleteApartment = catchAsyncErrors(async (req, res, next) => {
    const apartment = await Apartment.findById(req.params.id);

    if (!apartment) {
        return next(new ErrorHandler("Apartment not found", 404));
    }

    // delete apartment from building 
    const apartmentsBuilding = await Building.findById(apartment.building);
    apartmentsBuilding.apartments = apartmentsBuilding.apartments.filter((apartment) => apartment.toString() !== req.params.id)

    if (apartment.pictures.length > 0) {
        await Promise.all(apartment.pictures.map(async (picture) => {
            await cloudinary.uploader.destroy(picture.public_id)
        }))
    }

    // delete apartment's booking details
    const bookings = await Booking.find({
        apartment: apartment.id
    })

    if (bookings.length > 0) {
        await Promise.all(bookings.map(async (booking) => await booking.delete()));
    }

    await apartmentsBuilding.save();
    await apartment.delete();
    const building = await Building.findById(apartmentsBuilding.id).populate('apartments');

    res.status(200).json({
        success: true,
        building,
        message: "apartment deleted successfully"
    })
})

// get apartment details
exports.getApartmentDetails = catchAsyncErrors(async (req, res, next) => {
    const apartment = await Apartment.findById(req.params.id).populate('building');

    if (!apartment) {
        return next(new ErrorHandler("Apartment not found", 404));
    }

    res.status(200).json({
        success: true,
        apartment
    })
})

// get all apartments
exports.getBuildingApartments = catchAsyncErrors(async (req, res, next) => {
    const buildingId = req.params.id;

    const building = await Building.findById(buildingId);
    if (!building) {
        return next(new ErrorHandler("Building not found.", 404));
    }

    const apartments = await Apartment.find({
        building: buildingId
    })

    res.status(200).json({
        success: true,
        apartments
    })
})
