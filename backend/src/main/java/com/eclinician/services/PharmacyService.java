package com.eclinician.services;

import com.eclinician.domains.dtos.CounterPatient;
import com.eclinician.domains.dtos.DispenseRequest;
import com.eclinician.domains.dtos.PrescriptionResponse;
import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.entities.PrescriptionOrder;
import com.eclinician.domains.enums.PrescriptionStatus;
import com.eclinician.domains.enums.PatientCareStatus;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.repositories.PrescriptionOrderRepository;
import com.eclinician.web.ConflictException;
import com.eclinician.web.NotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PharmacyService {

    private final PrescriptionOrderRepository orders;
    private final PatientRepository patients;

    public PharmacyService(PrescriptionOrderRepository orders, PatientRepository patients) {
        this.orders = orders;
        this.patients = patients;
    }

    /**
     * Called when an encounter is finalized. Splits the clinician's free-text block
     * into one PENDING order per line.
     */
    @Transactional
    public void createFromEncounter(String tenantId, UUID encounterId, UUID patientId,
                                    String prescriptions) {
        if (prescriptions == null || prescriptions.isBlank()) return;
        if (orders.existsByTenantIdAndEncounterId(tenantId, encounterId)) return;

        prescriptions.lines()
                .map(String::trim)
                .filter(line -> !line.isEmpty())
                .forEach(line -> orders.save(order(tenantId, encounterId, patientId, line)));
    }

    public List<PrescriptionResponse> list(String tenantId, PrescriptionStatus status) {
        List<PrescriptionOrder> found = status == null
                ? orders.findByTenantIdOrderByCreatedAtDesc(tenantId)
                : orders.findByTenantIdAndStatusOrderByCreatedAtDesc(tenantId, status);
        return found.stream().map(value -> response(tenantId, value)).toList();
    }

    /**
     * Who is at the counter, and what each of them is waiting for.
     *
     * A pharmacist opening the app should see people, not a flat list of boxes — three
     * medicines for one patient is one person standing there, not three.
     */
    public List<CounterPatient> atTheCounter(String tenantId) {
        return patients.findByTenantIdAndActiveCareStatus(tenantId, PatientCareStatus.PHARMACY)
                .stream()
                .map(patient -> {
                    List<PrescriptionResponse> medicines = listForPatient(tenantId, patient.getId());
                    boolean ready = medicines.stream()
                            .noneMatch(order -> order.status() == PrescriptionStatus.PENDING);
                    return new CounterPatient(patient.getId(),
                            patient.getFirstName() + " " + patient.getLastName(), medicines, ready);
                })
                .toList();
    }

    /**
     * The patient has their medicines and has gone. Their visit is already closed — this
     * is the last thing still open on them, and clearing it is what lets the desk check
     * them in again next time.
     */
    @Transactional
    public void checkOut(String tenantId, UUID patientId) {
        Patient patient = patients.findByIdAndTenantId(patientId, tenantId)
                .orElseThrow(() -> new NotFoundException("Patient not found"));
        if (patient.getActiveCareStatus() != PatientCareStatus.PHARMACY) {
            throw new ConflictException("This patient is not at the pharmacy counter");
        }
        patient.setActiveCareStatus(null);
        patients.save(patient);
    }

    /** SRS 4.1.1: the doctor reads the prescriptions they issued, with their dispensed status. */
    public List<PrescriptionResponse> listForPatient(String tenantId, UUID patientId) {
        return orders.findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenantId, patientId)
                .stream().map(value -> response(tenantId, value)).toList();
    }

    @Transactional
    public PrescriptionResponse update(String tenantId, String pharmacistName, UUID id,
            DispenseRequest request) {
        PrescriptionOrder value = orders.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new NotFoundException("Prescription not found"));
        if (value.getStatus() == PrescriptionStatus.DISPENSED) {
            throw new ConflictException("This medicine has already been dispensed");
        }
        if (request.status() == PrescriptionStatus.PENDING) {
            throw new ConflictException("A prescription cannot be moved back to pending");
        }
        value.setStatus(request.status());
        value.setNotes(trimToNull(request.notes()));
        if (request.status() == PrescriptionStatus.DISPENSED) {
            // An empty box means "the medicine as prescribed". Recording that explicitly
            // beats leaving it null, so nobody later has to guess whether a blank meant
            // "same" or "nobody filled it in".
            String handedOver = trimToNull(request.dispensedMedication());
            value.setDispensedMedication(handedOver == null ? value.getMedication() : handedOver);
            value.setQuantityDispensed(request.quantityDispensed());
            value.setDispenseUnit(request.quantityDispensed() == null
                    ? null : unitOrDefault(request.dispenseUnit()));
            // A pack size without a count describes nothing, so it travels with one.
            value.setPackSize(request.quantityDispensed() == null
                    ? null : trimToNull(request.packSize()));
            value.setDispensedBy(pharmacistName);
            value.setDispensedAt(Instant.now());
        }
        PrescriptionOrder saved = orders.save(value);
        releaseFromTheCounter(tenantId, saved);
        return response(tenantId, saved);
    }

    /**
     * Nothing left waiting to be handed over, so the patient is free to go.
     *
     * Two things used to keep them pinned here. "Not dispensed" counted an out-of-stock
     * line as outstanding, so a medicine the pharmacy could not supply held the patient
     * at the counter for good — and because the desk's Check in button only appears once
     * a patient has no active status, that patient could never be checked in again. And
     * the question was asked of every prescription they had ever been given, so one
     * forgotten line from a visit last year did the same thing.
     */
    private void releaseFromTheCounter(String tenantId, PrescriptionOrder touched) {
        boolean stillWaiting = orders
                .findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenantId, touched.getPatientId())
                .stream()
                .filter(order -> touched.getEncounterId().equals(order.getEncounterId()))
                .anyMatch(order -> order.getStatus() == PrescriptionStatus.PENDING);
        if (stillWaiting) return;

        patients.findByIdAndTenantId(touched.getPatientId(), tenantId).ifPresent(patient -> {
            if (patient.getActiveCareStatus() == PatientCareStatus.PHARMACY) {
                patient.setActiveCareStatus(null);
                patients.save(patient);
            }
        });
    }

    private PrescriptionOrder order(String tenantId, UUID encounterId, UUID patientId,
                                    String medication) {
        PrescriptionOrder value = new PrescriptionOrder();
        value.setTenantId(tenantId);
        value.setPatientId(patientId);
        value.setEncounterId(encounterId);
        value.setMedication(medication.length() <= 500 ? medication : medication.substring(0, 500));
        value.setStatus(PrescriptionStatus.PENDING);
        return value;
    }

    private PrescriptionResponse response(String tenantId, PrescriptionOrder value) {
        String patientName = patients.findByIdAndTenantId(value.getPatientId(), tenantId)
                .map(patient -> patient.getFirstName() + " " + patient.getLastName())
                .orElse("Unknown patient");
        String handedOver = value.getDispensedMedication();
        boolean substituted = handedOver != null
                && !handedOver.equalsIgnoreCase(value.getMedication());
        return new PrescriptionResponse(value.getId(), value.getPatientId(), patientName,
                value.getEncounterId(), value.getMedication(), value.getStatus(),
                handedOver, value.getQuantityDispensed(), value.getDispenseUnit(),
                value.getPackSize(), substituted, value.getDispensedBy(), value.getDispensedAt(),
                value.getNotes(), value.getCreatedAt());
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** A count with no unit is half a fact, so one is assumed rather than left blank. */
    private static String unitOrDefault(String unit) {
        String trimmed = trimToNull(unit);
        return trimmed == null ? "tablets" : trimmed;
    }
}
