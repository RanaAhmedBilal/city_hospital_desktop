import { create } from 'zustand';
import { PatientDto, VisitDto } from '../../shared/types';

interface ActivePatientState {
  patient: PatientDto | null;
  visit: VisitDto | null;
  setActivePatient: (patient: PatientDto | null, visit?: VisitDto | null) => void;
  setActiveVisit: (visit: VisitDto | null) => void;
  clearActive: () => void;
}

export const useActivePatientStore = create<ActivePatientState>((set) => ({
  patient: null,
  visit: null,
  setActivePatient: (patient, visit = null) => set({ patient, visit }),
  setActiveVisit: (visit) => set((state) => ({ visit, patient: visit?.patient || state.patient })),
  clearActive: () => set({ patient: null, visit: null }),
}));
