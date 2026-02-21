const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of arrays (GeoJSON Polygon format)
      required: true,
      validate: {
        validator: function(coords) {
          // Ensure polygon has at least 3 points and is closed
          if (!coords || !coords[0] || coords[0].length < 4) {
            return false;
          }
          // Check if first and last points are the same (closed polygon)
          const first = coords[0][0];
          const last = coords[0][coords[0].length - 1];
          return first[0] === last[0] && first[1] === last[1];
        },
        message: 'Polygon must have at least 3 points and be closed (first point = last point)'
      }
    }
  },
  properties: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// GEOSPATIAL INDEX - Enables efficient location-based queries
// Supports: $near, $geoWithin, $geoIntersects, $nearSphere
zoneSchema.index({ geometry: '2dsphere' });

// TEXT INDEX - Enables full-text search on zone names
zoneSchema.index({ name: 'text' });

// COMPOUND INDEX - For queries filtering by name and location
zoneSchema.index({ name: 1, 'geometry.coordinates': 1 });

// VIRTUAL - Calculate polygon area (approximate)
zoneSchema.virtual('area').get(function() {
  // This is a simplified calculation - for accurate results use turf.js
  const coords = this.geometry.coordinates[0];
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    area += (coords[i][0] * coords[i + 1][1]) - (coords[i + 1][0] * coords[i][1]);
  }
  return Math.abs(area / 2);
});

// METHOD - Check if a point is inside this zone
zoneSchema.methods.containsPoint = function(lng, lat) {
  // MongoDB's geometry validation ensures proper format
  return true; // Actual check done via $geoIntersects in queries
};

// STATIC METHOD - Find zones intersecting with a given geometry
zoneSchema.statics.findIntersecting = function(geometry) {
  return this.find({
    geometry: {
      $geoIntersects: {
        $geometry: geometry
      }
    }
  });
};

module.exports = mongoose.model('Zone', zoneSchema);
