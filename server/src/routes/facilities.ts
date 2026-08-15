import { Router } from 'express';

export const facilitiesRouter = Router();

// Static reference data — facilities don't change during a session
const FACILITIES = [
  {
    id: 'FAC-001',
    name: 'Kenyatta National Hospital',
    level: 'Level 6 — National Referral',
    location: 'Nairobi, Kenya',
    beds: 1800,
    bedsOccupied: 1620,
  },
  {
    id: 'FAC-002',
    name: 'Moi Teaching Hospital',
    level: 'Level 6 — Teaching Hospital',
    location: 'Eldoret, Kenya',
    beds: 800,
    bedsOccupied: 680,
  },
  {
    id: 'FAC-003',
    name: "Nairobi Women's Hospital",
    level: 'Level 5 — County Referral',
    location: 'Nairobi, Kenya',
    beds: 200,
    bedsOccupied: 155,
  },
  {
    id: 'FAC-004',
    name: 'Lagos University Teaching Hospital',
    level: 'Level 6 — Federal Teaching',
    location: 'Lagos, Nigeria',
    beds: 761,
    bedsOccupied: 700,
  },
  {
    id: 'FAC-005',
    name: 'Hôpital Principal de Dakar',
    level: 'Level 6 — National',
    location: 'Dakar, Sénégal',
    beds: 500,
    bedsOccupied: 420,
  },
  {
    id: 'FAC-006',
    name: 'Muhimbili National Hospital',
    level: 'Level 6 — National Referral',
    location: 'Dar es Salaam, Tanzania',
    beds: 1500,
    bedsOccupied: 1280,
  },
];

facilitiesRouter.get('/facilities', (_req, res) => {
  res.json({ facilities: FACILITIES });
});
