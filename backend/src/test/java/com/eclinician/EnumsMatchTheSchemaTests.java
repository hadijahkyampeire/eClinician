package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;

import com.eclinician.domains.enums.AppointmentStatus;
import com.eclinician.domains.enums.EncounterStatus;
import com.eclinician.domains.enums.LabStatus;
import com.eclinician.domains.enums.PatientCareStatus;
import com.eclinician.domains.enums.PrescriptionStatus;
import com.eclinician.domains.enums.UserRole;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * The one thing these tests cannot otherwise see.
 *
 * <p>Every other test runs on H2 with the schema built from the entities, so a Java enum
 * and its database CHECK constraint always agree there by construction. On Postgres they
 * are two separate statements of the same fact, and they had already drifted: LAB was
 * added to {@link PatientCareStatus} when a clinician got a way to send a patient to the
 * bench mid-visit, and no migration widened the constraint. Every send-to-lab was refused
 * by the database, in production only, as a 409 that said nothing about why.
 *
 * <p>So this reads the migrations as text and checks the two still say the same thing.
 * Adding a value to one of these enums without a migration fails here rather than on a
 * clinician's screen.
 */
class EnumsMatchTheSchemaTests {

    private static final Path MIGRATIONS = Path.of("src/main/resources/db/migration");

    /**
     * The quoted values inside a CHECK ... IN (...). One shape covers both the inline
     * definition in a CREATE TABLE and a later ADD CONSTRAINT, because the second
     * contains the first.
     */
    private static final String CHECK =
            "CONSTRAINT\\s+%s\\s+CHECK\\s*\\([^)]*?IN\\s*\\(([^)]*)\\)";
    private static final Pattern QUOTED = Pattern.compile("'([^']+)'");

    @Test
    void everyEnumValueIsAllowedByTheSchema() {
        assertAllowed("patients_active_care_status_check", PatientCareStatus.class);
        assertAllowed("appointments_status_check", AppointmentStatus.class);
        assertAllowed("encounters_status_check", EncounterStatus.class);
        assertAllowed("prescription_orders_status_check", PrescriptionStatus.class);
        assertAllowed("lab_orders_status_check", LabStatus.class);
        assertAllowed("app_users_role_check", UserRole.class);
    }

    private static void assertAllowed(String constraint, Class<? extends Enum<?>> type) {
        Set<String> allowed = allowedBy(constraint);
        assertThat(allowed)
                .as("%s is the live definition of %s in Postgres. A value missing here is "
                        + "one the database will refuse: add a migration widening it.",
                        constraint, type.getSimpleName())
                .isNotEmpty()
                .containsAll(Stream.of(type.getEnumConstants()).map(Enum::name).toList());
    }

    /** The newest migration that writes this constraint wins, the way Flyway runs them. */
    private static Set<String> allowedBy(String constraint) {
        Pattern shape = Pattern.compile(String.format(CHECK, constraint),
                Pattern.CASE_INSENSITIVE);
        Set<String> allowed = new LinkedHashSet<>();
        for (Path file : migrationsInOrder()) {
            Matcher match = shape.matcher(read(file));
            while (match.find()) {
                allowed.clear();
                Matcher value = QUOTED.matcher(match.group(1));
                while (value.find()) {
                    allowed.add(value.group(1));
                }
            }
        }
        return allowed;
    }

    /** V2 runs before V10, which is not the order their names sort in. */
    private static List<Path> migrationsInOrder() {
        try (Stream<Path> files = Files.list(MIGRATIONS)) {
            return files.filter(path -> path.getFileName().toString().endsWith(".sql"))
                    .sorted(Comparator.comparingInt(EnumsMatchTheSchemaTests::versionOf))
                    .toList();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    private static int versionOf(Path file) {
        String name = file.getFileName().toString();
        return Integer.parseInt(name.substring(1, name.indexOf("__")));
    }

    private static String read(Path file) {
        try {
            return Files.readString(file);
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
