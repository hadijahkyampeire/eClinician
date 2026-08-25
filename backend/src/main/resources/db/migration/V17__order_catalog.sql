-- A clinician typed prescriptions and lab requests as free text, one per line. That is
-- fine until two doctors write "Amox 500", "Amoxycillin 500mg" and "Amoxicillin 500 mg"
-- for the same thing, and the pharmacy has to work out that they match.
--
-- These two tables are the list they pick from instead. They are reference data, not
-- stock: what a medicine *is*, the same at every hospital, so neither is tenant-scoped.
-- A per-hospital formulary — what this clinic actually holds, and how much — is a
-- different table and a later one. Free text still works: the picker lets a clinician
-- type anything not on the list, which is why nothing here is enforced as a constraint
-- on the prescription itself.

CREATE TABLE medications (
    id       uuid PRIMARY KEY,
    name     varchar(150) NOT NULL,
    strength varchar(60),
    form     varchar(40),
    category varchar(60),
    active   boolean NOT NULL DEFAULT true
);

-- One row per name/strength/form: amoxicillin as a 500mg capsule and as a 125mg/5ml
-- suspension are different things to prescribe, and re-running must not duplicate either.
CREATE UNIQUE INDEX ux_medications_identity
    ON medications (name, coalesce(strength, ''), coalesce(form, ''));

CREATE TABLE lab_tests (
    id       uuid PRIMARY KEY,
    name     varchar(150) NOT NULL,
    category varchar(60),
    specimen varchar(40),
    active   boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX ux_lab_tests_name ON lab_tests (name);

INSERT INTO medications (id, name, strength, form, category)
VALUES
    (gen_random_uuid(), 'Amoxicillin', '250mg', 'Capsule', 'Antibiotic'),
    (gen_random_uuid(), 'Amoxicillin', '500mg', 'Capsule', 'Antibiotic'),
    (gen_random_uuid(), 'Amoxicillin', '125mg/5ml', 'Suspension', 'Antibiotic'),
    (gen_random_uuid(), 'Amoxicillin/Clavulanate', '625mg', 'Tablet', 'Antibiotic'),
    (gen_random_uuid(), 'Azithromycin', '500mg', 'Tablet', 'Antibiotic'),
    (gen_random_uuid(), 'Ciprofloxacin', '500mg', 'Tablet', 'Antibiotic'),
    (gen_random_uuid(), 'Doxycycline', '100mg', 'Capsule', 'Antibiotic'),
    (gen_random_uuid(), 'Metronidazole', '400mg', 'Tablet', 'Antibiotic'),
    (gen_random_uuid(), 'Metronidazole', '200mg/5ml', 'Suspension', 'Antibiotic'),
    (gen_random_uuid(), 'Benzylpenicillin', '1MU', 'Injection', 'Antibiotic'),
    (gen_random_uuid(), 'Ceftriaxone', '1g', 'Injection', 'Antibiotic'),
    (gen_random_uuid(), 'Cotrimoxazole', '960mg', 'Tablet', 'Antibiotic'),
    (gen_random_uuid(), 'Artemether/Lumefantrine', '20/120mg', 'Tablet', 'Antimalarial'),
    (gen_random_uuid(), 'Artesunate', '60mg', 'Injection', 'Antimalarial'),
    (gen_random_uuid(), 'Quinine', '300mg', 'Tablet', 'Antimalarial'),
    (gen_random_uuid(), 'Paracetamol', '500mg', 'Tablet', 'Analgesic'),
    (gen_random_uuid(), 'Paracetamol', '120mg/5ml', 'Suspension', 'Analgesic'),
    (gen_random_uuid(), 'Ibuprofen', '400mg', 'Tablet', 'Analgesic'),
    (gen_random_uuid(), 'Diclofenac', '50mg', 'Tablet', 'Analgesic'),
    (gen_random_uuid(), 'Morphine', '10mg/ml', 'Injection', 'Analgesic'),
    (gen_random_uuid(), 'Chlorphenamine', '4mg', 'Tablet', 'Antihistamine'),
    (gen_random_uuid(), 'Cetirizine', '10mg', 'Tablet', 'Antihistamine'),
    (gen_random_uuid(), 'Prednisolone', '5mg', 'Tablet', 'Corticosteroid'),
    (gen_random_uuid(), 'Hydrocortisone', '100mg', 'Injection', 'Corticosteroid'),
    (gen_random_uuid(), 'Salbutamol', '100mcg', 'Inhaler', 'Respiratory'),
    (gen_random_uuid(), 'Omeprazole', '20mg', 'Capsule', 'Gastrointestinal'),
    (gen_random_uuid(), 'Oral rehydration salts', NULL, 'Sachet', 'Gastrointestinal'),
    (gen_random_uuid(), 'Zinc sulphate', '20mg', 'Tablet', 'Gastrointestinal'),
    (gen_random_uuid(), 'Metformin', '500mg', 'Tablet', 'Endocrine'),
    (gen_random_uuid(), 'Insulin glargine', '100IU/ml', 'Injection', 'Endocrine'),
    (gen_random_uuid(), 'Amlodipine', '5mg', 'Tablet', 'Cardiovascular'),
    (gen_random_uuid(), 'Atenolol', '50mg', 'Tablet', 'Cardiovascular'),
    (gen_random_uuid(), 'Hydrochlorothiazide', '25mg', 'Tablet', 'Cardiovascular'),
    (gen_random_uuid(), 'Ferrous sulphate', '200mg', 'Tablet', 'Haematinic'),
    (gen_random_uuid(), 'Folic acid', '5mg', 'Tablet', 'Haematinic'),
    (gen_random_uuid(), 'Vitamin A', '200000IU', 'Capsule', 'Supplement')
ON CONFLICT DO NOTHING;

INSERT INTO lab_tests (id, name, category, specimen)
VALUES
    (gen_random_uuid(), 'Malaria rapid diagnostic test', 'Parasitology', 'Blood'),
    (gen_random_uuid(), 'Blood slide for malaria parasites', 'Parasitology', 'Blood'),
    (gen_random_uuid(), 'Full blood count', 'Haematology', 'Blood'),
    (gen_random_uuid(), 'Haemoglobin', 'Haematology', 'Blood'),
    (gen_random_uuid(), 'Blood group and rhesus', 'Haematology', 'Blood'),
    (gen_random_uuid(), 'Erythrocyte sedimentation rate', 'Haematology', 'Blood'),
    (gen_random_uuid(), 'Random blood sugar', 'Chemistry', 'Blood'),
    (gen_random_uuid(), 'Fasting blood sugar', 'Chemistry', 'Blood'),
    (gen_random_uuid(), 'Renal function tests', 'Chemistry', 'Blood'),
    (gen_random_uuid(), 'Liver function tests', 'Chemistry', 'Blood'),
    (gen_random_uuid(), 'Lipid profile', 'Chemistry', 'Blood'),
    (gen_random_uuid(), 'HIV rapid test', 'Serology', 'Blood'),
    (gen_random_uuid(), 'Hepatitis B surface antigen', 'Serology', 'Blood'),
    (gen_random_uuid(), 'Syphilis rapid test', 'Serology', 'Blood'),
    (gen_random_uuid(), 'Pregnancy test', 'Serology', 'Urine'),
    (gen_random_uuid(), 'Urinalysis', 'Microbiology', 'Urine'),
    (gen_random_uuid(), 'Urine culture and sensitivity', 'Microbiology', 'Urine'),
    (gen_random_uuid(), 'Stool analysis', 'Microbiology', 'Stool'),
    (gen_random_uuid(), 'Sputum for AFB', 'Microbiology', 'Sputum'),
    (gen_random_uuid(), 'Wound swab culture', 'Microbiology', 'Swab')
ON CONFLICT DO NOTHING;
