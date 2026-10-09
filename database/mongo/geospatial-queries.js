/**
 * ============================================================================
 * URBAN MOBILITY PLATFORM - GEOSPATIAL QUERIES IN MONGODB (CO2)
 * Topics: 2dsphere Indexing, GeoJSON, $nearSphere, $geoWithin, $geoIntersects
 * ============================================================================
 */

use('urban_mobility_nosql');

// 1. Ensure 2dsphere index exists on location field
db.telemetry_events.createIndex({ "location": "2dsphere" });

// ----------------------------------------------------------------------------
// Query 1: Find Active Buses Near a Passenger's Current GPS Location
// ($nearSphere with $maxDistance in meters)
// ----------------------------------------------------------------------------
const passengerLat = 17.3850;
const passengerLng = 78.4867;
const searchRadiusMeters = 3000; // 3 km radius

const nearbyVehicles = db.telemetry_events.find({
  location: {
    $nearSphere: {
      $geometry: {
        type: "Point",
        coordinates: [passengerLng, passengerLat] // GeoJSON order: [lng, lat]
      },
      $maxDistance: searchRadiusMeters,
      $minDistance: 0
    }
  }
}, {
  vehicleNumber: 1,
  speedKmh: 1,
  batteryPct: 1,
  passengerCount: 1,
  location: 1,
  _id: 0
}).limit(5);

print("Nearby Vehicles within 3km radius:");
printjson(nearbyVehicles.toArray());

// ----------------------------------------------------------------------------
// Query 2: Find all Vehicles Operating Inside a Defined Geo-Fence / Zone
// ($geoWithin with Polygon geometry)
// ----------------------------------------------------------------------------
const techParkZonePolygon = {
  type: "Polygon",
  coordinates: [
    [
      [78.4800, 17.3800],
      [78.4900, 17.3800],
      [78.4950, 17.3950],
      [78.4800, 17.3950],
      [78.4800, 17.3800] // Must be closed (first and last coordinate match)
    ]
  ]
};

const vehiclesInZone = db.telemetry_events.find({
  location: {
    $geoWithin: {
      $geometry: techParkZonePolygon
    }
  }
});

print("Vehicles inside Tech Park Geo-Fence:");
printjson(vehiclesInZone.toArray());
