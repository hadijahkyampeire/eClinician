package com.eclinician.services;

import com.eclinician.domains.dtos.LabOrderResponse;
import com.eclinician.domains.dtos.LabResultRequest;
import com.eclinician.domains.entities.LabOrder;
import com.eclinician.domains.enums.LabStatus;
import com.eclinician.repositories.LabOrderRepository;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.web.ConflictException;
import com.eclinician.web.NotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LabService {

    private final LabOrderRepository orders;
    private final PatientRepository patients;

    public LabService(LabOrderRepository orders, PatientRepository patients) {
        this.orders = orders;
        this.patients = patients;
    }

    /**
     * Called when an encounter is finalized. Splits the clinician's free-text block
     * into one PENDING order per line.
     */
    @Transactional
    public void createFromEncounter(String tenantId, UUID encounterId, UUID patientId,
                                    String labRequests) {
        if (labRequests == null || labRequests.isBlank()) return;
        if (orders.existsByTenantIdAndEncounterId(tenantId, encounterId)) return;

        labRequests.lines()
                .map(String::trim)
                .filter(line -> !line.isEmpty())
                .forEach(line -> orders.save(order(tenantId, encounterId, patientId, line)));
    }

    public List<LabOrderResponse> list(String tenantId, LabStatus status) {
        List<LabOrder> found = status == null
                ? orders.findByTenantIdOrderByCreatedAtDesc(tenantId)
                : orders.findByTenantIdAndStatusOrderByCreatedAtDesc(tenantId, status);
        return found.stream().map(value -> response(tenantId, value)).toList();
    }

    /** SRS 5.1.3: the clinician reads their patient's results, not the technician's queue. */
    public List<LabOrderResponse> listForPatient(String tenantId, UUID patientId) {
        return orders.findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenantId, patientId)
                .stream().map(value -> response(tenantId, value)).toList();
    }

    @Transactional
    public LabOrderResponse update(String tenantId, String technicianName, UUID id,
            LabResultRequest request) {
        LabOrder value = orders.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new NotFoundException("Lab order not found"));
        if (value.getStatus() == LabStatus.COMPLETED) {
            throw new ConflictException("This test has already been resulted");
        }
        if (request.status() == LabStatus.PENDING) {
            throw new ConflictException("A lab order cannot be moved back to pending");
        }
        if (request.status() == LabStatus.COMPLETED
                && (request.result() == null || request.result().isBlank())) {
            throw new ConflictException("A result is required to complete a test");
        }
        value.setStatus(request.status());
        value.setNotes(request.notes());
        if (request.status() == LabStatus.COMPLETED) {
            value.setResult(request.result().trim());
            value.setResultedBy(technicianName);
            value.setResultedAt(Instant.now());
        }
        return response(tenantId, orders.save(value));
    }

    private LabOrder order(String tenantId, UUID encounterId, UUID patientId, String testName) {
        LabOrder value = new LabOrder();
        value.setTenantId(tenantId);
        value.setPatientId(patientId);
        value.setEncounterId(encounterId);
        value.setTestName(testName.length() <= 500 ? testName : testName.substring(0, 500));
        value.setStatus(LabStatus.PENDING);
        return value;
    }

    private LabOrderResponse response(String tenantId, LabOrder value) {
        String patientName = patients.findByIdAndTenantId(value.getPatientId(), tenantId)
                .map(patient -> patient.getFirstName() + " " + patient.getLastName())
                .orElse("Unknown patient");
        return new LabOrderResponse(value.getId(), value.getPatientId(), patientName,
                value.getEncounterId(), value.getTestName(), value.getStatus(), value.getResult(),
                value.getResultedBy(), value.getResultedAt(), value.getNotes(), value.getCreatedAt());
    }
}
