-- The schema as Hibernate generated it, written out by hand so it is versioned from
-- here on. An existing database (the Render deployment) is baselined at this version
-- and skips it; a fresh database runs it.

CREATE TABLE app_users (
    id              uuid PRIMARY KEY,
    tenant_id       varchar(255),
    name            varchar(150) NOT NULL,
    email           varchar(200) NOT NULL,
    password_hash   varchar(100) NOT NULL,
    role            varchar(30)  NOT NULL,
    platform_admin  boolean      NOT NULL,
    active          boolean      NOT NULL DEFAULT true,
    created_at      timestamp(6) with time zone,
    CONSTRAINT app_users_email_key UNIQUE (email),
    CONSTRAINT app_users_role_check CHECK (role IN
        ('ADMINISTRATOR', 'CLINICIAN', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN'))
);

CREATE TABLE patients (
    id                 uuid PRIMARY KEY,
    tenant_id          varchar(255) NOT NULL,
    first_name         varchar(100),
    last_name          varchar(100),
    date_of_birth      date,
    sex                varchar(255),
    phone              varchar(255),
    email              varchar(254),
    national_id        varchar(100),
    address            varchar(255),
    city               varchar(100),
    district           varchar(100),
    state_province     varchar(100),
    country            varchar(2),
    active_care_status varchar(30),
    created_at         timestamp(6) with time zone,
    updated_at         timestamp(6) with time zone,
    CONSTRAINT patients_active_care_status_check CHECK (active_care_status IN
        ('CHECKED_IN', 'WAITING', 'IN_SESSION'))
);

CREATE TABLE appointments (
    id                 uuid PRIMARY KEY,
    tenant_id          varchar(255) NOT NULL,
    patient_id         uuid         NOT NULL,
    doctor_id          uuid,
    status             varchar(30)  NOT NULL,
    scheduled_at       timestamp(6) with time zone NOT NULL,
    checked_in_at      timestamp(6) with time zone,
    session_started_at timestamp(6) with time zone,
    completed_at       timestamp(6) with time zone,
    reason             varchar(500),
    created_at         timestamp(6) with time zone,
    updated_at         timestamp(6) with time zone,
    CONSTRAINT appointments_status_check CHECK (status IN
        ('SCHEDULED', 'CHECKED_IN', 'WAITING', 'IN_SESSION', 'COMPLETED',
         'CANCELLED', 'NO_SHOW'))
);

CREATE TABLE encounters (
    id                  uuid PRIMARY KEY,
    tenant_id           varchar(255) NOT NULL,
    patient_id          uuid         NOT NULL,
    appointment_id      uuid         NOT NULL,
    status              varchar(20)  NOT NULL,
    clinician_name      varchar(150) NOT NULL,
    chief_complaint     varchar(500),
    blood_pressure      varchar(255),
    temperature_celsius double precision,
    pulse_bpm           integer,
    weight_kg           double precision,
    symptoms            text,
    examination_notes   text,
    diagnosis           text,
    treatment_plan      text,
    prescriptions       text,
    lab_requests        text,
    finalized_at        timestamp(6) with time zone,
    created_at          timestamp(6) with time zone,
    updated_at          timestamp(6) with time zone,
    -- One visit, one record: the appointment can be documented exactly once.
    CONSTRAINT encounters_appointment_id_key UNIQUE (appointment_id),
    CONSTRAINT encounters_status_check CHECK (status IN ('DRAFT', 'FINALIZED'))
);

CREATE TABLE prescription_orders (
    id            uuid PRIMARY KEY,
    tenant_id     varchar(255) NOT NULL,
    patient_id    uuid         NOT NULL,
    encounter_id  uuid         NOT NULL,
    medication    varchar(500) NOT NULL,
    status        varchar(20)  NOT NULL,
    dispensed_by  varchar(150),
    dispensed_at  timestamp(6) with time zone,
    notes         varchar(500),
    created_at    timestamp(6) with time zone,
    updated_at    timestamp(6) with time zone,
    CONSTRAINT prescription_orders_status_check CHECK (status IN
        ('PENDING', 'DISPENSED', 'UNAVAILABLE'))
);

CREATE TABLE lab_orders (
    id           uuid PRIMARY KEY,
    tenant_id    varchar(255) NOT NULL,
    patient_id   uuid         NOT NULL,
    encounter_id uuid         NOT NULL,
    test_name    varchar(500) NOT NULL,
    status       varchar(20)  NOT NULL,
    result       varchar(2000),
    resulted_by  varchar(150),
    resulted_at  timestamp(6) with time zone,
    notes        varchar(500),
    created_at   timestamp(6) with time zone,
    updated_at   timestamp(6) with time zone,
    CONSTRAINT lab_orders_status_check CHECK (status IN
        ('PENDING', 'COMPLETED', 'CANCELLED'))
);
