const express = require('express');
const router = express.Router();
const Zone = require('../models/Zone');

// Production Environment Check
const isProduction = process.env.NODE_ENV === 'production';

// POST /api/zones - Create a new danger zone
router.post('/', async (req, res) => {
  try {
    const { name, geometry } = req.body;
    
    // Input validation
    if (!name || !geometry) {
      return res.status(400).json({
        success: false,
        message: 'Name and geometry are required'
      });
    }
    
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid zone name'
      });
    }
    
    const newZone = new Zone({
      name: name.trim(),
      geometry
    });
    
    await newZone.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Zone created successfully', 
      zone: newZone 
    });
  } catch (error) {
    console.error('Error creating zone:', error.message);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid zone data', 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create zone',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// GET /api/zones - Get all danger zones
router.get('/', async (req, res) => {
  try {
    const zones = await Zone.find().select('-__v').lean();
    
    res.status(200).json({ 
      success: true,
      count: zones.length,
      zones 
    });
  } catch (error) {
    console.error('Error fetching zones:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch zones',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// GET /api/zones/nearby - Get zones near a specific location
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5000 } = req.query; // maxDistance in meters
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude are required' 
      });
    }

    // Use $near operator with geospatial index
    const zones = await Zone.find({
      geometry: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    });

    res.status(200).json({ 
      success: true, 
      count: zones.length,
      zones 
    });
  } catch (error) {
    console.error('Error finding nearby zones:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to find nearby zones',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// POST /api/zones/check - Check if a point is inside any danger zone
router.post('/check', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude are required' 
      });
    }

    // Use $geoIntersects to check if point is within any zone
    const zones = await Zone.find({
      geometry: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          }
        }
      }
    });

    const isInDangerZone = zones.length > 0;

    res.status(200).json({ 
      success: true, 
      isInDangerZone,
      dangerousZones: zones,
      message: isInDangerZone 
        ? `Warning: Inside ${zones.length} danger zone(s)` 
        : 'Location is safe'
    });
  } catch (error) {
    console.error('Error checking location:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check location',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// GET /api/zones/within - Get zones within a specific area (bounding box)
router.get('/within', async (req, res) => {
  try {
    const { minLat, minLng, maxLat, maxLng } = req.query;
    
    if (!minLat || !minLng || !maxLat || !maxLng) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bounding box coordinates required (minLat, minLng, maxLat, maxLng)' 
      });
    }

    // Use $geoWithin with $box operator
    const zones = await Zone.find({
      geometry: {
        $geoWithin: {
          $box: [
            [parseFloat(minLng), parseFloat(minLat)], // bottom-left
            [parseFloat(maxLng), parseFloat(maxLat)]  // top-right
          ]
        }
      }
    });

    res.status(200).json({ 
      success: true, 
      count: zones.length,
      zones 
    });
  } catch (error) {
    console.error('Error finding zones within area:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to find zones within area',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// DELETE /api/zones/:id - Delete a danger zone
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedZone = await Zone.findByIdAndDelete(id);
    
    if (!deletedZone) {
      return res.status(404).json({ 
        success: false, 
        message: 'Zone not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Zone deleted successfully', 
      zone: deletedZone 
    });
  } catch (error) {
    console.error('Error deleting zone:', error.message);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid zone ID format'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete zone',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

module.exports = router;
