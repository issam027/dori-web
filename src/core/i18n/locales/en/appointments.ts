import type { DomainTranslations } from '../../types';

export const appointments: DomainTranslations<typeof import('../fr/appointments').appointments> = {
  'appointments.appointmentActionDialog.actionImpossible': 'Action could not be completed.',
  'appointments.appointmentActionDialog.annulerCeRendezVous': 'Cancel this appointment?',
  'appointments.appointmentActionDialog.annulerLeRendezVous': 'Cancel appointment',
  'appointments.appointmentActionDialog.checkIn': 'Check-in',
  'appointments.appointmentActionDialog.creneauIndisponibleDisponibilitesActualis':
    'Time slot unavailable, availability refreshed.',
  'appointments.appointmentActionDialog.enregistrerLesModifications': 'Save changes',
  'appointments.appointmentActionDialog.reprogrammer': 'Reschedule',
  'appointments.appointmentEditor.ceCreneauVientDEtreReserveLesDisponib':
    'This time slot was just booked. Availability has been refreshed.',
  'appointments.appointmentEditor.choisissezLaFileLeNiveauDeServiceEtUneD':
    'Choose the queue, service level and a time slot.',
  'appointments.appointmentEditor.creationImpossible': 'Unable to create appointment.',
  'appointments.appointmentEditor.creerLeRendezVous': 'Create appointment',
  'appointments.appointmentEditor.creneau': 'Time slot',
  'appointments.appointmentEditor.ficheExistante': 'Existing record',
  'appointments.appointmentEditor.nouveauRendezVous': 'New appointment',
  'appointments.appointmentEditor.personne': '← Person',
  'appointments.appointmentEditor.placeS': 'place(s)',
  'appointments.appointmentEditor.quiSouhaitezVousRecevoir': 'Who would you like to receive?',
  'appointments.editor.personSearchHint':
    'Search for an existing person or create a new profile directly.',
  'appointments.appointmentEditor.serviceEtCreneau': 'Service and time slot',
  'appointments.appointments.donneesEtDisponibilitesChargeesDepuisLApi':
    'Appointments and availability loaded from the service.',
  'appointments.appointments.leSite': 'The site',
  'appointments.appointments.mois': 'Month',
  'appointments.appointments.neGerePasLesRendezVous': 'does not manage appointments.',
  'appointments.appointments.pause': 'Break',
  'appointments.appointments.precedent': 'Previous',
  'appointments.appointments.rendezVousIndisponibles': 'Appointments unavailable',
  'appointments.appointments.semaine': 'Week',
  'appointments.title': 'Appointments',
  'appointments.appointmentEditor.stepDescription': 'Step {{step}} of 2 · {{label}}',
  'appointments.appointmentEditor.serviceAndSlot': 'Service and time slot',
  'appointments.calendar.unknownPerson': 'Reservation',
  'appointments.calendar.moreCount': '+{{count}} more',
  'appointments.calendar.collapse': 'Collapse',
  'appointments.calendar.closed': 'Closed',
  'appointments.calendar.today': 'Today',
  'appointments.calendar.currentTime': 'Current time: {{time}}',
  'appointments.availability.loading': 'Loading availability…',
  'appointments.availability.loaded': 'Availability loaded',
  'appointments.status.scheduled': 'Scheduled',
  'appointments.status.booked': 'Booked',
  'appointments.status.confirmed': 'Confirmed',
  'appointments.status.present': 'Present',
  'appointments.status.in-progress': 'In progress',
  'appointments.status.served': 'Completed',
  'appointments.status.no-show': 'No-show',
  'appointments.status.cancelled': 'Cancelled',
  'appointments.status.expired': 'Expired',
  'appointments.actions.title': 'Appointment {{ticket}}',
  'appointments.actions.description': 'Review the appointment and choose the appropriate action.',
  'appointments.actions.cancelStepDescription':
    'Step 2 of 2 · provide a reason before confirming cancellation.',
  'appointments.actions.rescheduleStepDescription':
    'Step 2 of 2 · choose a new date and an available time.',
  'appointments.actions.person': 'Person',
  'appointments.actions.noContact': 'No contact details provided',
  'appointments.actions.date': 'Date',
  'appointments.actions.time': 'Time',
  'appointments.actions.service': 'Service',
  'appointments.actions.ticket': 'Ticket',
  'appointments.actions.createFollowUp': 'Book another appointment',
  'appointments.actions.checkInConfirmedDescription':
    'Attendance is confirmed. Give the person the printed ticket or the tracking QR code.',
  'appointments.actions.treatmentCompleted': 'Service completed',
  'appointments.actions.treatmentCompletedAt': 'Completed on {{date}}',
  'appointments.actions.servedByOperator': 'Operator #{{id}}',
  'appointments.actions.servedBySession': 'Session #{{id}}',
  'appointments.actions.markPresent': 'Mark as present',
  'appointments.actions.presentHint':
    'Attendance can be recorded on the appointment date while its status allows it.',
  'appointments.actions.presentSuccess': 'Attendance was successfully recorded.',
  'appointments.actions.reschedule': 'Reschedule',
  'appointments.actions.rescheduleEyebrow': 'New time slot',
  'appointments.actions.chooseSlot': 'Choose a date and an available time',
  'appointments.actions.newDate': 'New date',
  'appointments.actions.noSlots': 'No time slot is available on this date.',
  'appointments.actions.remaining': '{{count}} place(s)',
  'appointments.actions.confirmReschedule': 'Confirm rescheduling',
  'appointments.actions.rescheduleSuccess': 'The appointment was successfully rescheduled.',
  'appointments.actions.cancelAppointment': 'Cancel appointment',
  'appointments.actions.cancelConfirmTitle': 'Confirm cancellation',
  'appointments.actions.cancelConfirmText':
    'The appointment for {{name}}, scheduled on {{date}} at {{time}}, will be cancelled. This action cannot be undone from this screen.',
  'appointments.actions.cancellationReason': 'Cancellation reason',
  'appointments.actions.cancellationReasonPlaceholder':
    'E.g. person unavailable, request made by phone…',
  'appointments.actions.cancellationNoteHint':
    'The reason will automatically be added to the person’s notes.',
  'appointments.actions.confirmCancellation': 'Confirm cancellation',
  'appointments.actions.cancelSuccess': 'The appointment was successfully cancelled.',
  'appointments.actions.slotConflict':
    'This time slot was just booked. Availability has been refreshed.',
  'appointments.actions.failed': 'The action could not be completed.',
  'appointments.actions.rescheduleGuidance':
    'The proposed times come from the service’s current availability.',
  'appointments.actions.rescheduleNoteHint':
    'The schedule change will automatically be added to the person’s notes.',
  'appointments.actions.noteFailedTitle': 'Appointment updated, note not saved',
  'appointments.actions.noteFailedText':
    'The appointment action succeeded, but its follow-up note could not be added.',
  'appointments.notes.cancelled':
    'Appointment {{ticket}}, scheduled on {{date}} at {{time}}, was cancelled. Reason: {{reason}}',
  'appointments.notes.rescheduled':
    'Appointment {{ticket}} was rescheduled: originally on {{oldDate}} at {{oldTime}}, moved to {{newDate}} at {{newTime}}.',
  'appointments.calendar.moreCount_one': '+{{count}} more',
  'appointments.calendar.moreCount_other': '+{{count}} more',
};
