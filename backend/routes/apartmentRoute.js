const express = require('express');
const { createApartment, uploadApartmentPictures, updateApartment, deleteApartment, getApartmentDetails, getBuildingApartments } = require('../controllers/apartmentController');
const imageUpload = require('../middlewares/imageUpload');
const { isAuthenticatedUser, authorizedRole } = require('../middlewares/auth');

const router = express.Router();

router.route('/building/:id/apartment/new').post(isAuthenticatedUser, authorizedRole('admin'), createApartment);
router.route('/apartment/:id/images').put(isAuthenticatedUser, authorizedRole('admin'),imageUpload('pictures'), uploadApartmentPictures);
router.route('/building/:id/apartments').get(getBuildingApartments);
router.route('/apartment/:id').put(isAuthenticatedUser, authorizedRole('admin'),updateApartment).delete(isAuthenticatedUser, authorizedRole('admin'),deleteApartment).get(getApartmentDetails);



module.exports = router;