package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eclinician.domains.dtos.DispenseRequest;
import com.eclinician.domains.dtos.PrescriptionResponse;
import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.enums.PatientCareStatus;
import com.eclinician.domains.enums.PrescriptionStatus;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.services.PharmacyService;
import com.eclinician.web.ConflictException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * What the pharmacy writes down. A prescription used to record only that it went out;
 * when the prescribed medicine is not in stock the pharmacist agrees an equivalent with
 * the clinician and hands that over, and the record has to carry both.
 */
@SpringBootTest
@Transactional
class PrescriptionDispensingTests {

    private static final String TENANT = "dispensing-hospital";

    @Autowired PharmacyService pharmacy;
    @Autowired PatientRepository patients;

    @Test
    void dispensingAsPrescribedRecordsTheMedicineItself() {
        PrescriptionResponse order = prescribe("Amoxicillin 500mg");

        PrescriptionResponse given = pharmacy.update(TENANT, "P. Harmacist", order.id(),
                new DispenseRequest(PrescriptionStatus.DISPENSED, null, 15, "tablets", null));

        // An empty box means "as prescribed", written down rather than left null so nobody
        // later has to guess whether the blank meant "same" or "not filled in".
        assertThat(given.dispensedMedication()).isEqualTo("Amoxicillin 500mg");
        assertThat(given.substituted()).isFalse();
        assertThat(given.quantityDispensed()).isEqualTo(15);
        assertThat(given.dispenseUnit()).isEqualTo("tablets");
        assertThat(given.dispensedBy()).isEqualTo("P. Harmacist");
    }

    @Test
    void anEquivalentIsRecordedBesideWhatWasOrdered() {
        PrescriptionResponse order = prescribe("Amoxicillin 500mg");

        PrescriptionResponse given = pharmacy.update(TENANT, "P. Harmacist", order.id(),
                new DispenseRequest(PrescriptionStatus.DISPENSED, "Ampicillin 500mg", 12,
                        "capsules", "Amoxicillin out of stock, agreed with Dr Jenkins"));

        // What the doctor ordered is never overwritten by what the pharmacy had.
        assertThat(given.medication()).isEqualTo("Amoxicillin 500mg");
        assertThat(given.dispensedMedication()).isEqualTo("Ampicillin 500mg");
        assertThat(given.substituted()).isTrue();
        assertThat(given.notes()).contains("agreed with Dr Jenkins");
    }

    /** Case and stray spacing are not a substitution. */
    @Test
    void theSameMedicineWrittenDifferentlyIsNotASubstitution() {
        PrescriptionResponse order = prescribe("Amoxicillin 500mg");

        PrescriptionResponse given = pharmacy.update(TENANT, "P. Harmacist", order.id(),
                new DispenseRequest(PrescriptionStatus.DISPENSED, "  amoxicillin 500MG  ",
                        null, null, null));

        assertThat(given.substituted()).isFalse();
    }

    @Test
    void aCountAlwaysCarriesAUnitAndAMissingCountCarriesNone() {
        PrescriptionResponse counted = pharmacy.update(TENANT, "P. Harmacist",
                prescribe("Paracetamol 1g").id(),
                new DispenseRequest(PrescriptionStatus.DISPENSED, null, 20, "  ", null));
        assertThat(counted.dispenseUnit()).isEqualTo("tablets");

        PrescriptionResponse uncounted = pharmacy.update(TENANT, "P. Harmacist",
                prescribe("Ibuprofen 400mg").id(),
                new DispenseRequest(PrescriptionStatus.DISPENSED, null, null, "tablets", null));
        assertThat(uncounted.quantityDispensed()).isNull();
        assertThat(uncounted.dispenseUnit()).isNull();
    }

    /** Nothing is dispensed, so there is nothing to record beyond the reason. */
    @Test
    void anUnavailableMedicineRecordsNoDispensing() {
        PrescriptionResponse order = prescribe("Insulin glargine");

        PrescriptionResponse refused = pharmacy.update(TENANT, "P. Harmacist", order.id(),
                new DispenseRequest(PrescriptionStatus.UNAVAILABLE, "No cold chain today"));

        assertThat(refused.dispensedMedication()).isNull();
        assertThat(refused.substituted()).isFalse();
        assertThat(refused.notes()).isEqualTo("No cold chain today");
    }

    /**
     * A bottle of syrup is two facts, not one: the shelf loses a bottle, and the patient
     * receives 100ml. Recording only the count would leave nobody able to say whether the
     * child got 60ml or 200ml.
     */
    @Test
    void aContainerRecordsBothTheCountAndWhatIsInside() {
        PrescriptionResponse order = prescribe("Amoxicillin 125mg/5ml suspension");

        PrescriptionResponse given = pharmacy.update(TENANT, "P. Harmacist", order.id(),
                new DispenseRequest(PrescriptionStatus.DISPENSED, null, 2, "bottles",
                        "100 ml", null));

        assertThat(given.quantityDispensed()).isEqualTo(2);
        assertThat(given.dispenseUnit()).isEqualTo("bottles");
        assertThat(given.packSize()).isEqualTo("100 ml");
    }

    /** Tablets are their own measure, so there is nothing to put inside them. */
    @Test
    void somethingThatIsItsOwnMeasureCarriesNoPackSize() {
        PrescriptionResponse given = pharmacy.update(TENANT, "P. Harmacist",
                prescribe("Paracetamol 1g").id(),
                new DispenseRequest(PrescriptionStatus.DISPENSED, null, 15, "tablets", null));

        assertThat(given.packSize()).isNull();
    }

    /** A pack size with nothing to count describes nothing, so it travels with a count. */
    @Test
    void aPackSizeWithoutACountIsDropped() {
        PrescriptionResponse given = pharmacy.update(TENANT, "P. Harmacist",
                prescribe("Cough linctus").id(),
                new DispenseRequest(PrescriptionStatus.DISPENSED, null, null, "bottles",
                        "200 ml", null));

        assertThat(given.quantityDispensed()).isNull();
        assertThat(given.dispenseUnit()).isNull();
        assertThat(given.packSize()).isNull();
    }

    /**
     * An out-of-stock medicine used to pin the patient at the counter for good: the check
     * asked whether anything was "not dispensed", and an unavailable line is exactly that.
     * The desk's Check in button only appears once a patient has no active status, so that
     * patient could never be checked in again.
     */
    @Test
    void aMedicineThePharmacyCannotSupplyStillLetsThePatientGo() {
        Patient patient = atTheCounter("Insulin glargine");
        PrescriptionResponse order = pharmacy.listForPatient(TENANT, patient.getId()).getFirst();

        pharmacy.update(TENANT, "P. Harmacist", order.id(),
                new DispenseRequest(PrescriptionStatus.UNAVAILABLE, "No cold chain today"));

        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus()).isNull();
    }

    /** A forgotten line from an old visit is not what this patient is standing there for. */
    @Test
    void anOldUnfinishedPrescriptionDoesNotHoldThemAtTheCounter() {
        Patient patient = atTheCounter("Amoxicillin 500mg");
        pharmacy.createFromEncounter(TENANT, UUID.randomUUID(), patient.getId(), "Last year's tablets");
        PrescriptionResponse today = pharmacy.listForPatient(TENANT, patient.getId()).stream()
                .filter(order -> order.medication().equals("Amoxicillin 500mg")).findFirst().orElseThrow();

        pharmacy.update(TENANT, "P. Harmacist", today.id(),
                new DispenseRequest(PrescriptionStatus.DISPENSED, null, 15, "tablets", null));

        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus()).isNull();
    }

    /** The counter serves people, and the pharmacist is the one who says they have gone. */
    @Test
    void thePharmacistSeesWhoIsThereAndChecksThemOut() {
        Patient patient = atTheCounter("Amoxicillin 500mg");

        assertThat(pharmacy.atTheCounter(TENANT))
                .singleElement()
                .satisfies(waiting -> {
                    assertThat(waiting.patientName()).isEqualTo("Dis Pensing");
                    assertThat(waiting.medicines()).hasSize(1);
                    assertThat(waiting.ready()).isFalse();
                });

        // They gave up waiting and left without it — the counter can still close them out.
        pharmacy.checkOut(TENANT, patient.getId());
        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus()).isNull();
        assertThat(pharmacy.atTheCounter(TENANT)).isEmpty();
        assertThatThrownBy(() -> pharmacy.checkOut(TENANT, patient.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("not at the pharmacy counter");
    }

    /** A patient sent to the counter by a finalized visit, with one medicine waiting. */
    private Patient atTheCounter(String medication) {
        Patient patient = new Patient();
        patient.setTenantId(TENANT);
        patient.setFirstName("Dis");
        patient.setLastName("Pensing");
        patient.setActiveCareStatus(PatientCareStatus.PHARMACY);
        Patient saved = patients.save(patient);
        pharmacy.createFromEncounter(TENANT, UUID.randomUUID(), saved.getId(), medication);
        return saved;
    }

    /** One prescription, freshly written by a clinician finalizing a visit. */
    private PrescriptionResponse prescribe(String medication) {
        Patient patient = new Patient();
        patient.setTenantId(TENANT);
        patient.setFirstName("Dis");
        patient.setLastName("Pensing");
        Patient saved = patients.save(patient);

        UUID encounterId = UUID.randomUUID();
        pharmacy.createFromEncounter(TENANT, encounterId, saved.getId(), medication);
        return pharmacy.listForPatient(TENANT, saved.getId()).get(0);
    }
}
