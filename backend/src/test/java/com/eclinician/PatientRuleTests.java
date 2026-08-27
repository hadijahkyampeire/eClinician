package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eclinician.domains.dtos.AppointmentRequest;
import com.eclinician.domains.dtos.PatientRequest;
import com.eclinician.domains.dtos.PatientResponse;
import com.eclinician.services.AppointmentService;
import com.eclinician.services.PatientService;
import com.eclinician.web.ConflictException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/** The two business rules the SRS states about patient profiles. */
@SpringBootTest
@Transactional
class PatientRuleTests {

    private static final String TENANT = "rules-hospital";

    @Autowired PatientService patients;
    @Autowired AppointmentService appointments;

    /** A child is registered on a parent's number, so the number alone cannot be the rule. */
    @Test
    void aFamilyMayShareOnePhoneNumber() {
        patients.create(TENANT, request("Mary", "+256700900001", "CF900001"));

        PatientResponse child = patients.create(TENANT,
                request("Junior", "+256700900001", "CF900011"));

        assertThat(child.id()).isNotNull();
    }

    @Test
    void theSameNameOnTheSameNumberIsTheSamePersonTwice() {
        patients.create(TENANT, request("Mary", "+256700900002", "CF900002"));

        assertThatThrownBy(() -> patients.create(TENANT,
                request("mary", "+256700900002", "CF999999")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("this name on this number");
    }

    @Test
    void aNationalIdIsStillOnePerson() {
        patients.create(TENANT, request("Mary", "+256700900012", "CF900012"));

        assertThatThrownBy(() -> patients.create(TENANT,
                request("Imposter", "+256700900013", "CF900012")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("national ID");
    }

    @Test
    void anotherClinicMayUseTheSameNumber() {
        patients.create(TENANT, request("Mary", "+256700900003", "CF900003"));
        PatientResponse elsewhere = patients.create("other-hospital",
                request("Mary", "+256700900003", "CF900003"));

        assertThat(elsewhere.id()).isNotNull();
    }

    @Test
    void updatingAPatientDoesNotCollideWithThemselves() {
        PatientResponse mary = patients.create(TENANT, request("Mary", "+256700900004", "CF900004"));

        PatientResponse renamed = patients.update(TENANT, mary.id(),
                request("Mary Jane", "+256700900004", "CF900004"));

        assertThat(renamed.firstName()).isEqualTo("Mary Jane");
    }

    @Test
    void aPatientWithVisitsCannotBeDeleted() {
        PatientResponse mary = patients.create(TENANT, request("Mary", "+256700900005", "CF900005"));
        appointments.checkIn(TENANT, new AppointmentRequest(mary.id(), null, null, "Fever", false));

        assertThatThrownBy(() -> patients.delete(TENANT, mary.id()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("cannot be deleted");
    }

    @Test
    void aPatientWithNoHistoryStillCanBe() {
        PatientResponse walkOut = patients.create(TENANT, request("Walk", "+256700900006", "CF900006"));

        patients.delete(TENANT, walkOut.id());
    }

    @Test
    void aNationalIdCannotBeChangedAfterRegistration() {
        PatientResponse mary = patients.create(TENANT, request("Mary", "+256700900007", "CF900007"));

        assertThatThrownBy(() -> patients.update(TENANT, mary.id(),
                request("Mary", "+256700900007", "CF000999")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("cannot be changed");
    }

    private PatientRequest request(String firstName, String phone, String nationalId) {
        return new PatientRequest(firstName, "Nakimuli", LocalDate.of(1990, 4, 12), "Female",
                phone, null, nationalId, null, null, null, null, "UG");
    }
}
