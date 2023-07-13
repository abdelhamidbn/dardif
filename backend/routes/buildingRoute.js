const express = require('express');
const { createBuilding, uploadBuildingPictures, updateBuilding, deleteBuilding, getBuildingDetails, getAllBuildings } = require('../controllers/buildingController');
const imageUpload = require('../middlewares/imageUpload');
const { isAuthenticatedUser, authorizedRole } = require('../middlewares/auth');

const router = express.Router();

router.route('/building/new').post(isAuthenticatedUser, authorizedRole('admin') ,createBuilding);
router.route('/building/:id/images').put(isAuthenticatedUser, authorizedRole('admin'),imageUpload('pictures'), uploadBuildingPictures);
router.route('/buildings').get(getAllBuildings);
router.route('/building/:id').put(isAuthenticatedUser, authorizedRole('admin'),updateBuilding).delete(isAuthenticatedUser, authorizedRole('admin'), deleteBuilding).get(getBuildingDetails);

module.exports = router;