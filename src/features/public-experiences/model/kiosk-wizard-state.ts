export type KioskFlow = 'home' | 'walkin' | 'appointment' | 'result';
export type KioskWalkinStep = 1 | 2 | 3 | 4;

export interface KioskWizardState {
  flow: KioskFlow;
  walkinStep: KioskWalkinStep;
}

export type KioskWizardAction =
  | { type: 'START_WALKIN' }
  | { type: 'START_APPOINTMENT' }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SHOW_RESULT' }
  | { type: 'RESET' };

export const initialKioskWizardState: KioskWizardState = { flow: 'home', walkinStep: 1 };

export function kioskWizardReducer(
  state: KioskWizardState,
  action: KioskWizardAction,
): KioskWizardState {
  switch (action.type) {
    case 'START_WALKIN':
      return { flow: 'walkin', walkinStep: 1 };
    case 'START_APPOINTMENT':
      return { flow: 'appointment', walkinStep: 1 };
    case 'NEXT':
      return state.flow === 'walkin' && state.walkinStep < 4
        ? { ...state, walkinStep: (state.walkinStep + 1) as KioskWalkinStep }
        : state;
    case 'BACK':
      if (state.flow !== 'walkin' || state.walkinStep === 1) return initialKioskWizardState;
      return { ...state, walkinStep: (state.walkinStep - 1) as KioskWalkinStep };
    case 'SHOW_RESULT':
      return { flow: 'result', walkinStep: state.walkinStep };
    case 'RESET':
      return initialKioskWizardState;
  }
}
