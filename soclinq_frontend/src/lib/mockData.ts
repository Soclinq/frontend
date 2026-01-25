import { Report, Officer, Hotspot } from '../types';

export const mockReports: Report[] = [
  {
    id: 'RPT-001',
    type: 'kidnapping',
    title: 'Suspected Kidnapping in Progress',
    description: 'Multiple witnesses report forced abduction near shopping district',
    severity: 'critical',
    status: 'pending',
    reporterStatus: 'verified',
    location: {
      lat: 6.5244,
      lng: 3.3792,
      address: '45 Opebi Road, Ikeja, Lagos'
    },
    timestamp: new Date(Date.now() - 15 * 60000),
    evidence: [
      {
        id: 'EVD-001',
        type: 'video',
        url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0',
        timestamp: new Date(Date.now() - 20 * 60000),
        metadata: {
          deviceId: 'DEV-892734',
          gps: { lat: 6.5244, lng: 3.3792 },
          integrityHash: 'sha256:a3f5d...'
        },
        chainOfCustody: [
          { timestamp: new Date(Date.now() - 20 * 60000), action: 'Submitted', officer: 'System' },
          { timestamp: new Date(Date.now() - 18 * 60000), action: 'Validated', officer: 'Admin-01' }
        ]
      }
    ],
    nearbyDevices: [
      { id: 'DEV-001', distance: 50, phoneNumber: '+234-xxx-1234', status: 'online' },
      { id: 'DEV-002', distance: 120, status: 'offline' }
    ],
    roadMapDirection: 'https://maps.google.com/directions'
  },
  {
    id: 'RPT-002',
    type: 'shooter',
    title: 'Active Shooter Reported',
    description: 'Gunshots heard at university campus, multiple callers',
    severity: 'critical',
    status: 'assigned',
    reporterStatus: 'anonymous',
    location: {
      lat: 6.5355,
      lng: 3.3487,
      address: 'University of Lagos, Akoka'
    },
    timestamp: new Date(Date.now() - 8 * 60000),
    assignedOfficer: 'OFC-105',
    evidence: [],
    nearbyDevices: [
      { id: 'DEV-003', distance: 30, phoneNumber: '+234-xxx-5678', status: 'online' }
    ]
  },
  {
    id: 'RPT-003',
    type: 'burglary',
    title: 'Break-in at Residential Complex',
    description: 'Security alarm triggered, suspects seen fleeing',
    severity: 'high',
    status: 'investigating',
    reporterStatus: 'verified',
    location: {
      lat: 6.4281,
      lng: 3.4219,
      address: 'Lekki Phase 1, Lagos'
    },
    timestamp: new Date(Date.now() - 45 * 60000),
    assignedOfficer: 'OFC-112',
    evidence: [
      {
        id: 'EVD-002',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1590650153855-d9e808231d41',
        timestamp: new Date(Date.now() - 50 * 60000),
        metadata: {
          deviceId: 'DEV-445521',
          gps: { lat: 6.4281, lng: 3.4219 },
          integrityHash: 'sha256:b7e2c...'
        },
        chainOfCustody: [
          { timestamp: new Date(Date.now() - 50 * 60000), action: 'Submitted', officer: 'System' }
        ]
      }
    ],
    nearbyDevices: []
  },
  {
    id: 'RPT-004',
    type: 'violence',
    title: 'Assault in Public Park',
    description: 'Physical altercation between multiple individuals',
    severity: 'medium',
    status: 'resolved',
    reporterStatus: 'verified',
    location: {
      lat: 6.4698,
      lng: 3.5852,
      address: 'Freedom Park, Lagos Island'
    },
    timestamp: new Date(Date.now() - 120 * 60000),
    assignedOfficer: 'OFC-089',
    evidence: [],
    nearbyDevices: []
  },
  {
    id: 'RPT-005',
    type: 'cybercrime',
    title: 'Online Fraud Scheme Detected',
    description: 'Mass phishing campaign targeting local businesses',
    severity: 'medium',
    status: 'pending',
    reporterStatus: 'anonymous',
    location: {
      lat: 6.5244,
      lng: 3.3792,
      address: 'Online - Lagos Region'
    },
    timestamp: new Date(Date.now() - 180 * 60000),
    evidence: [],
    nearbyDevices: []
  },
  {
    id: 'RPT-006',
    type: 'fire',
    title: 'Building Fire Emergency',
    description: 'Smoke reported from commercial building, residents evacuating',
    severity: 'high',
    status: 'assigned',
    reporterStatus: 'verified',
    location: {
      lat: 6.4541,
      lng: 3.3947,
      address: 'Victoria Island, Lagos'
    },
    timestamp: new Date(Date.now() - 25 * 60000),
    assignedOfficer: 'OFC-067',
    evidence: [],
    nearbyDevices: [
      { id: 'DEV-007', distance: 80, phoneNumber: '+234-xxx-9012', status: 'online' }
    ]
  }
];

export const mockOfficers: Officer[] = [
  {
    id: 'OFC-105',
    name: 'Adebayo Johnson',
    badge: 'LG-4532',
    status: 'on-patrol',
    location: { lat: 6.5355, lng: 3.3487 }
  },
  {
    id: 'OFC-112',
    name: 'Chioma Okafor',
    badge: 'LG-4598',
    status: 'active',
    location: { lat: 6.4281, lng: 3.4219 }
  },
  {
    id: 'OFC-089',
    name: 'Ibrahim Musa',
    badge: 'LG-4421',
    status: 'active',
    location: { lat: 6.4698, lng: 3.5852 }
  },
  {
    id: 'OFC-067',
    name: 'Funmilayo Adeyemi',
    badge: 'LG-4356',
    status: 'on-patrol',
    location: { lat: 6.4541, lng: 3.3947 }
  }
];

export const mockHotspots: Hotspot[] = [
  { lat: 6.5244, lng: 3.3792, intensity: 8, category: 'burglary' },
  { lat: 6.4281, lng: 3.4219, intensity: 6, category: 'theft' },
  { lat: 6.5355, lng: 3.3487, intensity: 9, category: 'violence' },
  { lat: 6.4698, lng: 3.5852, intensity: 5, category: 'violence' },
  { lat: 6.4541, lng: 3.3947, intensity: 7, category: 'burglary' }
];
