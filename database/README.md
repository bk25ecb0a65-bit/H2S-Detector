# H2S Detector - Database Documentation

### 1. MongoDB Connection Details
- **Database Engine**: MongoDB
- **Local Connection URI**: `mongodb://127.0.0.1:27017`
- **Database Name**: `h2s_detector`
- **Status**: Active & Connected

### 2. Live Collections in MongoDB
- **`workers`**: Operator workforce records, badge assignments, cumulative dose (ppm·hr), and safety statuses.
- **`exposurescans`**: Complete measurement audit logs containing raw RGB/Lab, lighting-corrected RGB/Lab, exact continuous ppm, detected color, and duration.
- **`calibrationstandards`**: Constant 7-block physical reference scale standards (Blank, Trace Cream, Yellow, Amber, Deep Amber, Grey 10 ppm, Black 20 ppm).
- **`empiricalmatrices`**: 42 empirical response patches sampled from Figure (a) of the scientific paper across all 6 exposure durations (30s, 1min, 5min, 10min, 30min, 60min).
- **`safetyalerts`**: OSHA 10 ppm threshold exceedance records generated automatically whenever exposure >= 10.0 ppm, Grey, or Black is detected.
- **`badges`**: Physical dosimeter hardware tracking.

### 3. How to View in MongoDB Compass
1. Open **MongoDB Compass**.
2. Connect to: `mongodb://127.0.0.1:27017`
3. Open the `h2s_detector` database to view and edit live documents.
