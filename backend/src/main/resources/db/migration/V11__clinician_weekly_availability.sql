CREATE TABLE clinician_availability (
    id           uuid PRIMARY KEY,
    tenant_id    varchar(255) NOT NULL,
    clinician_id uuid NOT NULL,
    day_of_week  varchar(10) NOT NULL,
    start_time   time NOT NULL,
    end_time     time NOT NULL,
    room         varchar(50) NOT NULL,
    CONSTRAINT clinician_availability_shift_key
        UNIQUE (tenant_id, clinician_id, day_of_week, start_time),
    CONSTRAINT clinician_availability_day_check CHECK (day_of_week IN
        ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
    CONSTRAINT clinician_availability_clinician_fk FOREIGN KEY (clinician_id)
        REFERENCES app_users(id)
);

CREATE INDEX clinician_availability_lookup_idx
    ON clinician_availability (tenant_id, day_of_week, start_time, end_time);
