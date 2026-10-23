import type {
  CreateRegistrationDto,
  RescheduleRegistrationDto,
  UpdateRegistrationDto,
} from '@/api/generated/models';
import {
  registrationsControllerCheckIn,
  registrationsControllerRegister,
  registrationsControllerRemove,
  registrationsControllerReschedule,
  registrationsControllerUpdate,
} from '@/api/generated/registrations/registrations';

export const createAppointment = (dto: CreateRegistrationDto) =>
  registrationsControllerRegister(dto);
export const rescheduleAppointment = (id: string, dto: RescheduleRegistrationDto) =>
  registrationsControllerReschedule(id, dto);
export const cancelAppointment = (id: string) => registrationsControllerRemove(id);
export const updateAppointment = (id: string, dto: UpdateRegistrationDto) =>
  registrationsControllerUpdate(id, dto);
export const checkInAppointment = (id: string) => registrationsControllerCheckIn(id);
