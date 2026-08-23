import { describe, it, expect } from 'vitest';
import { AmendPrescriptionSchema, AmendConsultationSchema } from '../../shared/validation/schemas';

describe('Clinical Validation & Safety Checks', () => {
  it('should validate prescription amendment reason length (minimum 5 characters)', () => {
    const valid = AmendPrescriptionSchema.safeParse({
      prescriptionId: '123e4567-e89b-12d3-a456-426614174000',
      reason: 'Corrected dosage from 500mg to 250mg due to patient tolerance',
      items: [],
      investigations: [],
    });
    expect(valid.success).toBe(true);

    const invalid = AmendPrescriptionSchema.safeParse({
      prescriptionId: '123e4567-e89b-12d3-a456-426614174000',
      reason: 'fix', // less than 5 chars
      items: [],
      investigations: [],
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0].message).toContain('minimum 5 characters');
    }
  });

  it('should validate consultation amendment reason length (minimum 5 characters)', () => {
    const valid = AmendConsultationSchema.safeParse({
      consultationId: '123e4567-e89b-12d3-a456-426614174000',
      reason: 'Updated differential diagnosis after lab results review',
      chiefComplaint: 'Chest pain',
      diagnosis: 'Angina Pectoris',
    });
    expect(valid.success).toBe(true);

    const invalid = AmendConsultationSchema.safeParse({
      consultationId: '123e4567-e89b-12d3-a456-426614174000',
      reason: 'edit',
      chiefComplaint: 'Chest pain',
      diagnosis: 'Angina Pectoris',
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0].message).toContain('minimum 5 characters');
    }
  });

  it('should detect matching allergen contraindications between patient allergies and prescribed items', () => {
    const patientAllergies = [
      { allergenName: 'Penicillin', allergenType: 'DRUG' },
      { allergenName: 'Aspirin', allergenType: 'DRUG' },
    ];

    const prescribedItems = [
      { medicineName: 'Amoxicillin (Penicillin class)', genericName: 'Penicillin V' },
      { medicineName: 'Paracetamol 500mg', genericName: 'Acetaminophen' },
    ];

    const matchedAllergens: string[] = [];

    for (const item of prescribedItems) {
      const medName = item.medicineName.toLowerCase();
      const genName = (item.genericName || '').toLowerCase();

      for (const allergy of patientAllergies) {
        const allergen = allergy.allergenName.toLowerCase();
        if (medName.includes(allergen) || genName.includes(allergen)) {
          matchedAllergens.push(allergy.allergenName);
        }
      }
    }

    expect(matchedAllergens).toContain('Penicillin');
    expect(matchedAllergens).not.toContain('Aspirin');
  });
});
