-- Core PostgreSQL schema reference for AttendEase Smart Attendance System
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    uid VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    student_id VARCHAR(64),
    department VARCHAR(120),
    college_id VARCHAR(64) DEFAULT 'col-1',
    division_id VARCHAR(64),
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS course_classes (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(160) NOT NULL,
    teacher_uid VARCHAR(64) NOT NULL,
    teacher_name VARCHAR(120) NOT NULL,
    division_id VARCHAR(64),
    college_id VARCHAR(64) DEFAULT 'col-1',
    schedule VARCHAR(120),
    room VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGSERIAL PRIMARY KEY,
    class_id VARCHAR(64) NOT NULL,
    class_code VARCHAR(32) NOT NULL,
    class_name VARCHAR(160) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    student_name VARCHAR(120) NOT NULL,
    student_uid VARCHAR(64),
    division_id VARCHAR(64),
    college_id VARCHAR(64) DEFAULT 'col-1',
    attendance_date DATE NOT NULL,
    status VARCHAR(16) NOT NULL,
    method VARCHAR(16) NOT NULL
);

CREATE TABLE IF NOT EXISTS qr_sessions (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    class_id VARCHAR(64) NOT NULL,
    class_code VARCHAR(32) NOT NULL,
    division_id VARCHAR(64),
    college_id VARCHAR(64) DEFAULT 'col-1',
    expires_at TIMESTAMP NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);
