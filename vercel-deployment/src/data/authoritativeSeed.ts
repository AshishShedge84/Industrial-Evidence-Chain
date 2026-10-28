// Authoritative IEC Database Seed Data
// Automatically extracted and normalized from database/iec_db_authoritative_backup.sql

import type { User } from '@type-defs/auth';
import type { Asset } from '@type-defs/asset';
import type { Evidence, BlockchainProof } from '@type-defs/evidence';
import type { Notification } from '@type-defs/notification';

export const SEEDED_USERS: User[] = [
  {
    "id": "09593e09-0f60-42b0-9050-e98b1bca2446",
    "email": "manager@iec.app",
    "username": "manager",
    "fullName": "Sarah Connor",
    "firstName": "Sarah",
    "lastName": "Connor",
    "role": "Manager",
    "status": "active",
    "createdAt": "2026-09-09 12:51:37.603023+05:30",
    "updatedAt": "2026-09-09 12:51:37.603023+05:30"
  },
  {
    "id": "a26ac9b9-a1fc-435b-8d3b-4823cf3cccac",
    "email": "auditor@iec.app",
    "username": "auditor",
    "fullName": "Michael Chen",
    "firstName": "Michael",
    "lastName": "Chen",
    "role": "Auditor",
    "status": "active",
    "createdAt": "2026-09-09 12:51:37.619152+05:30",
    "updatedAt": "2026-09-09 12:51:37.619152+05:30"
  },
  {
    "id": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "email": "bablu@iec.app",
    "username": "tech",
    "fullName": "Bablu Electrician",
    "firstName": "Bablu",
    "lastName": "Electrician",
    "role": "Technician",
    "status": "active",
    "createdAt": "2026-09-09 12:51:37.585925+05:30",
    "updatedAt": "2026-09-09 23:57:24.345259+05:30"
  },
  {
    "id": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "email": "admin@iec.app",
    "username": "admin",
    "fullName": "Admin User",
    "firstName": "Admin",
    "lastName": "User",
    "role": "Admin",
    "status": "active",
    "createdAt": "2026-09-09 12:51:37.536826+05:30",
    "updatedAt": "2026-09-11 15:21:55.718193+05:30"
  }
];

export const SEEDED_ASSETS: Asset[] = [
  {
    "id": "8f649350-fce0-4301-9a6d-e53f1b52b7c4",
    "assetTag": "ASSET-6532",
    "name": "Industrial Turbine Alpha",
    "description": "Main power generation turbine.",
    "category": "Machinery",
    "status": "Active",
    "location": {
      "site": "Main Facility"
    },
    "specifications": {},
    "qrCode": "ASSET-6532",
    "createdBy": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "assignedTo": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "createdAt": "2026-09-09 13:04:15.130799+05:30",
    "updatedAt": "2026-09-09 13:04:15.130799+05:30"
  },
  {
    "id": "e2552401-83bf-4aa8-993d-4d7da29d2ac6",
    "assetTag": "HVAC-8092",
    "name": "Main Campus HVAC Unit 1",
    "description": "Primary climate control system for building A",
    "category": "Facility",
    "status": "Active",
    "location": {
      "site": "Campus A",
      "building": "Bldg 1",
      "floor": "Roof",
      "room": "R-1"
    },
    "specifications": {},
    "qrCode": "HVAC-8092",
    "createdBy": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "assignedTo": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "createdAt": "2026-09-09 20:31:43.234226+05:30",
    "updatedAt": "2026-09-09 20:31:43.234226+05:30"
  },
  {
    "id": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
    "assetTag": "SENS-9941",
    "name": "Vibration Analysis Sensor",
    "description": "IoT sensor monitoring turbine stability",
    "category": "Instrument",
    "status": "Active",
    "location": {
      "site": "Power Plant",
      "building": "Generator Hall",
      "floor": "1"
    },
    "specifications": {},
    "qrCode": "SENS-9941",
    "createdBy": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "assignedTo": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "createdAt": "2026-09-09 20:31:43.23998+05:30",
    "updatedAt": "2026-09-09 20:31:43.23998+05:30"
  },
  {
    "id": "751bf6ee-443e-4b3c-a1d7-41dfb8e315dc",
    "assetTag": "CONV-5510",
    "name": "Assembly Line Conveyor Belt",
    "description": "Main production line transport belt",
    "category": "Machinery",
    "status": "Active",
    "location": {
      "site": "Factory 1",
      "building": "Assembly",
      "floor": "1",
      "room": "Main Floor"
    },
    "specifications": {},
    "qrCode": "CONV-5510",
    "createdBy": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "assignedTo": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "createdAt": "2026-09-09 20:31:43.23805+05:30",
    "updatedAt": "2026-09-11 17:27:48.936126+05:30"
  }
];

export const SEEDED_EVIDENCE: Evidence[] = [
  {
    "evidenceId": "798ead85-7101-4051-b6f1-a14c0c8c87b1",
    "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Quality",
    "timestamp": "2026-09-09 20:33:00.472225+05:30",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.006,
      "timestamp": "2026-09-09 20:33:00.472225+05:30"
    },
    "description": "Recalibrated accelerometer values according to Q3 standards. Flagged for follow-up.",
    "mediaReferences": [],
    "status": "Submitted",
    "assetName": "Vibration Analysis Sensor",
    "assetCode": "SENS-9941",
    "createdAt": "2026-09-09 20:33:00.472225+05:30",
    "updatedAt": "2026-09-09 20:33:00.472225+05:30"
  },
  {
    "evidenceId": "113cccf2-439b-4d3a-8889-0d34f74a04e8",
    "assetId": "751bf6ee-443e-4b3c-a1d7-41dfb8e315dc",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Maintenance",
    "timestamp": "2026-09-09 20:33:00.508426+05:30",
    "location": {
      "latitude": 34.0522,
      "longitude": -118.2437,
      "timestamp": "2026-09-09 20:33:00.508426+05:30"
    },
    "description": "Repaired loose belt tensioner on sector 3.",
    "mediaReferences": [],
    "status": "Submitted",
    "assetName": "Assembly Line Conveyor Belt",
    "assetCode": "CONV-5510",
    "createdAt": "2026-09-09 20:33:00.508426+05:30",
    "updatedAt": "2026-09-09 20:33:00.508426+05:30"
  },
  {
    "evidenceId": "9ae15009-9305-4f38-935a-cdada5df8d96",
    "assetId": "e2552401-83bf-4aa8-993d-4d7da29d2ac6",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Inspection",
    "timestamp": "2026-09-09 20:33:00.510775+05:30",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "timestamp": "2026-09-09 20:33:00.510775+05:30"
    },
    "description": "Routine monthly inspection of filter status and coolant pressure. All levels normal.",
    "mediaReferences": [],
    "status": "Submitted",
    "assetName": "Main Campus HVAC Unit 1",
    "assetCode": "HVAC-8092",
    "createdAt": "2026-09-09 20:33:00.510775+05:30",
    "updatedAt": "2026-09-09 20:33:00.510775+05:30"
  },
  {
    "evidenceId": "ffa2b924-9562-46d2-822e-d6ef1a64cb30",
    "assetId": "e2552401-83bf-4aa8-993d-4d7da29d2ac6",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Maintenance",
    "timestamp": "2026-09-09 20:33:00.512789+05:30",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "timestamp": "2026-09-09 20:33:00.512789+05:30"
    },
    "description": "Replaced primary air filter and cleaned intake vents.",
    "mediaReferences": [],
    "status": "Submitted",
    "assetName": "Main Campus HVAC Unit 1",
    "assetCode": "HVAC-8092",
    "createdAt": "2026-09-09 20:33:00.512789+05:30",
    "updatedAt": "2026-09-09 20:33:00.512789+05:30"
  },
  {
    "evidenceId": "c56c4859-5f5a-465e-bf39-963418f19de1",
    "assetId": "8f649350-fce0-4301-9a6d-e53f1b52b7c4",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Inspection",
    "timestamp": "2026-09-09 20:33:00.514664+05:30",
    "location": {
      "latitude": 51.5074,
      "longitude": -0.1278,
      "timestamp": "2026-09-09 20:33:00.514664+05:30"
    },
    "description": "Visual inspection of turbine casing. No cracks or deformities detected.",
    "mediaReferences": [],
    "status": "Submitted",
    "assetName": "Industrial Turbine Alpha",
    "assetCode": "ASSET-6532",
    "createdAt": "2026-09-09 20:33:00.514664+05:30",
    "updatedAt": "2026-09-09 20:33:00.514664+05:30"
  },
  {
    "evidenceId": "b0668bc4-239d-4f3e-9444-4fa2eb5ff4ec",
    "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Maintenance",
    "timestamp": "2026-09-09 22:34:09.553+05:30",
    "location": {
      "latitude": 19.076,
      "longitude": 72.8777,
      "timestamp": "2026-09-09 22:34:09.553+05:30"
    },
    "description": "Quarterly vibration sensor recalibration and hermetic seal inspection performed successfully. Operating voltage and frequency within nominal specifications.",
    "mediaReferences": [
      {
        "id": "0cfbd54f-6241-44d6-8fb0-ed239c79a133",
        "type": "photo",
        "url": "/uploads/2026/09/eac79841d2a946c9ac6b8e00e81aeac1_photo_1788973457916.jpg",
        "size": 11138,
        "mimeType": "image/jpeg",
        "checksum": "c1349c4646cf62da1cc6de49a0e1e36a1d3050afd8429c055534170c0fb050d6",
        "capturedAt": "2026-09-09 22:34:22.770572+05:30",
        "uploadedAt": "2026-09-09 22:34:22.770572+05:30"
      }
    ],
    "status": "Anchored",
    "blockchainProof": {
      "transactionId": "aac9a7f16c60e37f53fe529012e478f88241cf16f8754533907cc6d9d392231d",
      "blockNumber": 104250,
      "blockHash": "0x9c3ea66fc8658886b891434d6db46a1a2e7d4ade0f570009b12568302aa9b799",
      "merkleRoot": "0x9c3ea66fc8658886b891434d6db46a1a2e7d4ade0f570009b12568302aa9b799",
      "merkleProof": [
        "0x9c3ea66fc8658886b891434d6db46a1a2e7d4ade0f570009b12568302aa9b799"
      ],
      "timestamp": "2026-09-09 22:34:22.855169+05:30",
      "network": "Hyperledger Fabric (IEC Industrial Channel)"
    },
    "evidenceHash": "9c3ea66fc8658886b891434d6db46a1a2e7d4ade0f570009b12568302aa9b799",
    "assetName": "Vibration Analysis Sensor",
    "assetCode": "SENS-9941",
    "createdAt": "2026-09-09 22:34:22.698426+05:30",
    "updatedAt": "2026-09-09 22:34:22.698426+05:30",
    "anchoredAt": "2026-09-09 22:34:22.855169+05:30"
  },
  {
    "evidenceId": "beb587a2-62c9-411d-a37b-5514d7c16405",
    "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Maintenance",
    "timestamp": "2026-09-09 22:37:29.788+05:30",
    "location": {
      "latitude": 19.076,
      "longitude": 72.8777,
      "timestamp": "2026-09-09 22:37:29.788+05:30"
    },
    "description": "Quarterly vibration sensor recalibration and hermetic seal inspection performed successfully. Operating voltage and frequency within nominal specifications.",
    "mediaReferences": [
      {
        "id": "c2a0f80f-cc1b-495d-8270-b26a2533c5cf",
        "type": "photo",
        "url": "/uploads/2026/09/c9a17005d2554ccd8bfa3297f3b97e43_photo_1788973658290.jpg",
        "size": 11122,
        "mimeType": "image/jpeg",
        "checksum": "9b39957979a75390d280ff46d16f111d042a4beae89ef69e9828cf46faa381e7",
        "capturedAt": "2026-09-09 22:37:42.908176+05:30",
        "uploadedAt": "2026-09-09 22:37:42.908176+05:30"
      }
    ],
    "status": "Anchored",
    "blockchainProof": {
      "transactionId": "364d25e45dce38c047579114cd21f9534f9c85e9789631117e12c782314ea36a",
      "blockNumber": 104250,
      "blockHash": "0x53dd21f505ce734bdd04bbeb76bc4cb2977ea1a5b7ceaee4d36f1b909118bb78",
      "merkleRoot": "0x53dd21f505ce734bdd04bbeb76bc4cb2977ea1a5b7ceaee4d36f1b909118bb78",
      "merkleProof": [
        "0x53dd21f505ce734bdd04bbeb76bc4cb2977ea1a5b7ceaee4d36f1b909118bb78"
      ],
      "timestamp": "2026-09-09 22:37:42.914851+05:30",
      "network": "Hyperledger Fabric (IEC Industrial Channel)"
    },
    "evidenceHash": "53dd21f505ce734bdd04bbeb76bc4cb2977ea1a5b7ceaee4d36f1b909118bb78",
    "assetName": "Vibration Analysis Sensor",
    "assetCode": "SENS-9941",
    "createdAt": "2026-09-09 22:37:42.899376+05:30",
    "updatedAt": "2026-09-09 22:37:42.899376+05:30",
    "anchoredAt": "2026-09-09 22:37:42.914851+05:30"
  },
  {
    "evidenceId": "06bcbe68-b960-4385-9a27-a76d0fcfc7fc",
    "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Maintenance",
    "timestamp": "2026-09-09 22:43:45.607+05:30",
    "location": {
      "latitude": 19.076,
      "longitude": 72.8777,
      "timestamp": "2026-09-09 22:43:45.607+05:30"
    },
    "description": "Quarterly vibration sensor recalibration and hermetic seal inspection performed successfully. Operating voltage and frequency within nominal specifications.",
    "mediaReferences": [
      {
        "id": "366d1d53-28f2-4135-8d2b-e03d6748e0fe",
        "type": "photo",
        "url": "/uploads/2026/09/36eabc954e7a4603935d7842c00144bb_photo_1788974033886.jpg",
        "size": 11062,
        "mimeType": "image/jpeg",
        "checksum": "47910cd99ece9658191e3d42d6d12a8d7eaea0a13b13e0d57778ee58819a76da",
        "capturedAt": "2026-09-09 22:43:58.507095+05:30",
        "uploadedAt": "2026-09-09 22:43:58.507095+05:30"
      }
    ],
    "status": "Anchored",
    "blockchainProof": {
      "transactionId": "1c30c52f30b4da571ca8ed40467a8aa6059aac7acc9dac85777e9164d7a03b11",
      "blockNumber": 104250,
      "blockHash": "0x9dfaeefe4f01211542363494faa981ddfc545fb483b56548380f93b81e3fd479",
      "merkleRoot": "0x9dfaeefe4f01211542363494faa981ddfc545fb483b56548380f93b81e3fd479",
      "merkleProof": [
        "0x9dfaeefe4f01211542363494faa981ddfc545fb483b56548380f93b81e3fd479"
      ],
      "timestamp": "2026-09-09 22:43:58.513799+05:30",
      "network": "Hyperledger Fabric (IEC Industrial Channel)"
    },
    "evidenceHash": "9dfaeefe4f01211542363494faa981ddfc545fb483b56548380f93b81e3fd479",
    "assetName": "Vibration Analysis Sensor",
    "assetCode": "SENS-9941",
    "createdAt": "2026-09-09 22:43:58.497766+05:30",
    "updatedAt": "2026-09-09 22:43:58.497766+05:30",
    "anchoredAt": "2026-09-09 22:43:58.513799+05:30"
  },
  {
    "evidenceId": "58f2d98a-a3b1-4242-8a0a-903d633e2f64",
    "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Maintenance",
    "timestamp": "2026-09-11 11:44:00.638+05:30",
    "location": {
      "latitude": 19.103675,
      "longitude": 73.0072823,
      "timestamp": "2026-09-11 11:44:00.638+05:30"
    },
    "description": "Nothing",
    "mediaReferences": [
      {
        "id": "81b2fe0c-0ee1-4f14-a203-bf4cd0c4d4c7",
        "type": "photo",
        "url": "/uploads/2026/09/237661b1ee264b32a6647b459f53c9fd_photo_1789107272615.jpg",
        "size": 143371,
        "mimeType": "image/jpeg",
        "checksum": "86f8db2c0866a0933cfed404ad242817fba57c1083765b41dd4b6494da8873b6",
        "capturedAt": "2026-09-11 11:44:53.527303+05:30",
        "uploadedAt": "2026-09-11 11:44:53.527303+05:30"
      }
    ],
    "status": "Anchored",
    "blockchainProof": {
      "transactionId": "e147371a30791ca1d0e0b48fc448f33b96972be8a420d70b824f2a5c7c874763",
      "blockNumber": 104250,
      "blockHash": "0x4951581b57471207654469aadc00bbd3871da7aa72eedcf00f41fe7fc90a594a",
      "merkleRoot": "0x4951581b57471207654469aadc00bbd3871da7aa72eedcf00f41fe7fc90a594a",
      "merkleProof": [
        "0x4951581b57471207654469aadc00bbd3871da7aa72eedcf00f41fe7fc90a594a"
      ],
      "timestamp": "2026-09-11 11:44:53.571726+05:30",
      "network": "Hyperledger Fabric (IEC Industrial Channel)"
    },
    "evidenceHash": "4951581b57471207654469aadc00bbd3871da7aa72eedcf00f41fe7fc90a594a",
    "assetName": "Vibration Analysis Sensor",
    "assetCode": "SENS-9941",
    "createdAt": "2026-09-11 11:44:53.46312+05:30",
    "updatedAt": "2026-09-11 11:44:53.46312+05:30",
    "anchoredAt": "2026-09-11 11:44:53.571726+05:30"
  },
  {
    "evidenceId": "7147b02e-a680-4727-ac89-0efd1f2f94a3",
    "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Maintenance",
    "timestamp": "2026-09-11 12:22:28.918+05:30",
    "location": {
      "latitude": 19.1037102,
      "longitude": 73.0072327,
      "timestamp": "2026-09-11 12:22:28.918+05:30"
    },
    "description": "test 2",
    "mediaReferences": [
      {
        "id": "e2391af9-da90-4a5a-9a96-c2abbbd81ddf",
        "type": "photo",
        "url": "/uploads/2026/09/00894e8ee5f2454fb802952437d8ea63_photo_1789109604269.jpg",
        "size": 121755,
        "mimeType": "image/jpeg",
        "checksum": "f6a288d5737d357564c1e8a28620f7d8a3810a4630def2caf9a1ebf91ded1548",
        "capturedAt": "2026-09-11 12:23:43.930891+05:30",
        "uploadedAt": "2026-09-11 12:23:43.930891+05:30"
      }
    ],
    "status": "Anchored",
    "blockchainProof": {
      "transactionId": "33d64a5d1291da998e11379a024c45d927520d9d4f0b2dff4b0726b467c12816",
      "blockNumber": 104250,
      "blockHash": "0xc90948c3bed86a378cc94f364a92be0f805ffeef6984a3aaea85a648526fc01e",
      "merkleRoot": "0xc90948c3bed86a378cc94f364a92be0f805ffeef6984a3aaea85a648526fc01e",
      "merkleProof": [
        "0xc90948c3bed86a378cc94f364a92be0f805ffeef6984a3aaea85a648526fc01e"
      ],
      "timestamp": "2026-09-11 12:23:43.975221+05:30",
      "network": "Hyperledger Fabric (IEC Industrial Channel)"
    },
    "evidenceHash": "c90948c3bed86a378cc94f364a92be0f805ffeef6984a3aaea85a648526fc01e",
    "assetName": "Vibration Analysis Sensor",
    "assetCode": "SENS-9941",
    "createdAt": "2026-09-11 12:23:43.830859+05:30",
    "updatedAt": "2026-09-11 12:23:43.830859+05:30",
    "anchoredAt": "2026-09-11 12:23:43.975221+05:30"
  },
  {
    "evidenceId": "c299ec6e-63c4-4263-9f2b-350b99bfefed",
    "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Inspection",
    "timestamp": "2026-09-11 15:30:00+05:30",
    "location": {
      "latitude": 12.9716,
      "longitude": 77.5946,
      "timestamp": "2026-09-11 15:30:00+05:30"
    },
    "description": "Automated end-to-end verification of camera & chain anchoring pipeline",
    "mediaReferences": [],
    "status": "Submitted",
    "assetName": "Vibration Analysis Sensor",
    "assetCode": "SENS-9941",
    "createdAt": "2026-09-11 15:21:33.776248+05:30",
    "updatedAt": "2026-09-11 15:21:33.776248+05:30"
  },
  {
    "evidenceId": "dda1768c-3882-4ecb-aceb-7fefe5dd51b1",
    "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Inspection",
    "timestamp": "2026-09-11 15:30:00+05:30",
    "location": {
      "latitude": 19.076,
      "longitude": 72.8777,
      "timestamp": "2026-09-11 15:30:00+05:30"
    },
    "description": "Test",
    "mediaReferences": [],
    "status": "Anchored",
    "blockchainProof": {
      "transactionId": "156e7c3ec36ec6881badc7c870802f69e04e1d690094a14c57cdca7ca0680e42",
      "blockNumber": 104250,
      "blockHash": "0x51d4656b11b1248eb5bf6112d62b601c16c8787a4c6ce5876c36272601750ede",
      "merkleRoot": "0x51d4656b11b1248eb5bf6112d62b601c16c8787a4c6ce5876c36272601750ede",
      "merkleProof": [
        "0x51d4656b11b1248eb5bf6112d62b601c16c8787a4c6ce5876c36272601750ede"
      ],
      "timestamp": "2026-09-11 15:21:40.788475+05:30",
      "network": "Hyperledger Fabric (IEC Industrial Channel)"
    },
    "evidenceHash": "51d4656b11b1248eb5bf6112d62b601c16c8787a4c6ce5876c36272601750ede",
    "assetName": "Vibration Analysis Sensor",
    "assetCode": "SENS-9941",
    "createdAt": "2026-09-11 15:21:37.551619+05:30",
    "updatedAt": "2026-09-11 15:21:37.551619+05:30",
    "anchoredAt": "2026-09-11 15:21:40.788475+05:30"
  },
  {
    "evidenceId": "60e39cad-5ab8-4a7d-ba51-ddb30a60e6a0",
    "assetId": "e2552401-83bf-4aa8-993d-4d7da29d2ac6",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Maintenance",
    "timestamp": "2026-09-11 15:45:31.815+05:30",
    "location": {
      "latitude": 19.031054,
      "longitude": 73.0588868,
      "timestamp": "2026-09-11 15:45:31.815+05:30"
    },
    "description": "test 3",
    "mediaReferences": [
      {
        "id": "dda6c81f-45ba-48a2-aa66-af25737c6ef9",
        "type": "photo",
        "url": "/uploads/2026/09/be595766af7f452792602c2713f44638_photo_1789121760878.jpg",
        "size": 144760,
        "mimeType": "image/jpeg",
        "checksum": "cff6f526a2183633abd740f440093900bd824275b0d9cb47bd899969deaf6799",
        "capturedAt": "2026-09-11 15:46:27.060592+05:30",
        "uploadedAt": "2026-09-11 15:46:27.060592+05:30"
      }
    ],
    "status": "Anchored",
    "blockchainProof": {
      "transactionId": "d53150bb339736f127abfcb616d353025777648f1490007a0736edd272040323",
      "blockNumber": 104250,
      "blockHash": "0xb534ba80525ee4745303863fd748168401ce346fc4a5d89d51b16338661904b0",
      "merkleRoot": "0xb534ba80525ee4745303863fd748168401ce346fc4a5d89d51b16338661904b0",
      "merkleProof": [
        "0xb534ba80525ee4745303863fd748168401ce346fc4a5d89d51b16338661904b0"
      ],
      "timestamp": "2026-09-11 15:46:27.068086+05:30",
      "network": "Hyperledger Fabric (IEC Industrial Channel)"
    },
    "evidenceHash": "b534ba80525ee4745303863fd748168401ce346fc4a5d89d51b16338661904b0",
    "assetName": "Main Campus HVAC Unit 1",
    "assetCode": "HVAC-8092",
    "createdAt": "2026-09-11 15:46:27.043034+05:30",
    "updatedAt": "2026-09-11 15:46:27.043034+05:30",
    "anchoredAt": "2026-09-11 15:46:27.068086+05:30"
  },
  {
    "evidenceId": "71592a11-717d-4144-a9ad-b2c0cab630db",
    "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Maintenance",
    "timestamp": "2026-09-11 17:37:45+05:30",
    "location": {
      "latitude": 12.971598,
      "longitude": 77.594566,
      "timestamp": "2026-09-11 17:37:45+05:30"
    },
    "description": "LAN Device Real Evidence Capture Test",
    "mediaReferences": [
      {
        "id": "dcbae4fb-892a-4036-a763-8aad345b272b",
        "type": "photo",
        "url": "/uploads/2026/09/339311db763e437bb65010f4087cdf62_camera_capture.jpg",
        "size": 59,
        "mimeType": "image/jpeg",
        "checksum": "84281f942ec7f5cf5f42f235066c3221dd9861c6a9e871754a542d5c63a716c8",
        "capturedAt": "2026-09-11 17:37:45.668885+05:30",
        "uploadedAt": "2026-09-11 17:37:45.668885+05:30"
      },
      {
        "id": "dc8252e9-4fd1-4ac9-8ee6-ba1cb39b3f8c",
        "type": "video",
        "url": "/uploads/2026/09/e132b0fbb8d84ef68efaee51389c79d6_video_capture.webm",
        "size": 60,
        "mimeType": "video/webm",
        "checksum": "870ec975d9042f23686ef15acee58d9929cdd1af88abeb64bbe92ad84db74bb2",
        "capturedAt": "2026-09-11 17:37:45.713195+05:30",
        "uploadedAt": "2026-09-11 17:37:45.713195+05:30"
      }
    ],
    "status": "Anchored",
    "blockchainProof": {
      "transactionId": "5b43d6b720986dd661f55a10b8ac2f43c9e12dfe08d6497eac8a6d44dd06b41d",
      "blockNumber": 104250,
      "blockHash": "0xdc228477073b7defb2df029df4a335887ddedbc354151dc5f9c9eb262968ab3e",
      "merkleRoot": "0xdc228477073b7defb2df029df4a335887ddedbc354151dc5f9c9eb262968ab3e",
      "merkleProof": [
        "0xdc228477073b7defb2df029df4a335887ddedbc354151dc5f9c9eb262968ab3e"
      ],
      "timestamp": "2026-09-11 17:37:45.796914+05:30",
      "network": "Hyperledger Fabric (IEC Industrial Channel)"
    },
    "evidenceHash": "dc228477073b7defb2df029df4a335887ddedbc354151dc5f9c9eb262968ab3e",
    "assetName": "Vibration Analysis Sensor",
    "assetCode": "SENS-9941",
    "createdAt": "2026-09-11 17:37:45.588511+05:30",
    "updatedAt": "2026-09-11 17:37:45.588511+05:30",
    "anchoredAt": "2026-09-11 17:37:45.796914+05:30"
  },
  {
    "evidenceId": "a3c0aabe-a872-4472-8faf-c8c8e7787971",
    "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Maintenance",
    "timestamp": "2026-09-11 17:38:05+05:30",
    "location": {
      "latitude": 12.971598,
      "longitude": 77.594566,
      "timestamp": "2026-09-11 17:38:05+05:30"
    },
    "description": "LAN Device Real Evidence Capture Test",
    "mediaReferences": [
      {
        "id": "467f169b-37fb-424e-a048-90a2da4d9b64",
        "type": "photo",
        "url": "/uploads/images/e23b863b6e4e46198c125b9701d63832_camera_capture.jpg",
        "size": 59,
        "mimeType": "image/jpeg",
        "checksum": "4ba4cdc4cdc325c837cf750b07466730b39dc5e33c4a83164735dc3f5ad52bfc",
        "capturedAt": "2026-09-11 17:38:05.749707+05:30",
        "uploadedAt": "2026-09-11 17:38:05.749707+05:30"
      },
      {
        "id": "54de15c8-778a-4c09-b0b1-acb0284eab10",
        "type": "video",
        "url": "/uploads/videos/a5785ff589ac41f6a0d7622b93c8f0b2_video_capture.webm",
        "size": 60,
        "mimeType": "video/webm",
        "checksum": "6e2bd46a42dd2d77a707ff38c55b385f7e2ddf7e1d53418adce9f4801dfdace8",
        "capturedAt": "2026-09-11 17:38:05.798023+05:30",
        "uploadedAt": "2026-09-11 17:38:05.798023+05:30"
      }
    ],
    "status": "Anchored",
    "blockchainProof": {
      "transactionId": "2cbe2136a26d392906d8cf341a1524833b31d1b5e78cab3c47ea7803a241c84c",
      "blockNumber": 104250,
      "blockHash": "0xab44368a65475a072219f06e5ee0869ddb4deb912e99951e6c2999d8d3e8bf18",
      "merkleRoot": "0xab44368a65475a072219f06e5ee0869ddb4deb912e99951e6c2999d8d3e8bf18",
      "merkleProof": [
        "0xab44368a65475a072219f06e5ee0869ddb4deb912e99951e6c2999d8d3e8bf18"
      ],
      "timestamp": "2026-09-11 17:38:05.910051+05:30",
      "network": "Hyperledger Fabric (IEC Industrial Channel)"
    },
    "evidenceHash": "ab44368a65475a072219f06e5ee0869ddb4deb912e99951e6c2999d8d3e8bf18",
    "assetName": "Vibration Analysis Sensor",
    "assetCode": "SENS-9941",
    "createdAt": "2026-09-11 17:38:05.641018+05:30",
    "updatedAt": "2026-09-11 17:38:05.641018+05:30",
    "anchoredAt": "2026-09-11 17:38:05.910051+05:30"
  },
  {
    "evidenceId": "768a76bd-6693-4767-986b-abcc6f68e6f5",
    "assetId": "751bf6ee-443e-4b3c-a1d7-41dfb8e315dc",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "activityType": "Quality",
    "timestamp": "2026-09-11 19:11:02.129+05:30",
    "location": {
      "latitude": 19.0307069,
      "longitude": 73.0598692,
      "timestamp": "2026-09-11 19:11:02.129+05:30"
    },
    "description": "Test 4",
    "mediaReferences": [
      {
        "id": "cb5e0637-9022-433a-b2cf-62902f835d43",
        "type": "photo",
        "url": "/uploads/images/011e58e585d4423aa4d2731fd6ffbeb2_photo_1789134114562.jpg",
        "size": 103551,
        "mimeType": "image/jpeg",
        "checksum": "49fe5c6ba0c26593066a176774b3d8eccb0605e0ab675433c4b1cbecbbe55f6d",
        "capturedAt": "2026-09-11 19:12:22.039842+05:30",
        "uploadedAt": "2026-09-11 19:12:22.039842+05:30"
      }
    ],
    "status": "Anchored",
    "blockchainProof": {
      "transactionId": "031b954d971af80dce23bbf5214bda516ff831a9375e6d8cba1cd6aa10b3f77a",
      "blockNumber": 104250,
      "blockHash": "0x5a3d85db9019a315097c202428f253264a7ea1bf71d7a079e5f61b8e60b5ce16",
      "merkleRoot": "0x5a3d85db9019a315097c202428f253264a7ea1bf71d7a079e5f61b8e60b5ce16",
      "merkleProof": [
        "0x5a3d85db9019a315097c202428f253264a7ea1bf71d7a079e5f61b8e60b5ce16"
      ],
      "timestamp": "2026-09-11 19:12:22.258914+05:30",
      "network": "Hyperledger Fabric (IEC Industrial Channel)"
    },
    "evidenceHash": "5a3d85db9019a315097c202428f253264a7ea1bf71d7a079e5f61b8e60b5ce16",
    "assetName": "Assembly Line Conveyor Belt",
    "assetCode": "CONV-5510",
    "createdAt": "2026-09-11 19:12:21.61771+05:30",
    "updatedAt": "2026-09-11 19:12:21.61771+05:30",
    "anchoredAt": "2026-09-11 19:12:22.258914+05:30"
  }
];

export const SEEDED_PROOFS: BlockchainProof[] = [
  {
    "transactionId": "aac9a7f16c60e37f53fe529012e478f88241cf16f8754533907cc6d9d392231d",
    "blockNumber": 104250,
    "blockHash": "0x9c3ea66fc8658886b891434d6db46a1a2e7d4ade0f570009b12568302aa9b799",
    "merkleRoot": "0x9c3ea66fc8658886b891434d6db46a1a2e7d4ade0f570009b12568302aa9b799",
    "merkleProof": [
      "0x9c3ea66fc8658886b891434d6db46a1a2e7d4ade0f570009b12568302aa9b799"
    ],
    "timestamp": "2026-09-09 22:34:22.855169+05:30",
    "network": "Hyperledger Fabric (IEC Industrial Channel)"
  },
  {
    "transactionId": "364d25e45dce38c047579114cd21f9534f9c85e9789631117e12c782314ea36a",
    "blockNumber": 104250,
    "blockHash": "0x53dd21f505ce734bdd04bbeb76bc4cb2977ea1a5b7ceaee4d36f1b909118bb78",
    "merkleRoot": "0x53dd21f505ce734bdd04bbeb76bc4cb2977ea1a5b7ceaee4d36f1b909118bb78",
    "merkleProof": [
      "0x53dd21f505ce734bdd04bbeb76bc4cb2977ea1a5b7ceaee4d36f1b909118bb78"
    ],
    "timestamp": "2026-09-09 22:37:42.914851+05:30",
    "network": "Hyperledger Fabric (IEC Industrial Channel)"
  },
  {
    "transactionId": "1c30c52f30b4da571ca8ed40467a8aa6059aac7acc9dac85777e9164d7a03b11",
    "blockNumber": 104250,
    "blockHash": "0x9dfaeefe4f01211542363494faa981ddfc545fb483b56548380f93b81e3fd479",
    "merkleRoot": "0x9dfaeefe4f01211542363494faa981ddfc545fb483b56548380f93b81e3fd479",
    "merkleProof": [
      "0x9dfaeefe4f01211542363494faa981ddfc545fb483b56548380f93b81e3fd479"
    ],
    "timestamp": "2026-09-09 22:43:58.513799+05:30",
    "network": "Hyperledger Fabric (IEC Industrial Channel)"
  },
  {
    "transactionId": "e147371a30791ca1d0e0b48fc448f33b96972be8a420d70b824f2a5c7c874763",
    "blockNumber": 104250,
    "blockHash": "0x4951581b57471207654469aadc00bbd3871da7aa72eedcf00f41fe7fc90a594a",
    "merkleRoot": "0x4951581b57471207654469aadc00bbd3871da7aa72eedcf00f41fe7fc90a594a",
    "merkleProof": [
      "0x4951581b57471207654469aadc00bbd3871da7aa72eedcf00f41fe7fc90a594a"
    ],
    "timestamp": "2026-09-11 11:44:53.571726+05:30",
    "network": "Hyperledger Fabric (IEC Industrial Channel)"
  },
  {
    "transactionId": "33d64a5d1291da998e11379a024c45d927520d9d4f0b2dff4b0726b467c12816",
    "blockNumber": 104250,
    "blockHash": "0xc90948c3bed86a378cc94f364a92be0f805ffeef6984a3aaea85a648526fc01e",
    "merkleRoot": "0xc90948c3bed86a378cc94f364a92be0f805ffeef6984a3aaea85a648526fc01e",
    "merkleProof": [
      "0xc90948c3bed86a378cc94f364a92be0f805ffeef6984a3aaea85a648526fc01e"
    ],
    "timestamp": "2026-09-11 12:23:43.975221+05:30",
    "network": "Hyperledger Fabric (IEC Industrial Channel)"
  },
  {
    "transactionId": "156e7c3ec36ec6881badc7c870802f69e04e1d690094a14c57cdca7ca0680e42",
    "blockNumber": 104250,
    "blockHash": "0x51d4656b11b1248eb5bf6112d62b601c16c8787a4c6ce5876c36272601750ede",
    "merkleRoot": "0x51d4656b11b1248eb5bf6112d62b601c16c8787a4c6ce5876c36272601750ede",
    "merkleProof": [
      "0x51d4656b11b1248eb5bf6112d62b601c16c8787a4c6ce5876c36272601750ede"
    ],
    "timestamp": "2026-09-11 15:21:40.788475+05:30",
    "network": "Hyperledger Fabric (IEC Industrial Channel)"
  },
  {
    "transactionId": "d53150bb339736f127abfcb616d353025777648f1490007a0736edd272040323",
    "blockNumber": 104250,
    "blockHash": "0xb534ba80525ee4745303863fd748168401ce346fc4a5d89d51b16338661904b0",
    "merkleRoot": "0xb534ba80525ee4745303863fd748168401ce346fc4a5d89d51b16338661904b0",
    "merkleProof": [
      "0xb534ba80525ee4745303863fd748168401ce346fc4a5d89d51b16338661904b0"
    ],
    "timestamp": "2026-09-11 15:46:27.068086+05:30",
    "network": "Hyperledger Fabric (IEC Industrial Channel)"
  },
  {
    "transactionId": "5b43d6b720986dd661f55a10b8ac2f43c9e12dfe08d6497eac8a6d44dd06b41d",
    "blockNumber": 104250,
    "blockHash": "0xdc228477073b7defb2df029df4a335887ddedbc354151dc5f9c9eb262968ab3e",
    "merkleRoot": "0xdc228477073b7defb2df029df4a335887ddedbc354151dc5f9c9eb262968ab3e",
    "merkleProof": [
      "0xdc228477073b7defb2df029df4a335887ddedbc354151dc5f9c9eb262968ab3e"
    ],
    "timestamp": "2026-09-11 17:37:45.796914+05:30",
    "network": "Hyperledger Fabric (IEC Industrial Channel)"
  },
  {
    "transactionId": "2cbe2136a26d392906d8cf341a1524833b31d1b5e78cab3c47ea7803a241c84c",
    "blockNumber": 104250,
    "blockHash": "0xab44368a65475a072219f06e5ee0869ddb4deb912e99951e6c2999d8d3e8bf18",
    "merkleRoot": "0xab44368a65475a072219f06e5ee0869ddb4deb912e99951e6c2999d8d3e8bf18",
    "merkleProof": [
      "0xab44368a65475a072219f06e5ee0869ddb4deb912e99951e6c2999d8d3e8bf18"
    ],
    "timestamp": "2026-09-11 17:38:05.910051+05:30",
    "network": "Hyperledger Fabric (IEC Industrial Channel)"
  },
  {
    "transactionId": "031b954d971af80dce23bbf5214bda516ff831a9375e6d8cba1cd6aa10b3f77a",
    "blockNumber": 104250,
    "blockHash": "0x5a3d85db9019a315097c202428f253264a7ea1bf71d7a079e5f61b8e60b5ce16",
    "merkleRoot": "0x5a3d85db9019a315097c202428f253264a7ea1bf71d7a079e5f61b8e60b5ce16",
    "merkleProof": [
      "0x5a3d85db9019a315097c202428f253264a7ea1bf71d7a079e5f61b8e60b5ce16"
    ],
    "timestamp": "2026-09-11 19:12:22.258914+05:30",
    "network": "Hyperledger Fabric (IEC Industrial Channel)"
  }
];

export const SEEDED_AUDIT_LOGS = [
  {
    "id": "65301c9c-d63d-4067-bab0-c20c38d8deda",
    "userId": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "action": "Created",
    "entityType": "Asset",
    "entityId": "8f649350-fce0-4301-9a6d-e53f1b52b7c4",
    "details": {
      "assetTag": "ASSET-6532",
      "name": "Industrial Turbine Alpha",
      "category": "Machinery",
      "status": "Active",
      "assignedTo": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 13:04:15.149905+05:30"
  },
  {
    "id": "38f38fb1-2b6e-4611-b4df-758e78bd97b0",
    "userId": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "action": "Created",
    "entityType": "Asset",
    "entityId": "e2552401-83bf-4aa8-993d-4d7da29d2ac6",
    "details": {
      "assetTag": "HVAC-8092",
      "name": "Main Campus HVAC Unit 1",
      "category": "Facility",
      "status": "Active",
      "assignedTo": "77aa54d5-6839-4fbf-84bc-19d511e82aaa"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 20:31:43.235354+05:30"
  },
  {
    "id": "e460228b-54e7-4371-8408-099f95eb482c",
    "userId": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "action": "Created",
    "entityType": "Asset",
    "entityId": "751bf6ee-443e-4b3c-a1d7-41dfb8e315dc",
    "details": {
      "assetTag": "CONV-5510",
      "name": "Assembly Line Conveyor Belt",
      "category": "Machinery",
      "status": "Active",
      "assignedTo": "77aa54d5-6839-4fbf-84bc-19d511e82aaa"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 20:31:43.238675+05:30"
  },
  {
    "id": "c82bd658-7c25-427d-965b-0e30d672f819",
    "userId": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "action": "Created",
    "entityType": "Asset",
    "entityId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
    "details": {
      "assetTag": "SENS-9941",
      "name": "Vibration Analysis Sensor",
      "category": "Instrument",
      "status": "Active",
      "assignedTo": "77aa54d5-6839-4fbf-84bc-19d511e82aaa"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 20:31:43.24041+05:30"
  },
  {
    "id": "09672ad7-d494-499d-99fa-acc2da2fc634",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "798ead85-7101-4051-b6f1-a14c0c8c87b1",
    "details": {
      "evidenceId": "798ead85-7101-4051-b6f1-a14c0c8c87b1",
      "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
      "activityType": "Quality",
      "timestamp": "0001-01-01T00:00:00Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 20:33:00.497231+05:30"
  },
  {
    "id": "f8d3049e-b28d-40cf-b9cf-896d44e90d23",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "113cccf2-439b-4d3a-8889-0d34f74a04e8",
    "details": {
      "evidenceId": "113cccf2-439b-4d3a-8889-0d34f74a04e8",
      "assetId": "751bf6ee-443e-4b3c-a1d7-41dfb8e315dc",
      "activityType": "Maintenance",
      "timestamp": "0001-01-01T00:00:00Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 20:33:00.509035+05:30"
  },
  {
    "id": "ab63718c-784a-4693-8de5-3c450700ecc1",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "9ae15009-9305-4f38-935a-cdada5df8d96",
    "details": {
      "evidenceId": "9ae15009-9305-4f38-935a-cdada5df8d96",
      "assetId": "e2552401-83bf-4aa8-993d-4d7da29d2ac6",
      "activityType": "Inspection",
      "timestamp": "0001-01-01T00:00:00Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 20:33:00.511133+05:30"
  },
  {
    "id": "04c13720-5771-455e-9f0c-e22ce03fe52d",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "ffa2b924-9562-46d2-822e-d6ef1a64cb30",
    "details": {
      "evidenceId": "ffa2b924-9562-46d2-822e-d6ef1a64cb30",
      "assetId": "e2552401-83bf-4aa8-993d-4d7da29d2ac6",
      "activityType": "Maintenance",
      "timestamp": "0001-01-01T00:00:00Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 20:33:00.513138+05:30"
  },
  {
    "id": "62c2b80d-2a10-4b85-bdfe-b10044acdf00",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "c56c4859-5f5a-465e-bf39-963418f19de1",
    "details": {
      "evidenceId": "c56c4859-5f5a-465e-bf39-963418f19de1",
      "assetId": "8f649350-fce0-4301-9a6d-e53f1b52b7c4",
      "activityType": "Inspection",
      "timestamp": "0001-01-01T00:00:00Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 20:33:00.515082+05:30"
  },
  {
    "id": "51950855-4a9f-41b0-9ac9-776abffdad28",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "b0668bc4-239d-4f3e-9444-4fa2eb5ff4ec",
    "details": {
      "evidenceId": "b0668bc4-239d-4f3e-9444-4fa2eb5ff4ec",
      "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
      "activityType": "Maintenance",
      "timestamp": "2026-09-09T17:04:09.553Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 22:34:22.728345+05:30"
  },
  {
    "id": "8b2ccec2-8222-4790-9655-4eba2ba13a88",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "MediaAttached",
    "entityType": "EvidenceMedia",
    "entityId": "0cfbd54f-6241-44d6-8fb0-ed239c79a133",
    "details": {
      "mediaId": "0cfbd54f-6241-44d6-8fb0-ed239c79a133",
      "evidenceId": "b0668bc4-239d-4f3e-9444-4fa2eb5ff4ec",
      "fileName": "photo_1788973457916.jpg",
      "fileType": "Image",
      "storageUrl": "/uploads/2026/09/eac79841d2a946c9ac6b8e00e81aeac1_photo_1788973457916.jpg",
      "fileHash": "c1349c4646cf62da1cc6de49a0e1e36a1d3050afd8429c055534170c0fb050d6"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 22:34:22.792327+05:30"
  },
  {
    "id": "f6595b9c-80d3-4d82-979e-bc932bf9de82",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceSubmitted",
    "entityType": "EvidenceRecord",
    "entityId": "b0668bc4-239d-4f3e-9444-4fa2eb5ff4ec",
    "details": {
      "evidenceId": "b0668bc4-239d-4f3e-9444-4fa2eb5ff4ec",
      "evidenceHash": "9c3ea66fc8658886b891434d6db46a1a2e7d4ade0f570009b12568302aa9b799",
      "anchorStatus": "Anchored",
      "transactionId": "aac9a7f16c60e37f53fe529012e478f88241cf16f8754533907cc6d9d392231d",
      "error": null
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 22:34:22.871426+05:30"
  },
  {
    "id": "91e843f6-fe1d-4b93-a7c5-fd8ad2cc6250",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "beb587a2-62c9-411d-a37b-5514d7c16405",
    "details": {
      "evidenceId": "beb587a2-62c9-411d-a37b-5514d7c16405",
      "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
      "activityType": "Maintenance",
      "timestamp": "2026-09-09T17:07:29.788Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 22:37:42.900976+05:30"
  },
  {
    "id": "54d93c45-e6d9-442f-a15e-086c4cf60e3b",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "MediaAttached",
    "entityType": "EvidenceMedia",
    "entityId": "c2a0f80f-cc1b-495d-8270-b26a2533c5cf",
    "details": {
      "mediaId": "c2a0f80f-cc1b-495d-8270-b26a2533c5cf",
      "evidenceId": "beb587a2-62c9-411d-a37b-5514d7c16405",
      "fileName": "photo_1788973658290.jpg",
      "fileType": "Image",
      "storageUrl": "/uploads/2026/09/c9a17005d2554ccd8bfa3297f3b97e43_photo_1788973658290.jpg",
      "fileHash": "9b39957979a75390d280ff46d16f111d042a4beae89ef69e9828cf46faa381e7"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 22:37:42.910898+05:30"
  },
  {
    "id": "ae5e6133-5c62-442d-bfcc-e24bfdf87bec",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceSubmitted",
    "entityType": "EvidenceRecord",
    "entityId": "beb587a2-62c9-411d-a37b-5514d7c16405",
    "details": {
      "evidenceId": "beb587a2-62c9-411d-a37b-5514d7c16405",
      "evidenceHash": "53dd21f505ce734bdd04bbeb76bc4cb2977ea1a5b7ceaee4d36f1b909118bb78",
      "anchorStatus": "Anchored",
      "transactionId": "364d25e45dce38c047579114cd21f9534f9c85e9789631117e12c782314ea36a",
      "error": null
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 22:37:42.915997+05:30"
  },
  {
    "id": "d22dec36-d338-4c4b-b5f6-357f76563817",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "06bcbe68-b960-4385-9a27-a76d0fcfc7fc",
    "details": {
      "evidenceId": "06bcbe68-b960-4385-9a27-a76d0fcfc7fc",
      "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
      "activityType": "Maintenance",
      "timestamp": "2026-09-09T17:13:45.607Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 22:43:58.501031+05:30"
  },
  {
    "id": "4d13ba1e-0ddd-4c74-a027-87dac47b2314",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "MediaAttached",
    "entityType": "EvidenceMedia",
    "entityId": "366d1d53-28f2-4135-8d2b-e03d6748e0fe",
    "details": {
      "mediaId": "366d1d53-28f2-4135-8d2b-e03d6748e0fe",
      "evidenceId": "06bcbe68-b960-4385-9a27-a76d0fcfc7fc",
      "fileName": "photo_1788974033886.jpg",
      "fileType": "Image",
      "storageUrl": "/uploads/2026/09/36eabc954e7a4603935d7842c00144bb_photo_1788974033886.jpg",
      "fileHash": "47910cd99ece9658191e3d42d6d12a8d7eaea0a13b13e0d57778ee58819a76da"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 22:43:58.507718+05:30"
  },
  {
    "id": "f304c14d-c482-47af-94af-d073105c0e6c",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceSubmitted",
    "entityType": "EvidenceRecord",
    "entityId": "06bcbe68-b960-4385-9a27-a76d0fcfc7fc",
    "details": {
      "evidenceId": "06bcbe68-b960-4385-9a27-a76d0fcfc7fc",
      "evidenceHash": "9dfaeefe4f01211542363494faa981ddfc545fb483b56548380f93b81e3fd479",
      "anchorStatus": "Anchored",
      "transactionId": "1c30c52f30b4da571ca8ed40467a8aa6059aac7acc9dac85777e9164d7a03b11",
      "error": null
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 22:43:58.516513+05:30"
  },
  {
    "id": "f1b768a3-a076-4688-a983-f662c0ae9098",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "USER_PROFILE_UPDATED",
    "entityType": "User",
    "entityId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "details": {
      "raw": "Profile updated: FullName='Babu Electrician', Email='tech@iec.app'"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 23:50:53.134038+05:30"
  },
  {
    "id": "c4445330-a572-4c3d-bec6-930baeae5a07",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "USER_PROFILE_UPDATED",
    "entityType": "User",
    "entityId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "details": {
      "raw": "Profile updated: FullName='John Smith', Email='tech@iec.app'"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 23:51:17.485119+05:30"
  },
  {
    "id": "c6246f3e-2545-4caf-bc79-4b6066af8e2c",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "USER_PROFILE_UPDATED",
    "entityType": "User",
    "entityId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "details": {
      "raw": "Profile updated: FullName='Bablu Electrician', Email='tech@iec.app'"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 23:51:24.086615+05:30"
  },
  {
    "id": "bc3fa403-fdc3-4a3e-9020-ab8a7e636533",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "USER_PROFILE_UPDATED",
    "entityType": "User",
    "entityId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "details": {
      "raw": "Profile updated: FullName='Babu Electrician', Email='tech@iec.app'"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 23:52:34.622132+05:30"
  },
  {
    "id": "6d96b279-70f8-4449-881c-e962bce0e933",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "USER_PROFILE_UPDATED",
    "entityType": "User",
    "entityId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "details": {
      "raw": "Profile updated: FullName='John Smith', Email='tech@iec.app'"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 23:52:34.740141+05:30"
  },
  {
    "id": "3074ad37-5337-4762-a8c0-ffc09146347d",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "USER_PROFILE_UPDATED",
    "entityType": "User",
    "entityId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "details": {
      "raw": "Profile updated: FullName='Bablu Electrician', Email='bablu@iec.app'"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-09 23:57:24.351476+05:30"
  },
  {
    "id": "261d443d-118a-4489-afc5-f5f30f16608c",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "58f2d98a-a3b1-4242-8a0a-903d633e2f64",
    "details": {
      "evidenceId": "58f2d98a-a3b1-4242-8a0a-903d633e2f64",
      "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
      "activityType": "Maintenance",
      "timestamp": "2026-09-11T06:14:00.638Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 11:44:53.491795+05:30"
  },
  {
    "id": "a784117a-9487-4355-8535-0aebdf94f033",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "MediaAttached",
    "entityType": "EvidenceMedia",
    "entityId": "81b2fe0c-0ee1-4f14-a203-bf4cd0c4d4c7",
    "details": {
      "mediaId": "81b2fe0c-0ee1-4f14-a203-bf4cd0c4d4c7",
      "evidenceId": "58f2d98a-a3b1-4242-8a0a-903d633e2f64",
      "fileName": "photo_1789107272615.jpg",
      "fileType": "Image",
      "storageUrl": "/uploads/2026/09/237661b1ee264b32a6647b459f53c9fd_photo_1789107272615.jpg",
      "fileHash": "86f8db2c0866a0933cfed404ad242817fba57c1083765b41dd4b6494da8873b6"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 11:44:53.540109+05:30"
  },
  {
    "id": "b820a850-f612-4db2-9bbb-8f37a888e0e7",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceSubmitted",
    "entityType": "EvidenceRecord",
    "entityId": "58f2d98a-a3b1-4242-8a0a-903d633e2f64",
    "details": {
      "evidenceId": "58f2d98a-a3b1-4242-8a0a-903d633e2f64",
      "evidenceHash": "4951581b57471207654469aadc00bbd3871da7aa72eedcf00f41fe7fc90a594a",
      "anchorStatus": "Anchored",
      "transactionId": "e147371a30791ca1d0e0b48fc448f33b96972be8a420d70b824f2a5c7c874763",
      "error": null
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 11:44:53.580979+05:30"
  },
  {
    "id": "95b97c68-3fc9-468f-bf0e-a133e8bd2cfe",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "7147b02e-a680-4727-ac89-0efd1f2f94a3",
    "details": {
      "evidenceId": "7147b02e-a680-4727-ac89-0efd1f2f94a3",
      "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
      "activityType": "Maintenance",
      "timestamp": "2026-09-11T06:52:28.918Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 12:23:43.892239+05:30"
  },
  {
    "id": "ba1187c8-7ece-4515-8632-12e04e45db8c",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "MediaAttached",
    "entityType": "EvidenceMedia",
    "entityId": "e2391af9-da90-4a5a-9a96-c2abbbd81ddf",
    "details": {
      "mediaId": "e2391af9-da90-4a5a-9a96-c2abbbd81ddf",
      "evidenceId": "7147b02e-a680-4727-ac89-0efd1f2f94a3",
      "fileName": "photo_1789109604269.jpg",
      "fileType": "Image",
      "storageUrl": "/uploads/2026/09/00894e8ee5f2454fb802952437d8ea63_photo_1789109604269.jpg",
      "fileHash": "f6a288d5737d357564c1e8a28620f7d8a3810a4630def2caf9a1ebf91ded1548"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 12:23:43.943531+05:30"
  },
  {
    "id": "b0c34b53-1d63-4cba-a3c4-6597d99e6b42",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceSubmitted",
    "entityType": "EvidenceRecord",
    "entityId": "7147b02e-a680-4727-ac89-0efd1f2f94a3",
    "details": {
      "evidenceId": "7147b02e-a680-4727-ac89-0efd1f2f94a3",
      "evidenceHash": "c90948c3bed86a378cc94f364a92be0f805ffeef6984a3aaea85a648526fc01e",
      "anchorStatus": "Anchored",
      "transactionId": "33d64a5d1291da998e11379a024c45d927520d9d4f0b2dff4b0726b467c12816",
      "error": null
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 12:23:43.986584+05:30"
  },
  {
    "id": "86b2c5aa-c53f-4c90-8ad9-96e259d290fa",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "c299ec6e-63c4-4263-9f2b-350b99bfefed",
    "details": {
      "evidenceId": "c299ec6e-63c4-4263-9f2b-350b99bfefed",
      "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
      "activityType": "Inspection",
      "timestamp": "2026-09-11T10:00:00Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 15:21:33.777897+05:30"
  },
  {
    "id": "d9d54538-f1c6-4a37-98a7-95fc396aab71",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "dda1768c-3882-4ecb-aceb-7fefe5dd51b1",
    "details": {
      "evidenceId": "dda1768c-3882-4ecb-aceb-7fefe5dd51b1",
      "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
      "activityType": "Inspection",
      "timestamp": "2026-09-11T10:00:00Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 15:21:37.55243+05:30"
  },
  {
    "id": "82026dc0-98fe-472d-9f98-4b087b39be10",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceSubmitted",
    "entityType": "EvidenceRecord",
    "entityId": "dda1768c-3882-4ecb-aceb-7fefe5dd51b1",
    "details": {
      "evidenceId": "dda1768c-3882-4ecb-aceb-7fefe5dd51b1",
      "evidenceHash": "51d4656b11b1248eb5bf6112d62b601c16c8787a4c6ce5876c36272601750ede",
      "anchorStatus": "Anchored",
      "transactionId": "156e7c3ec36ec6881badc7c870802f69e04e1d690094a14c57cdca7ca0680e42",
      "error": null
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 15:21:40.790794+05:30"
  },
  {
    "id": "c9aaab55-43ba-42c4-b159-4e12df307113",
    "userId": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "action": "USER_PROFILE_UPDATED",
    "entityType": "User",
    "entityId": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "details": {
      "raw": "Profile updated: FullName='Admin User', Email='admin@iec.app'"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 15:21:55.71904+05:30"
  },
  {
    "id": "57ad6e08-b5f4-4cdf-a159-de913edf017f",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "60e39cad-5ab8-4a7d-ba51-ddb30a60e6a0",
    "details": {
      "evidenceId": "60e39cad-5ab8-4a7d-ba51-ddb30a60e6a0",
      "assetId": "e2552401-83bf-4aa8-993d-4d7da29d2ac6",
      "activityType": "Maintenance",
      "timestamp": "2026-09-11T10:15:31.815Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 15:46:27.047527+05:30"
  },
  {
    "id": "116892b7-0ca0-48d3-a5c2-14c546272fc2",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "MediaAttached",
    "entityType": "EvidenceMedia",
    "entityId": "dda6c81f-45ba-48a2-aa66-af25737c6ef9",
    "details": {
      "mediaId": "dda6c81f-45ba-48a2-aa66-af25737c6ef9",
      "evidenceId": "60e39cad-5ab8-4a7d-ba51-ddb30a60e6a0",
      "fileName": "photo_1789121760878.jpg",
      "fileType": "Image",
      "storageUrl": "/uploads/2026/09/be595766af7f452792602c2713f44638_photo_1789121760878.jpg",
      "fileHash": "cff6f526a2183633abd740f440093900bd824275b0d9cb47bd899969deaf6799"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 15:46:27.061829+05:30"
  },
  {
    "id": "71b3d094-b1c4-4ac1-9580-f3c7ccd0e747",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceSubmitted",
    "entityType": "EvidenceRecord",
    "entityId": "60e39cad-5ab8-4a7d-ba51-ddb30a60e6a0",
    "details": {
      "evidenceId": "60e39cad-5ab8-4a7d-ba51-ddb30a60e6a0",
      "evidenceHash": "b534ba80525ee4745303863fd748168401ce346fc4a5d89d51b16338661904b0",
      "anchorStatus": "Anchored",
      "transactionId": "d53150bb339736f127abfcb616d353025777648f1490007a0736edd272040323",
      "error": null
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 15:46:27.070909+05:30"
  },
  {
    "id": "d58e16d6-8fac-47b5-ae2c-3533ebd6f51f",
    "userId": "09593e09-0f60-42b0-9050-e98b1bca2446",
    "action": "EvidenceVerified",
    "entityType": "EvidenceRecord",
    "entityId": "60e39cad-5ab8-4a7d-ba51-ddb30a60e6a0",
    "details": {
      "status": "VERIFIED",
      "isValid": true,
      "calculatedHash": "b534ba80525ee4745303863fd748168401ce346fc4a5d89d51b16338661904b0",
      "trustedHash": "b534ba80525ee4745303863fd748168401ce346fc4a5d89d51b16338661904b0",
      "transactionId": "d53150bb339736f127abfcb616d353025777648f1490007a0736edd272040323",
      "verifiedAt": "2026-09-11T10:48:23.160833Z"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 16:18:23.163526+05:30"
  },
  {
    "id": "9eb775ee-cdda-4f1c-aeb7-6d85eb49d5e4",
    "userId": "09593e09-0f60-42b0-9050-e98b1bca2446",
    "action": "EvidenceVerified",
    "entityType": "EvidenceRecord",
    "entityId": "dda1768c-3882-4ecb-aceb-7fefe5dd51b1",
    "details": {
      "status": "VERIFIED",
      "isValid": true,
      "calculatedHash": "51d4656b11b1248eb5bf6112d62b601c16c8787a4c6ce5876c36272601750ede",
      "trustedHash": "51d4656b11b1248eb5bf6112d62b601c16c8787a4c6ce5876c36272601750ede",
      "transactionId": "156e7c3ec36ec6881badc7c870802f69e04e1d690094a14c57cdca7ca0680e42",
      "verifiedAt": "2026-09-11T10:58:54.935165Z"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 16:28:54.93794+05:30"
  },
  {
    "id": "8e842d7b-868d-4420-8c7e-1707068b0591",
    "userId": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "action": "EvidenceVerified",
    "entityType": "EvidenceRecord",
    "entityId": "58f2d98a-a3b1-4242-8a0a-903d633e2f64",
    "details": {
      "status": "VERIFIED",
      "isValid": true,
      "calculatedHash": "4951581b57471207654469aadc00bbd3871da7aa72eedcf00f41fe7fc90a594a",
      "trustedHash": "4951581b57471207654469aadc00bbd3871da7aa72eedcf00f41fe7fc90a594a",
      "transactionId": "e147371a30791ca1d0e0b48fc448f33b96972be8a420d70b824f2a5c7c874763",
      "verifiedAt": "2026-09-11T11:56:10.566402Z"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 17:26:10.566452+05:30"
  },
  {
    "id": "d8aef908-122d-4be4-8d51-e97db06bf2c9",
    "userId": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "action": "EvidenceVerified",
    "entityType": "EvidenceRecord",
    "entityId": "06bcbe68-b960-4385-9a27-a76d0fcfc7fc",
    "details": {
      "status": "VERIFIED",
      "isValid": true,
      "calculatedHash": "9dfaeefe4f01211542363494faa981ddfc545fb483b56548380f93b81e3fd479",
      "trustedHash": "9dfaeefe4f01211542363494faa981ddfc545fb483b56548380f93b81e3fd479",
      "transactionId": "1c30c52f30b4da571ca8ed40467a8aa6059aac7acc9dac85777e9164d7a03b11",
      "verifiedAt": "2026-09-11T11:56:12.263975Z"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 17:26:12.263997+05:30"
  },
  {
    "id": "08d85648-3f4a-49ed-a675-eee3ebbbda4f",
    "userId": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "action": "EvidenceVerified",
    "entityType": "EvidenceRecord",
    "entityId": "beb587a2-62c9-411d-a37b-5514d7c16405",
    "details": {
      "status": "VERIFIED",
      "isValid": true,
      "calculatedHash": "53dd21f505ce734bdd04bbeb76bc4cb2977ea1a5b7ceaee4d36f1b909118bb78",
      "trustedHash": "53dd21f505ce734bdd04bbeb76bc4cb2977ea1a5b7ceaee4d36f1b909118bb78",
      "transactionId": "364d25e45dce38c047579114cd21f9534f9c85e9789631117e12c782314ea36a",
      "verifiedAt": "2026-09-11T11:56:13.183734Z"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 17:26:13.183755+05:30"
  },
  {
    "id": "17807a6f-2ec2-4c5c-8712-bd2d40a569d5",
    "userId": "30ed513f-8fc1-4ca1-aa3c-6d8675642f80",
    "action": "Updated",
    "entityType": "Asset",
    "entityId": "751bf6ee-443e-4b3c-a1d7-41dfb8e315dc",
    "details": {
      "previousStatus": "Active",
      "newStatus": "Active",
      "updatedAt": "2026-09-11T11:57:48.936126Z"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 17:27:48.942364+05:30"
  },
  {
    "id": "405f8eaa-de69-464d-9442-9cbda05eb361",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "71592a11-717d-4144-a9ad-b2c0cab630db",
    "details": {
      "evidenceId": "71592a11-717d-4144-a9ad-b2c0cab630db",
      "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
      "activityType": "Maintenance",
      "timestamp": "2026-09-11T12:07:45Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 17:37:45.611202+05:30"
  },
  {
    "id": "0e0e489f-b5cd-4e27-b684-5b73e9869b11",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "MediaAttached",
    "entityType": "EvidenceMedia",
    "entityId": "dcbae4fb-892a-4036-a763-8aad345b272b",
    "details": {
      "mediaId": "dcbae4fb-892a-4036-a763-8aad345b272b",
      "evidenceId": "71592a11-717d-4144-a9ad-b2c0cab630db",
      "fileName": "camera_capture.jpg",
      "fileType": "Image",
      "storageUrl": "/uploads/2026/09/339311db763e437bb65010f4087cdf62_camera_capture.jpg",
      "fileHash": "84281f942ec7f5cf5f42f235066c3221dd9861c6a9e871754a542d5c63a716c8"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 17:37:45.685246+05:30"
  },
  {
    "id": "e580952f-3fc5-4f29-b8f7-7c6753eea76a",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "MediaAttached",
    "entityType": "EvidenceMedia",
    "entityId": "dc8252e9-4fd1-4ac9-8ee6-ba1cb39b3f8c",
    "details": {
      "mediaId": "dc8252e9-4fd1-4ac9-8ee6-ba1cb39b3f8c",
      "evidenceId": "71592a11-717d-4144-a9ad-b2c0cab630db",
      "fileName": "video_capture.webm",
      "fileType": "Video",
      "storageUrl": "/uploads/2026/09/e132b0fbb8d84ef68efaee51389c79d6_video_capture.webm",
      "fileHash": "870ec975d9042f23686ef15acee58d9929cdd1af88abeb64bbe92ad84db74bb2"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 17:37:45.713826+05:30"
  },
  {
    "id": "ef2b5be8-1717-4420-a2c2-18c0dac6cf4d",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceSubmitted",
    "entityType": "EvidenceRecord",
    "entityId": "71592a11-717d-4144-a9ad-b2c0cab630db",
    "details": {
      "evidenceId": "71592a11-717d-4144-a9ad-b2c0cab630db",
      "evidenceHash": "dc228477073b7defb2df029df4a335887ddedbc354151dc5f9c9eb262968ab3e",
      "anchorStatus": "Anchored",
      "transactionId": "5b43d6b720986dd661f55a10b8ac2f43c9e12dfe08d6497eac8a6d44dd06b41d",
      "error": null
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 17:37:45.80795+05:30"
  },
  {
    "id": "4dfed381-7932-4b95-9aa1-3ea28e533fd3",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "EvidenceCreated",
    "entityType": "EvidenceRecord",
    "entityId": "a3c0aabe-a872-4472-8faf-c8c8e7787971",
    "details": {
      "evidenceId": "a3c0aabe-a872-4472-8faf-c8c8e7787971",
      "assetId": "2a627e6f-6be4-420c-a316-6dd6dac66cfa",
      "activityType": "Maintenance",
      "timestamp": "2026-09-11T12:08:05Z",
      "status": "Pending"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 17:38:05.66935+05:30"
  },
  {
    "id": "34ccbf05-7d6c-453c-9138-cd18ce4a4e26",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "MediaAttached",
    "entityType": "EvidenceMedia",
    "entityId": "467f169b-37fb-424e-a048-90a2da4d9b64",
    "details": {
      "mediaId": "467f169b-37fb-424e-a048-90a2da4d9b64",
      "evidenceId": "a3c0aabe-a872-4472-8faf-c8c8e7787971",
      "fileName": "camera_capture.jpg",
      "fileType": "Image",
      "storageUrl": "/uploads/images/e23b863b6e4e46198c125b9701d63832_camera_capture.jpg",
      "fileHash": "4ba4cdc4cdc325c837cf750b07466730b39dc5e33c4a83164735dc3f5ad52bfc"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 17:38:05.765196+05:30"
  },
  {
    "id": "09922672-7847-4dd6-8618-c3a78f7f5dc6",
    "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
    "action": "MediaAttached",
    "entityType": "EvidenceMedia",
    "entityId": "54de15c8-778a-4c09-b0b1-acb0284eab10",
    "details": {
      "mediaId": "54de15c8-778a-4c09-b0b1-acb0284eab10",
      "evidenceId": "a3c0aabe-a872-4472-8faf-c8c8e7787971",
      "fileName": "video_capture.webm",
      "fileType": "Video",
      "storageUrl": "/uploads/videos/a5785ff589ac41f6a0d7622b93c8f0b2_video_capture.webm",
      "fileHash": "6e2bd46a42dd2d77a707ff38c55b385f7e2ddf7e1d53418adce9f4801dfdace8"
    },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-11 17:38:05.798851+05:30"
  }
];

export const SEEDED_NOTIFICATIONS: Notification[] = [
  {
    id: 'NOT-INIT-001',
    recipientId: 'all',
    senderId: 'system',
    senderName: 'IEC Ledger Engine',
    title: 'Cloud Node Online',
    message: 'Vercel Deployment connected to Firebase Firestore and Hyperledger Fabric anchor stream.',
    type: 'success',
    read: false,
    createdAt: '2026-09-11T13:42:00.000Z',
  },
  {
    id: 'NOT-INIT-002',
    recipientId: '30ed513f-8fc1-4ca1-aa3c-6d8675642f80',
    senderId: 'system',
    senderName: 'Security Monitor',
    title: 'Authoritative Data Synchronized',
    message: '16 evidence records and 4 critical assets synchronized from authoritative SQL backup.',
    type: 'info',
    read: false,
    createdAt: '2026-09-11T13:42:00.000Z',
  }
];
