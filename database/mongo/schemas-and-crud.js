/**
 * ============================================================================
 * URBAN MOBILITY PLATFORM - MONGODB DOCUMENT ENGINEERING (CO2)
 * BSON Schema Validation, CRUD Operations & Indexing
 * Run via mongosh or Node.js MongoDB driver
 * ============================================================================
 */

// 1. DATABASE & COLLECTION INITIALISATION WITH BSON SCHEMA VALIDATION
use('urban_mobility_nosql');

// Collection: telemetry_events (High-velocity IoT stream with BSON validator)
db.createCollection("telemetry_events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["vehicleNumber", "location", "speedKmh", "batteryPct", "timestamp"],
      properties: {
        vehicleNumber: {
          bsonType: "string",
          description: "Unique vehicle identifier string (e.g. TS09AB1234)"
        },
        routeId: {
          bsonType: ["int", "long", "null"],
          description: "Relational foreign key reference to route in PostgreSQL"
        },
        location: {
          bsonType: "object",
          required: ["type", "coordinates"],
          properties: {
            type: { enum: ["Point"], description: "GeoJSON Point type" },
            coordinates: {
              bsonType: "array",
              minItems: 2,
              maxItems: 2,
              items: { bsonType: "double" },
              description: "[longitude, latitude] in WGS84"
            }
          }
        },
        speedKmh: {
          bsonType: "double",
          minimum: 0.0,
          maximum: 200.0,
          description: "Instantaneous vehicle speed in km/h"
        },
        batteryPct: {
          bsonType: "int",
          minimum: 0,
          maximum: 100,
          description: "Remaining battery or fuel level percentage"
        },
        passengerCount: {
          bsonType: "int",
          minimum: 0,
          description: "Current onboard passenger count"
        },
        sensors: {
          bsonType: "object",
          properties: {
            cabinTempCelsius: { bsonType: "double" },
            tirePressurePsi: { bsonType: "double" },
            engineHealth: { enum: ["OPTIMAL", "WARNING", "FAULT"] }
          }
        },
        timestamp: {
          bsonType: "date",
          description: "Timestamp of ping arrival"
        }
      }
    }
  }
});

// Collection: rider_feedback (Unstructured sentiment & rating collection)
db.createCollection("rider_feedback", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "tripId", "rating", "createdAt"],
      properties: {
        userId: { bsonType: ["int", "long"] },
        tripId: { bsonType: ["int", "long"] },
        rating: { bsonType: "int", minimum: 1, maximum: 5 },
        tags: { bsonType: "array", items: { bsonType: "string" } },
        comment: { bsonType: "string" },
        sentimentScore: { bsonType: "double" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

// ----------------------------------------------------------------------------
// 2. INDEXING STRATEGIES
// ----------------------------------------------------------------------------

// A. 2dsphere Geospatial Index for Proximity & Polygon queries
db.telemetry_events.createIndex({ "location": "2dsphere" });

// B. Compound Index for Vehicle History Range Queries
db.telemetry_events.createIndex({ "vehicleNumber": 1, "timestamp": -1 });

// C. TTL (Time-To-Live) Index: Automatically Expire Telemetry Pings after 30 days
db.telemetry_events.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 });

// ----------------------------------------------------------------------------
// 3. CRUD OPERATIONS
// ----------------------------------------------------------------------------

// CREATE (Insert Document)
db.telemetry_events.insertOne({
  vehicleNumber: "TS09CD5678",
  routeId: NumberLong(1),
  location: {
    type: "Point",
    coordinates: [78.4867, 17.3850] // [longitude, latitude]
  },
  speedKmh: 42.5,
  batteryPct: 82,
  passengerCount: 28,
  sensors: {
    cabinTempCelsius: 23.4,
    tirePressurePsi: 32.0,
    engineHealth: "OPTIMAL"
  },
  timestamp: new Date()
});

// READ (Filter & Projection)
const activeBuses = db.telemetry_events.find(
  { batteryPct: { $lt: 30 } },
  { vehicleNumber: 1, batteryPct: 1, location: 1, _id: 0 }
).sort({ batteryPct: 1 });

// UPDATE (Atomic Operators: $set, $inc, $push)
db.telemetry_events.updateOne(
  { vehicleNumber: "TS09CD5678" },
  {
    $set: { "sensors.engineHealth": "WARNING" },
    $inc: { passengerCount: 3 }
  }
);

// DELETE
db.telemetry_events.deleteMany({
  timestamp: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
});
