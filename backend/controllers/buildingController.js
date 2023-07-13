const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const Building = require('../models/Building');
const Apartment = require('../models/Apartment');
const Booking = require('../models/Booking');
const ErrorHandler = require('../utils/errorHandler');
const cloudinary = require('cloudinary').v2;
const getDataUri = require('../utils/getDataUri');

// create building -- admin
exports.createBuilding = catchAsyncErrors(async (req, res, next) => {
    const { name, location, distance, specification, description } = req.body;

    const building = await Building.create({
        name, location, distance, specification, description
    });

    res.status(201).json({
        success: true
    })
});

// upload building pictures -- admin
exports.uploadBuildingPictures = catchAsyncErrors(async (req, res, next) => {
    const pictures = req.files;
    const id = req.params.id;

    if (pictures.length < 1) {
        return next(new ErrorHandler('Please upload building pictures', 400));
    }

    const building = await Building.findById(id);

    if (!building) {
        return next(new ErrorHandler('Building not found', 404));
    }

    
    const picturePath = await Promise.all(pictures.map(async (picture) => {
        const pictureUri = getDataUri(picture);

        const myCloud = await cloudinary.uploader.upload(pictureUri.content, {
            folder: '/DarDif/buildings',
            crop: "scale",
        })

        return {
            public_id: myCloud.public_id,
            url: myCloud.secure_url
        }
    }))

    // destroy previous pictures
    if (building.pictures.length > 0) {
        await Promise.all(building.pictures.map(async (picture) => {
            await cloudinary.uploader.destroy(picture.public_id)
            return;
        }));
    }

    building.pictures = picturePath;
    await building.save();

    res.status(200).json({
        success: true,
        building
    })
})

// update building details -- admin
exports.updateBuilding = catchAsyncErrors(async (req, res, next) => {
    const id = req.params.id;
    const { name, location, distance, specification, description } = req.body;

    const building = await Building.findByIdAndUpdate(id, {
        $set: {
            name,
            location,
            distance,
            description,
            specification
        }
    }, { new: true })

    if (!building) {
        return next(new ErrorHandler("Building not found", 404));
    }

    res.status(200).json({
        success: true,
        building
    })
})

// delete building -- admin
exports.deleteBuilding = catchAsyncErrors(async (req, res, next) => {
    const building = await Building.findById(req.params.id);

    if (!building) {
        return next(new ErrorHandler("Building not found", 404));
    }

    // delete building apartments
    await Promise.all(building.apartments.map(async (apartmentId) => {
        const apartment = await Apartment.findById(apartmentId);

        apartment && await apartment.delete();

        return;
    }))

    if (building.pictures.length > 0) {
        await Promise.all(building.pictures.map(async (picture) => {
            await cloudinary.uploader.destroy(picture.public_id)
        }))
    }


    // delete building's booking details
    const bookings = await Booking.find({
        building: building.id
    })

    if (bookings.length > 0) {
        await Promise.all(bookings.map(async (booking) => await booking.delete()));
    }

    await building.delete();
    const buildings = await Building.find();

    res.status(200).json({
        success: true,
        buildings,
        message: "Building deleted successfully"
    })
})

// get building details
exports.getBuildingDetails = catchAsyncErrors(async (req, res, next) => {
    const building = await Building.findById(req.params.id).populate('apartments');

    if (!building) {
        return next(new ErrorHandler("Building not found", 404));
    }

    res.status(200).json({
        success: true,
        building
    })
})

// get all buildings
exports.getAllBuildings = catchAsyncErrors(async (req, res, next) => {
    const keyword = req.query.location;
    const apartmentCount = Number(req.query.apartment);
    const personCount = Number(req.query.person);
    const dates = [];

    
    // for search query
    if (req.query.person && personCount < 1) return next(new ErrorHandler("At least one person required", 400));
    if (req.query.apartment && apartmentCount < 1) return next(new ErrorHandler("At least one apartment required", 400));
    if (req.query.d1 && req.query.d2) {
        let startDate = req.query.d1;
        let endDate = req.query.d2;        

        if (startDate > endDate) return next(new ErrorHandler("Please check start and end date", 400));

        while ( new Date(startDate) <= new Date(endDate)) {
            dates.push(Date.parse(new Date(startDate)));

            startDate = new Date(new Date(startDate).setDate(new Date(startDate).getDate() + 1));
        }
    }

    let buildings = await Building.find({
        location: {
            $regex: keyword ? keyword : '',
            $options: 'i'
        },
        $expr: { $gte: [{ $size: "$apartments" }, req.query.apartment ? apartmentCount : 0] }

    }).populate('apartments');

    if (req.query.person) {
        buildings = buildings.filter((building) => {
            return building.apartments.some((apartment) => {
                return personCount > 1 ? apartment.type === "Studio" :  true;
            })
        })
    }

    if (dates.length > 0) {
        buildings = buildings.filter((building) => {
            return building.apartments.some((apartment) => {
                return apartment.notAvailable.every((date) => {
                    return !dates.includes(Date.parse(date))
                })
            })
        })
    }

    res.status(200).json({
        success: true,
        buildings
    })
})
