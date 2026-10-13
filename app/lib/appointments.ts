export const visitTypes = [
  { value: 'routine', label: 'Routine and preventive care', duration: 30 },
  { value: 'acute', label: 'Acute illness or infection', duration: 20 },
  { value: 'chronic', label: 'Chronic condition management', duration: 40 },
  { value: 'symptoms', label: 'New or concerning symptoms', duration: 45 },
  { value: 'mental_health', label: 'Mental health or administrative', duration: 15 },
] as const;

export const appointmentStatuses = [
  'scheduled',
  'confirmed',
  'checked_in',
  'completed',
  'no_show',
  'cancelled',
] as const;

export type AppointmentStatus = (typeof appointmentStatuses)[number];

export const weekdays = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;