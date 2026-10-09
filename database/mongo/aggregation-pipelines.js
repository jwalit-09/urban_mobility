/**
 * ============================================================================
 * URBAN MOBILITY PLATFORM - MONGODB AGGREGATION PIPELINES (CO2)
 * Topics: $match, $group, $project, $lookup, $unwind, $facet, $bucket
 * ============================================================================
 */

use('urban_mobility_nosql');

// ----------------------------------------------------------------------------
// Pipeline 1: Fleet Telemetry & Battery Health Analytics
// Demonstrates: $match -> $group -> $project -> $sort
// ----------------------------------------------------------------------------
db.telemetry_events.aggregate([
  // Stage 1: Filter pings from the last 24 hours
  {
    $match: {
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  },
  // Stage 2: Group by vehicle number to compute fleet aggregates
  {
    $group: {
      _id: "$vehicleNumber",
      totalPings: { $sum: 1 },
      avgSpeed: { $avg: "$speedKmh" },
      maxSpeed: { $max: "$speedKmh" },
      minBattery: { $min: "$batteryPct" },
      latestPassengerCount: { $last: "$passengerCount" }
    }
  },
  // Stage 3: Shape and project output metrics
  {
    $project: {
      _id: 0,
      vehicleNumber: "$_id",
      totalPings: 1,
      avgSpeedKmh: { $round: ["$avgSpeed", 2] },
      maxSpeedKmh: { $round: ["$maxSpeed", 1] },
      lowestBatteryPct: "$minBattery",
      needsRecharge: { $lt: ["$minBattery", 25] }
    }
  },
  // Stage 4: Order by lowest battery ascending
  { $sort: { lowestBatteryPct: 1 } }
]);

// ----------------------------------------------------------------------------
// Pipeline 2: Rider Reviews Aggregation with Unwind & Group
// Demonstrates: $unwind on tag arrays, $group by tag popularity, $avg rating
// ----------------------------------------------------------------------------
db.rider_feedback.aggregate([
  // Stage 1: Unwind tags array to flatten multi-valued feedback tags
  { $unwind: "$tags" },
  // Stage 2: Group by each tag
  {
    $group: {
      _id: "$tags",
      occurrenceCount: { $sum: 1 },
      avgRating: { $avg: "$rating" }
    }
  },
  // Stage 3: Format output
  {
    $project: {
      _id: 0,
      tag: "$_id",
      count: "$occurrenceCount",
      averageRating: { $round: ["$avgRating", 2] }
    }
  },
  { $sort: { count: -1 } }
]);

// ----------------------------------------------------------------------------
// Pipeline 3: Multi-Faceted Fleet Analytics with $facet
// Demonstrates: executing parallel sub-pipelines in a single database round-trip
// ----------------------------------------------------------------------------
db.telemetry_events.aggregate([
  {
    $facet: {
      // Facet A: Vehicle Speed Buckets (Histogram)
      "speedDistribution": [
        {
          $bucket: {
            groupBy: "$speedKmh",
            boundaries: [0, 20, 40, 60, 80, 120],
            default: "OverSpeed",
            output: {
              count: { $sum: 1 },
              vehicles: { $addToSet: "$vehicleNumber" }
            }
          }
        }
      ],
      // Facet B: Low Battery Alert Vehicles
      "criticalBatteryAlerts": [
        { $match: { batteryPct: { $lt: 20 } } },
        {
          $project: {
            vehicleNumber: 1,
            batteryPct: 1,
            timestamp: 1,
            _id: 0
          }
        },
        { $limit: 10 }
      ]
    }
  }
]);
