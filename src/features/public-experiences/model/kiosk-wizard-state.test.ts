import { describe, expect, it } from 'vitest';
import { initialKioskWizardState, kioskWizardReducer } from './kiosk-wizard-state';

describe('kioskWizardReducer', () => {
  it('parcourt les quatre étapes du parcours sans rendez-vous', () => {
    let state = kioskWizardReducer(initialKioskWizardState, { type: 'START_WALKIN' });

    expect(state).toEqual({ flow: 'walkin', walkinStep: 1 });
    state = kioskWizardReducer(state, { type: 'NEXT' });
    expect(state.walkinStep).toBe(2);
    state = kioskWizardReducer(state, { type: 'NEXT' });
    expect(state.walkinStep).toBe(3);
    state = kioskWizardReducer(state, { type: 'NEXT' });
    expect(state.walkinStep).toBe(4);
    expect(kioskWizardReducer(state, { type: 'NEXT' })).toBe(state);
  });

  it('revient étape par étape puis à l’accueil', () => {
    const stepThree = { flow: 'walkin', walkinStep: 3 } as const;

    const stepTwo = kioskWizardReducer(stepThree, { type: 'BACK' });
    expect(stepTwo).toEqual({ flow: 'walkin', walkinStep: 2 });
    const stepOne = kioskWizardReducer(stepTwo, { type: 'BACK' });
    expect(stepOne).toEqual({ flow: 'walkin', walkinStep: 1 });
    expect(kioskWizardReducer(stepOne, { type: 'BACK' })).toEqual(initialKioskWizardState);
  });

  it('gère le rendez-vous, le résultat et la remise à zéro', () => {
    const appointment = kioskWizardReducer(initialKioskWizardState, {
      type: 'START_APPOINTMENT',
    });
    expect(appointment.flow).toBe('appointment');

    const result = kioskWizardReducer(appointment, { type: 'SHOW_RESULT' });
    expect(result.flow).toBe('result');
    expect(kioskWizardReducer(result, { type: 'RESET' })).toEqual(initialKioskWizardState);
  });

  it('réinitialise aussi un parcours incomplet pour annulation ou watchdog', () => {
    const inProgress = { flow: 'walkin', walkinStep: 4 } as const;
    expect(kioskWizardReducer(inProgress, { type: 'RESET' })).toEqual(initialKioskWizardState);
  });
});
