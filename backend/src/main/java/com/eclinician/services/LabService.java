package com.eclinician.services;

import com.eclinician.domains.dtos.LabOrderResponse;
import com.eclinician.domains.dtos.LabResultRequest;
import com.eclinician.domains.entities.LabOrder;
import com.eclinician.domains.enums.AppointmentStatus;
import com.eclinician.domains.enums.LabStatus;
import com.eclinician.domains.enums.PatientCareStatus;
import com.eclinician.repositories.AppointmentRepository;
import com.eclinician.repositories.EncounterRepository;
import com.eclinician.repositories.LabOrderRepository;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.web.ConflictException;
import com.eclinician.web.NotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LabService {

    private final LabOrderRepository orders;
    private final PatientRepository patients;
    private final EncounterRepository encounters;
    private final AppointmentRepository appointments;

    public LabService(LabOrderRepository orders, PatientRepository patients,
            EncounterRepository encounters, AppointmentRepository appointments) {
        this.orders = orders;
        this.patients = patients;
        this.encounters = encounters;
        this.appointments = appointments;
    }

    /**
     * Splits the clinician's free-text block into one PENDING order per line — when they
     * send the patient to the bench mid-visit, and again when the visit is finalized.
     *
     * Only lines this encounter has not already raised are created, so a clinician who
     * sends two tests, gets them back and then adds a third gets one new order rather
     * than three, and finalize after a lab trip adds nothing at all.
     */
    @Transactional
    public void createFromEncounter(String tenantId, UUID encounterId, UUID patientId,
                                    String labRequests) {
        if (labRequests == null || labRequests.isBlank()) return;
        Set<String> already = orders.findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenantId, patientId)
                .stream()
                .filter(value -> encounterId.equals(value.getEncounterId()))
                .map(LabOrder::getTestName)
                .collect(Collectors.toSet());

        labRequests.lines()
                .map(String::trim)
                .filter(line -> !line.isEmpty() && already.add(line))
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
        // Working notes are savable while the test is still running, and savable again:
        // a half-read culture is a draft, and the bench should not have to hold it in
        // their head until it is finished. Only completing it signs the technician's name
        // to what is written.
        value.setResult(trimToNull(request.result()));
        if (request.status() == LabStatus.COMPLETED) {
            value.setResultedBy(technicianName);
            value.setResultedAt(Instant.now());
        }
        LabOrder saved = orders.save(value);
        releaseFromTheBench(tenantId, saved);
        stampResultsReady(tenantId, saved);
        return response(tenantId, saved);
    }

    /**
     * The way back to the waiting room — not to the front of it.
     *
     * What frees the patient is the specimen being taken, not the answer being written:
     * a culture reads in two days and nobody stands at a bench for two days. So once
     * nothing of theirs is still waiting to be collected they go back, and because the
     * clinician has been seeing other people meanwhile, they rejoin the queue on a fresh
     * clock rather than walking in over everyone who has not been seen at all.
     */
    private void releaseFromTheBench(String tenantId, LabOrder touched) {
        if (stillOnThisVisit(tenantId, touched, LabStatus.PENDING)) return;

        boolean atTheBench = patients.findByIdAndTenantId(touched.getPatientId(), tenantId)
                .filter(patient -> patient.getActiveCareStatus() == PatientCareStatus.LAB)
                .map(patient -> {
                    patient.setActiveCareStatus(PatientCareStatus.WAITING);
                    patients.save(patient);
                    return true;
                })
                .orElse(false);
        if (!atTheBench) return;

        encounters.findByIdAndTenantId(touched.getEncounterId(), tenantId)
                .ifPresent(encounter -> rejoinTheQueue(tenantId, encounter.getAppointmentId()));
    }

    /**
     * The separate moment: every test answered, one way or another. That stamp is what
     * puts "Results ready" on the clinician's unfinished work rather than leaving them to
     * keep checking. Cancelled counts as answered — no result is coming.
     */
    private void stampResultsReady(String tenantId, LabOrder touched) {
        if (stillOnThisVisit(tenantId, touched, LabStatus.PENDING)
                || stillOnThisVisit(tenantId, touched, LabStatus.IN_PROGRESS)) {
            return;
        }
        encounters.findByIdAndTenantId(touched.getEncounterId(), tenantId)
                .filter(encounter -> encounter.getSentToLabAt() != null)
                .filter(encounter -> encounter.getLabResultsReadyAt() == null)
                .ifPresent(encounter -> {
                    encounter.setLabResultsReadyAt(Instant.now());
                    encounters.save(encounter);
                });
    }

    /**
     * Only this visit's tests speak for this visit. A pending order left over from some
     * earlier one is not what the patient is standing there waiting for.
     */
    private boolean stillOnThisVisit(String tenantId, LabOrder touched, LabStatus status) {
        return orders
                .findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenantId, touched.getPatientId())
                .stream()
                .filter(value -> touched.getEncounterId().equals(value.getEncounterId()))
                .anyMatch(value -> value.getStatus() == status);
    }

    /** A new wait, so whoever has been sitting there longest is still next. */
    private void rejoinTheQueue(String tenantId, UUID appointmentId) {
        appointments.findByIdAndTenantId(appointmentId, tenantId)
                .filter(appointment -> appointment.getStatus() == AppointmentStatus.IN_SESSION)
                .ifPresent(appointment -> {
                    appointment.setStatus(AppointmentStatus.WAITING);
                    appointment.setWaitingAt(Instant.now());
                    appointments.save(appointment);
                });
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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
