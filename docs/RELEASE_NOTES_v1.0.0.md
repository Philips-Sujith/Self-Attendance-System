# SAS v1.0.0 — Release Notes

## Overview
**SAS (Self Attendance System) v1.0.0** is the initial production-ready release of the proxy-resistant attendance platform. Built on React Native (Expo SDK 57) and Supabase, SAS enables faculty instructors to launch localized classroom attendance sessions, while students verify their presence via physical Wi-Fi or mobile hotspot proximity before self-marking attendance.

---

## What's Included in v1.0.0

### 👨‍🏫 Faculty / Staff Features
- **Course Group Management**: Create course groups with custom section names, weekly schedules, and automatic 6-character Join Codes.
- **Student Roster Management**: Real-time view of enrolled students, enrollment dates, and semester attendance percentages.
- **Timed Attendance Sessions**: Launch 3, 5, 10, or 15-minute live attendance sessions with automatic session expiration.
- **Live Real-Time Sync**: View live present/absent counts updating synchronously via Supabase Realtime streams as students mark attendance.
- **Manual Attendance Overrides**: Override attendance status (Present, Absent, Late) with mandatory audit reason logging directly from the live roster.
- **Institutional PDF & CSV Reports**: Export high-resolution, print-safe vector PDF attendance reports (tested across 80+ student rosters) and master semester CSV files via native device sharing.

### 🎓 Student Features
- **Seamless Course Enrollment**: Join class groups instantly using course Join Codes.
- **Proximity-Verified Self-Attendance**: Automatic detection of teacher's local network beacon (`_sas-session._tcp`) with real-time UI status updates.
- **One-Tap Attendance Submission**: Securely submit attendance once local network presence is confirmed.
- **Attendance History**: View past attendance records and session details.

### 🛡️ Security & Anti-Proxy Architecture
- **Multicast DNS Beaconing**: Proximity verification is enforced via local network broadcast packets (mDNS/Bonjour), immune to GPS spoofing software.
- **Persistent Device Binding**: Prevents proxy attendance by enforcing unique physical hardware device constraints per attendance session.
- **Strict Row-Level Security (RLS)**: PostgreSQL RLS policies guarantee students can only mark their own attendance within open sessions, and faculty can only manage their owned classes.
- **Authentication Rate-Limiting**: In-flight mutex protection preventing duplicate requests and graceful handling of Auth 429 rate limits.

---

## Android APK Download

The standalone preview Android APK is available under the Assets section of this release:
- **Filename**: `SAS-v1.0.0.apk`
- **Application ID**: `com.sas.attendance`
- **Architecture**: Universal Android APK (ARM64, ARMv7, x86_64)

---

## Requirements

### Android
- **Operating System**: Android 8.0 (API Level 26) or higher.
- **Permissions Required**:
  - Wi-Fi State (`ACCESS_WIFI_STATE`, `CHANGE_WIFI_MULTICAST_STATE`)
  - Nearby Wi-Fi Devices (Android 13+ `NEARBY_WIFI_DEVICES`)
  - Internet Access (`INTERNET`, `ACCESS_NETWORK_STATE`)

---

## Important Network Requirements for Local Discovery

For students to discover the active teacher attendance beacon:
1. **Scenario A (Campus / Home Wi-Fi)**: Both the Teacher's phone and the Students' phones must be connected to the **same local Wi-Fi router / access point**.
   - *Note on Enterprise Wi-Fi*: If the campus Wi-Fi enforces **Client Isolation / AP Isolation** (blocking device-to-device multicast packets), use Scenario B.
2. **Scenario B (Teacher Mobile Hotspot — Recommended for Classroom Independence)**:
   - Teacher turns **ON Personal Hotspot** on their phone.
   - Students connect their phones to the **Teacher's Hotspot**.
   - Attendance verification resolves directly over the hotspot subnet (`192.168.43.x`).

---

## Known Limitations

- iOS Bonjour discovery requires the `NSLocalNetworkUsageDescription` prompt permission granted on first launch.
- Web browser preview supports administrative dashboard, group creation, and reporting, but native mDNS proximity scanning requires physical Android or iOS devices.
