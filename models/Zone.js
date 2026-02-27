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
      type: [[[Number]]],
      required: true,
      validate: {
        validator: function(coords) {
          if (!coords || !coords[0] || coords[0].length < 4) return false;
          
          const first = coords[0][0];
          const last = coords[0][coords[0].length - 1];
          return first[0] === last[0] && first[1] === last[1];
        },
        message: 'Polygon must have at least 3 points and be closed'
      }
    }
  },
  properties: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Geospatial index for location queries
zoneSchema.index({ geometry: '2dsphere' });
zoneSchema.index({ name: 'text' });
zoneSchema.index({ name: 1, 'geometry.coordinates': 1 });

// Calculate approximate polygon area
zoneSchema.virtual('area').get(function() {
  const coords = this.geometry.coordinates[0];
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    area += (coords[i][0] * coords[i + 1][1]) - (coords[i + 1][0] * coords[i][1]);
  }
  return Math.abs(area / 2);
});

// Find zones intersecting with a given geometry
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
