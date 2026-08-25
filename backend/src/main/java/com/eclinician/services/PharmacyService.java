package com.eclinician.services;

import com.eclinician.domains.dtos.DispenseRequest;
import com.eclinician.domains.dtos.PrescriptionResponse;
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
            value.setDispensedBy(pharmacistName);
            value.setDispensedAt(Instant.now());
        }
        PrescriptionOrder saved = orders.save(value);
        // Keep the patient at Pharmacy until every medicine from their active visit
        // has been dispensed. UNAVAILABLE remains actionable and therefore stays active.
        if (!orders.existsByTenantIdAndPatientIdAndStatusNot(
                tenantId, value.getPatientId(), PrescriptionStatus.DISPENSED)) {
            patients.findByIdAndTenantId(value.getPatientId(), tenantId).ifPresent(patient -> {
                if (patient.getActiveCareStatus() == PatientCareStatus.PHARMACY) {
                    patient.setActiveCareStatus(null);
                    patients.save(patient);
                }
            });
        }
        return response(tenantId, saved);
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
                substituted, value.getDispensedBy(), value.getDispensedAt(),
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
