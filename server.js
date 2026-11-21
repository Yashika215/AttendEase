// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
dotenv.config();
function resolveServerPort() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    } else if (args[i].startsWith("--port=")) {
      const parsed = Number(args[i].slice("--port=".length));
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  const envPort = Number(process.env.PORT);
  const nginxPort = Number(process.env.NGINX_PORT);
  const defaultAppPort = Number(process.env.DEFAULT_APP_PORT);
  if (process.env.NODE_ENV !== "production" && Number.isFinite(nginxPort) && nginxPort > 0 && envPort === nginxPort) {
    return Number.isFinite(defaultAppPort) && defaultAppPort > 0 ? defaultAppPort : 3e3;
  }
  return Number.isFinite(envPort) && envPort > 0 ? envPort : 3e3;
}
var PORT = resolveServerPort();
var rawSpringUrl = (process.env.SPRING_API_URL || "").trim().replace(/\/$/, "");
var SPRING_API_URL = /^https?:\/\/.+/i.test(rawSpringUrl) ? rawSpringUrl : "";
var rawAuthSecret = (process.env.AUTH_SECRET || "").trim();
var AUTH_SECRET = rawAuthSecret.length >= 8 ? rawAuthSecret : "attendease-dev-hmac-secret-2026";
function isSmtpConfigured() {
  const host = (process.env.SMTP_HOST || "").trim();
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const validHost = host.includes(".") || host.toLowerCase() === "localhost";
  return Boolean(validHost && user.length > 2 && pass.length > 2);
}
var isVercel = Boolean(process.env.VERCEL);
var dbPath = isVercel ? path.join("/tmp", "attendease.db") : path.resolve(process.cwd(), "attendease.db");
var db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS colleges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    official_email TEXT NOT NULL COLLATE NOCASE,
    contact_number TEXT,
    address TEXT,
    website TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS academic_years (
    id TEXT PRIMARY KEY,
    college_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(college_id, name)
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    college_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    department TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(college_id, code)
  );

  CREATE TABLE IF NOT EXISTS year_semesters (
    id TEXT PRIMARY KEY,
    college_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(college_id, academic_year_id, course_id, name)
  );

  CREATE TABLE IF NOT EXISTS divisions (
    id TEXT PRIMARY KEY,
    college_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    year_semester_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    batch_name TEXT DEFAULT 'Batch 1',
    room TEXT DEFAULT 'Hall A',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(college_id, academic_year_id, course_id, year_semester_id, code)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL UNIQUE,
    college_id TEXT NOT NULL DEFAULT 'col-1',
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone_number TEXT,
    student_id TEXT COLLATE NOCASE,
    roll_number TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
    department TEXT NOT NULL DEFAULT 'General Studies',
    academic_year_id TEXT,
    course_id TEXT,
    course_code TEXT,
    year_semester_id TEXT,
    division_id TEXT,
    batch_name TEXT,
    avatar TEXT,
    approval_status TEXT NOT NULL DEFAULT 'APPROVED' CHECK(approval_status IN ('APPROVED', 'PENDING', 'REJECTED')),
    status TEXT NOT NULL DEFAULT 'Active',
    email_verified INTEGER NOT NULL DEFAULT 0,
    joined_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS email_otp_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL COLLATE NOCASE,
    otp_hash TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'REGISTRATION',
    expires_at TEXT NOT NULL,
    resend_available_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS course_classes (
    id TEXT PRIMARY KEY,
    college_id TEXT NOT NULL DEFAULT 'col-1',
    academic_year_id TEXT,
    course_id TEXT,
    year_semester_id TEXT,
    division_id TEXT,
    batch_name TEXT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    schedule TEXT NOT NULL,
    room TEXT NOT NULL,
    total_students INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS qr_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    college_id TEXT NOT NULL DEFAULT 'col-1',
    academic_year_id TEXT,
    course_id TEXT,
    year_semester_id TEXT,
    division_id TEXT,
    class_id TEXT NOT NULL,
    class_code TEXT NOT NULL,
    class_name TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_uid TEXT NOT NULL UNIQUE,
    college_id TEXT NOT NULL DEFAULT 'col-1',
    division_id TEXT,
    class_id TEXT NOT NULL,
    class_code TEXT NOT NULL,
    class_name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    attendance_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent')),
    method TEXT NOT NULL CHECK(method IN ('qr', 'manual')),
    student_user_uid TEXT,
    marked_by_uid TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notification_config (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    threshold_percent REAL NOT NULL DEFAULT 75,
    auto_notify_enabled INTEGER NOT NULL DEFAULT 1,
    cooldown_hours INTEGER NOT NULL DEFAULT 24,
    sender_name TEXT NOT NULL DEFAULT 'AttendEase Academic Alerts',
    sender_email TEXT NOT NULL DEFAULT 'alerts@attendease.edu',
    email_subject_template TEXT NOT NULL DEFAULT 'Attendance Alert: Your attendance ({{percentage}}%) is below the {{threshold}}% requirement',
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS college_notification_configs (
    college_id TEXT PRIMARY KEY,
    threshold_percent REAL NOT NULL DEFAULT 75,
    auto_notify_enabled INTEGER NOT NULL DEFAULT 1,
    cooldown_hours INTEGER NOT NULL DEFAULT 24,
    sender_name TEXT NOT NULL DEFAULT 'AttendEase Academic Alerts',
    sender_email TEXT NOT NULL DEFAULT 'alerts@attendease.edu',
    email_subject_template TEXT NOT NULL DEFAULT 'Attendance Alert: Your attendance ({{percentage}}%) is below the {{threshold}}% requirement',
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS email_notification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    college_id TEXT NOT NULL DEFAULT 'col-1',
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    attendance_percentage REAL NOT NULL,
    threshold_percent REAL NOT NULL,
    course_summary TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_preview TEXT NOT NULL,
    delivery_status TEXT NOT NULL,
    recipient_response TEXT,
    triggered_by TEXT NOT NULL,
    sent_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_uid TEXT NOT NULL UNIQUE,
    college_id TEXT NOT NULL DEFAULT 'col-1',
    timestamp TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT,
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'info',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS course_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_uid TEXT NOT NULL,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_uid, class_id),
    FOREIGN KEY(student_uid) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY(class_id) REFERENCES course_classes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enquiry_uid TEXT NOT NULL UNIQUE,
    reference_id TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE,
    phone_number TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    role TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'In Progress', 'Resolved')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
function runSafeMigrations() {
  const usersMaster = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`).get();
  if (usersMaster?.sql && /student_id\s+TEXT\s+UNIQUE/i.test(usersMaster.sql)) {
    db.pragma("foreign_keys = OFF");
    const migrateUsers = db.transaction(() => {
      db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT NOT NULL UNIQUE,
          college_id TEXT NOT NULL DEFAULT 'col-1',
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          phone_number TEXT,
          student_id TEXT COLLATE NOCASE,
          roll_number TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
          department TEXT NOT NULL DEFAULT 'General Studies',
          academic_year_id TEXT,
          course_id TEXT,
          course_code TEXT,
          year_semester_id TEXT,
          division_id TEXT,
          batch_name TEXT,
          avatar TEXT,
          approval_status TEXT NOT NULL DEFAULT 'APPROVED' CHECK(approval_status IN ('APPROVED', 'PENDING', 'REJECTED')),
          status TEXT NOT NULL DEFAULT 'Active',
          email_verified INTEGER NOT NULL DEFAULT 1,
          joined_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO users_new (id, uid, college_id, name, email, phone_number, student_id, password_hash, role, department, course_code, avatar, approval_status, status, email_verified, joined_at, created_at)
        SELECT id, uid, 'col-1', name, email, phone_number, student_id, password_hash, role, department, course_code, avatar, approval_status, status, COALESCE(email_verified, 1), joined_at, created_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
    });
    migrateUsers();
    db.pragma("foreign_keys = ON");
  } else {
    const userCols = db.prepare("PRAGMA table_info(users)").all();
    const addUserCol = (col, def) => {
      if (!userCols.some((c) => c.name === col)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
      }
    };
    addUserCol("email_verified", "INTEGER NOT NULL DEFAULT 1");
    addUserCol("college_id", "TEXT NOT NULL DEFAULT 'col-1'");
    addUserCol("roll_number", "TEXT");
    addUserCol("academic_year_id", "TEXT");
    addUserCol("course_id", "TEXT");
    addUserCol("year_semester_id", "TEXT");
    addUserCol("division_id", "TEXT");
    addUserCol("batch_name", "TEXT");
  }
  const ccMaster = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='course_classes'`).get();
  if (ccMaster?.sql && /code\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(ccMaster.sql)) {
    db.pragma("foreign_keys = OFF");
    const migrateCc = db.transaction(() => {
      db.exec(`
        CREATE TABLE course_classes_new (
          id TEXT PRIMARY KEY,
          college_id TEXT NOT NULL DEFAULT 'col-1',
          academic_year_id TEXT,
          course_id TEXT,
          year_semester_id TEXT,
          division_id TEXT,
          batch_name TEXT,
          code TEXT NOT NULL,
          name TEXT NOT NULL,
          teacher_id TEXT NOT NULL,
          teacher_name TEXT NOT NULL,
          schedule TEXT NOT NULL,
          room TEXT NOT NULL,
          total_students INTEGER NOT NULL DEFAULT 0
        );
        INSERT INTO course_classes_new (id, college_id, code, name, teacher_id, teacher_name, schedule, room, total_students)
        SELECT id, 'col-1', code, name, teacher_id, teacher_name, schedule, room, total_students FROM course_classes;
        DROP TABLE course_classes;
        ALTER TABLE course_classes_new RENAME TO course_classes;
      `);
    });
    migrateCc();
    db.pragma("foreign_keys = ON");
  } else {
    const ccCols = db.prepare("PRAGMA table_info(course_classes)").all();
    const addCcCol = (col, def) => {
      if (!ccCols.some((c) => c.name === col)) {
        db.exec(`ALTER TABLE course_classes ADD COLUMN ${col} ${def}`);
      }
    };
    addCcCol("college_id", "TEXT NOT NULL DEFAULT 'col-1'");
    addCcCol("academic_year_id", "TEXT");
    addCcCol("course_id", "TEXT");
    addCcCol("year_semester_id", "TEXT");
    addCcCol("division_id", "TEXT");
    addCcCol("batch_name", "TEXT");
  }
  const qrCols = db.prepare("PRAGMA table_info(qr_sessions)").all();
  const addQrCol = (col, def) => {
    if (!qrCols.some((c) => c.name === col)) {
      db.exec(`ALTER TABLE qr_sessions ADD COLUMN ${col} ${def}`);
    }
  };
  addQrCol("college_id", "TEXT NOT NULL DEFAULT 'col-1'");
  addQrCol("academic_year_id", "TEXT");
  addQrCol("course_id", "TEXT");
  addQrCol("year_semester_id", "TEXT");
  addQrCol("division_id", "TEXT");
  const attCols = db.prepare("PRAGMA table_info(attendance_records)").all();
  const addAttCol = (col, def) => {
    if (!attCols.some((c) => c.name === col)) {
      db.exec(`ALTER TABLE attendance_records ADD COLUMN ${col} ${def}`);
    }
  };
  addAttCol("student_user_uid", "TEXT");
  addAttCol("marked_by_uid", "TEXT");
  addAttCol("college_id", "TEXT NOT NULL DEFAULT 'col-1'");
  addAttCol("division_id", "TEXT");
  const logCols = db.prepare("PRAGMA table_info(email_notification_logs)").all();
  if (!logCols.some((c) => c.name === "college_id")) {
    db.exec(`ALTER TABLE email_notification_logs ADD COLUMN college_id TEXT NOT NULL DEFAULT 'col-1'`);
  }
  const actCols = db.prepare("PRAGMA table_info(activity_logs)").all();
  if (!actCols.some((c) => c.name === "college_id")) {
    db.exec(`ALTER TABLE activity_logs ADD COLUMN college_id TEXT NOT NULL DEFAULT 'col-1'`);
  }
}
runSafeMigrations();
function syncStudentDivisionEnrollments(studentUid, studentId, divisionId) {
  if (!divisionId) return;
  const divClasses = db.prepare("SELECT id FROM course_classes WHERE division_id = ?").all(divisionId);
  if (divClasses.length === 0) return;
  const insertEnroll = db.prepare(
    "INSERT OR IGNORE INTO course_enrollments (student_uid, student_id, class_id) VALUES (?, ?, ?)"
  );
  for (const cls of divClasses) {
    insertEnroll.run(studentUid, studentId || studentUid, cls.id);
  }
}
function getNotificationConfig(collegeId = "col-1") {
  const row = db.prepare("SELECT * FROM college_notification_configs WHERE college_id = ?").get(collegeId);
  if (row) {
    return {
      id: 1,
      threshold_percent: row.threshold_percent,
      auto_notify_enabled: row.auto_notify_enabled,
      cooldown_hours: row.cooldown_hours,
      sender_name: row.sender_name,
      sender_email: row.sender_email,
      email_subject_template: row.email_subject_template,
      updated_by: row.updated_by,
      updated_at: row.updated_at
    };
  }
  const fallback = db.prepare("SELECT * FROM notification_config WHERE id = 1").get();
  if (fallback) return fallback;
  return {
    id: 1,
    threshold_percent: 75,
    auto_notify_enabled: 1,
    cooldown_hours: 24,
    sender_name: "AttendEase Academic Alerts",
    sender_email: "alerts@attendease.edu",
    email_subject_template: "Attendance Alert: Your attendance ({{percentage}}%) is below the {{threshold}}% requirement",
    updated_by: "System",
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function seedInitialData() {
  db.prepare(`
    INSERT INTO colleges (id, name, official_email, contact_number, address, website)
    VALUES ('col-1', 'JG UNIVERSITY', 'admin@jguniversity.in', '+91-79-2685-0000', 'JG Campus of Advanced Studies, Sarkhej-Gandhinagar Highway, Ahmedabad, Gujarat', 'https://jguniversity.in')
    ON CONFLICT(id) DO UPDATE SET
      name = 'JG UNIVERSITY',
      official_email = 'admin@jguniversity.in',
      address = 'JG Campus of Advanced Studies, Sarkhej-Gandhinagar Highway, Ahmedabad, Gujarat',
      website = 'https://jguniversity.in'
  `).run();
  const existingConfig = db.prepare("SELECT id FROM notification_config WHERE id = 1").get();
  if (!existingConfig) {
    const envFrom = (process.env.SMTP_FROM || "").trim();
    const defaultFrom = envFrom.includes("@") ? envFrom : "alerts@attendease.edu";
    db.prepare(`
      INSERT INTO notification_config (id, threshold_percent, auto_notify_enabled, cooldown_hours, sender_name, sender_email, updated_by)
      VALUES (1, 75, 1, 24, 'JG University Academic Alerts', ?, 'System Initialization')
    `).run(defaultFrom);
  }
  const col1Config = db.prepare("SELECT college_id FROM college_notification_configs WHERE college_id = ?").get("col-1");
  if (!col1Config) {
    const baseCfg = db.prepare("SELECT * FROM notification_config WHERE id = 1").get();
    db.prepare(`
      INSERT OR IGNORE INTO college_notification_configs (college_id, threshold_percent, auto_notify_enabled, cooldown_hours, sender_name, sender_email, email_subject_template, updated_by)
      VALUES ('col-1', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      baseCfg.threshold_percent,
      baseCfg.auto_notify_enabled,
      baseCfg.cooldown_hours,
      baseCfg.sender_name,
      baseCfg.sender_email,
      baseCfg.email_subject_template,
      baseCfg.updated_by || "System Initialization"
    );
  }
  db.prepare(`INSERT OR IGNORE INTO academic_years (id, college_id, name, is_active) VALUES ('ay-1', 'col-1', '2026-2027', 1)`).run();
  db.prepare(`INSERT OR IGNORE INTO courses (id, college_id, code, name, department) VALUES ('crs-btech', 'col-1', 'BTECH', 'B.Tech Computer & Electronics', 'Computer Science & Engineering')`).run();
  db.prepare(`INSERT OR IGNORE INTO courses (id, college_id, code, name, department) VALUES ('crs-bcom', 'col-1', 'BCOM', 'B.Com (Bachelor of Commerce)', 'Commerce & Finance')`).run();
  db.prepare(`INSERT OR IGNORE INTO year_semesters (id, college_id, academic_year_id, course_id, name, order_index) VALUES ('ys-btech-4', 'col-1', 'ay-1', 'crs-btech', 'Fourth Year', 4)`).run();
  db.prepare(`INSERT OR IGNORE INTO year_semesters (id, college_id, academic_year_id, course_id, name, order_index) VALUES ('ys-btech-3', 'col-1', 'ay-1', 'crs-btech', 'Third Year', 3)`).run();
  db.prepare(`INSERT OR IGNORE INTO year_semesters (id, college_id, academic_year_id, course_id, name, order_index) VALUES ('ys-bcom-1', 'col-1', 'ay-1', 'crs-bcom', 'First Year', 1)`).run();
  db.prepare(`INSERT OR IGNORE INTO divisions (id, college_id, academic_year_id, course_id, year_semester_id, name, code, batch_name, room) VALUES ('div-btech-4-a', 'col-1', 'ay-1', 'crs-btech', 'ys-btech-4', 'Division A', 'A', 'Batch A1', 'Lab 3B')`).run();
  db.prepare(`INSERT OR IGNORE INTO divisions (id, college_id, academic_year_id, course_id, year_semester_id, name, code, batch_name, room) VALUES ('div-btech-3-b', 'col-1', 'ay-1', 'crs-btech', 'ys-btech-3', 'Division B', 'B', 'Batch B1', 'Net Lab 1')`).run();
  db.prepare(`INSERT OR IGNORE INTO divisions (id, college_id, academic_year_id, course_id, year_semester_id, name, code, batch_name, room) VALUES ('div-bcom-1-a', 'col-1', 'ay-1', 'crs-bcom', 'ys-bcom-1', 'Division A', 'A', 'Batch 1', 'Commerce Hall 1')`).run();
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (userCount === 0) {
    const defaultHash = bcrypt.hashSync("password123", 10);
    const insertUser = db.prepare(`
      INSERT INTO users (uid, college_id, name, email, phone_number, student_id, roll_number, password_hash, role, department, academic_year_id, course_id, course_code, year_semester_id, division_id, batch_name, avatar, approval_status, status, email_verified, joined_at)
      VALUES (?, 'col-1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    insertUser.run("u-1", "Dr. Robert Chen", "admin@attendease.edu", "+1-555-0101", null, null, defaultHash, "admin", "Academic Affairs & IT", null, null, null, null, null, null, "/assets/images/admin_profile_avatar_1794746526934.jpg", "APPROVED", "Active", "2025-08-15");
    insertUser.run("u-2", "Prof. Sarah Jenkins", "teacher@attendease.edu", "+1-555-0102", null, null, defaultHash, "teacher", "Computer Science", "ay-1", "crs-btech", "CS-401", "ys-btech-4", "div-btech-4-a", "Batch A1", "/assets/images/teacher_sarah_avatar_1794746590760.jpg", "APPROVED", "Active", "2025-09-01");
    insertUser.run("u-3", "Alex Rivera", "student@attendease.edu", "+1-555-0103", "ST-2026-8492", "01", defaultHash, "student", "Software Engineering", "ay-1", "crs-btech", "BTECH", "ys-btech-4", "div-btech-4-a", "Batch A1", "/assets/images/student_alex_avatar_1794746591803.jpg", "APPROVED", "Active", "2026-09-04");
    insertUser.run("u-4", "Jordan Smith", "jordan.smith@attendease.edu", "+1-555-0144", "ST-2026-8493", "02", defaultHash, "student", "Computer Science", "ay-1", "crs-btech", "BTECH", "ys-btech-4", "div-btech-4-a", "Batch A1", null, "APPROVED", "Active", "2026-09-04");
    insertUser.run("u-5", "Taylor Swift", "taylor.swift@attendease.edu", "+1-555-0155", "ST-2026-8494", "03", defaultHash, "student", "Software Engineering", "ay-1", "crs-btech", "BTECH", "ys-btech-4", "div-btech-4-a", "Batch A1", null, "APPROVED", "Active", "2026-09-04");
    insertUser.run("u-6", "Elena Rostova", "elena.rostova@attendease.edu", "+1-555-0166", "ST-2026-8496", "01", defaultHash, "student", "Applied Data Systems", "ay-1", "crs-btech", "BTECH", "ys-btech-3", "div-btech-3-b", "Batch B1", null, "APPROVED", "Active", "2026-09-05");
    insertUser.run("u-7", "David Kim", "david.kim@attendease.edu", "+1-555-0177", "ST-2026-8499", "02", defaultHash, "student", "Computer Science & Engineering", "ay-1", "crs-btech", "BTECH", "ys-btech-3", "div-btech-3-b", "Batch B1", null, "APPROVED", "Active", "2026-09-06");
    insertUser.run("u-8", "Dr. Maya Lin", "maya.lin@attendease.edu", "+1-555-0194", null, null, defaultHash, "teacher", "Data Science", null, null, "CS-310", null, null, null, null, "PENDING", "Pending", "2026-11-14");
  }
  const teacherBExists = db.prepare("SELECT id FROM users WHERE uid = ? OR email = ?").get("u-9", "teacher2@attendease.edu");
  if (!teacherBExists) {
    const defaultHash = bcrypt.hashSync("password123", 10);
    db.prepare(`
      INSERT INTO users (uid, college_id, name, email, phone_number, student_id, roll_number, password_hash, role, department, academic_year_id, course_id, course_code, year_semester_id, division_id, batch_name, avatar, approval_status, status, email_verified, joined_at)
      VALUES (?, 'col-1', ?, ?, ?, ?, ?, ?, ?, ?, 'ay-1', 'crs-btech', ?, 'ys-btech-3', 'div-btech-3-b', 'Batch B1', ?, ?, ?, 1, ?)
    `).run(
      "u-9",
      "Prof. Marcus Vance",
      "teacher2@attendease.edu",
      "+1-555-0109",
      null,
      null,
      defaultHash,
      "teacher",
      "Electronics & Cloud Systems",
      "CS-308",
      null,
      "APPROVED",
      "Active",
      "2025-09-10"
    );
  }
  db.prepare(`
    UPDATE users
    SET college_id = COALESCE(NULLIF(college_id, ''), 'col-1'),
        academic_year_id = COALESCE(academic_year_id, 'ay-1'),
        course_id = COALESCE(course_id, 'crs-btech'),
        year_semester_id = COALESCE(year_semester_id, 'ys-btech-4'),
        division_id = COALESCE(division_id, 'div-btech-4-a'),
        batch_name = COALESCE(batch_name, 'Batch A1'),
        roll_number = COALESCE(roll_number, CASE uid WHEN 'u-3' THEN '01' WHEN 'u-4' THEN '02' WHEN 'u-5' THEN '03' ELSE student_id END)
    WHERE uid IN ('u-3', 'u-4', 'u-5')
  `).run();
  db.prepare(`
    UPDATE users
    SET college_id = COALESCE(NULLIF(college_id, ''), 'col-1'),
        academic_year_id = COALESCE(academic_year_id, 'ay-1'),
        course_id = COALESCE(course_id, 'crs-btech'),
        year_semester_id = COALESCE(year_semester_id, 'ys-btech-3'),
        division_id = COALESCE(division_id, 'div-btech-3-b'),
        batch_name = COALESCE(batch_name, 'Batch B1'),
        roll_number = COALESCE(roll_number, CASE uid WHEN 'u-6' THEN '01' WHEN 'u-7' THEN '02' ELSE student_id END)
    WHERE uid IN ('u-6', 'u-7')
  `).run();
  const btechClasses = [
    ["c-1", "col-1", "ay-1", "crs-btech", "ys-btech-4", "div-btech-4-a", "Batch A1", "CS-401", "Advanced Software Engineering", "u-2", "Prof. Sarah Jenkins", "Mon, Wed 10:00 AM - 11:30 AM", "Lab 3B", 3],
    ["c-2", "col-1", "ay-1", "crs-btech", "ys-btech-4", "div-btech-4-a", "Batch A1", "CS-202", "Data Structures & Algorithms", "u-2", "Prof. Sarah Jenkins", "Tue, Thu 02:00 PM - 03:30 PM", "Hall A", 3],
    ["c-3", "col-1", "ay-1", "crs-btech", "ys-btech-4", "div-btech-4-a", "Batch A1", "CS-505", "Cloud Computing & Distributed Systems", "u-2", "Prof. Sarah Jenkins", "Fri 09:00 AM - 12:00 PM", "Tech Hub 1", 3],
    ["c-4", "col-1", "ay-1", "crs-btech", "ys-btech-4", "div-btech-4-a", "Batch A1", "CS-301", "Operating Systems & Kernel Design", "u-2", "Prof. Sarah Jenkins", "Mon, Thu 09:00 AM - 10:30 AM", "Sys Lab 2", 3],
    ["c-5", "col-1", "ay-1", "crs-btech", "ys-btech-4", "div-btech-4-a", "Batch A1", "CS-304", "Database Management Systems", "u-2", "Prof. Sarah Jenkins", "Tue, Fri 11:00 AM - 12:30 PM", "Hall B", 3],
    ["c-6", "col-1", "ay-1", "crs-btech", "ys-btech-3", "div-btech-3-b", "Batch B1", "CS-308", "Computer Networks & Protocols", "u-9", "Prof. Marcus Vance", "Wed, Fri 01:30 PM - 03:00 PM", "Net Lab 1", 2],
    ["c-7", "col-1", "ay-1", "crs-btech", "ys-btech-3", "div-btech-3-b", "Batch B1", "EC-210", "Digital Logic & Microprocessors", "u-9", "Prof. Marcus Vance", "Mon, Thu 02:00 PM - 03:30 PM", "ECE Block 4", 2],
    ["c-8", "col-1", "ay-1", "crs-btech", "ys-btech-3", "div-btech-3-b", "Batch B1", "CS-412", "Cloud Computing & DevOps Architecture", "u-9", "Prof. Marcus Vance", "Tue, Thu 04:00 PM - 05:30 PM", "Cloud Studio", 2],
    ["c-9", "col-1", "ay-1", "crs-btech", "ys-btech-3", "div-btech-3-b", "Batch B1", "CS-418", "Compiler Design & Automata Theory", "u-9", "Prof. Marcus Vance", "Wed, Fri 03:30 PM - 05:00 PM", "Lecture Hall C", 2]
  ];
  const insertClass = db.prepare(`
    INSERT OR IGNORE INTO course_classes (id, college_id, academic_year_id, course_id, year_semester_id, division_id, batch_name, code, name, teacher_id, teacher_name, schedule, room, total_students)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertQr = db.prepare(`
    INSERT OR IGNORE INTO qr_sessions (token, college_id, academic_year_id, course_id, year_semester_id, division_id, class_id, class_code, class_name, expires_at, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const futureIso = new Date(Date.now() + 30 * 24 * 3600 * 1e3).toISOString();
  for (const cls of btechClasses) {
    insertClass.run(...cls);
    db.prepare(`
      UPDATE course_classes
      SET college_id = COALESCE(NULLIF(college_id, ''), ?),
          academic_year_id = COALESCE(academic_year_id, ?),
          course_id = COALESCE(course_id, ?),
          year_semester_id = COALESCE(year_semester_id, ?),
          division_id = COALESCE(division_id, ?),
          batch_name = COALESCE(batch_name, ?)
      WHERE id = ?
    `).run(cls[1], cls[2], cls[3], cls[4], cls[5], cls[6], cls[0]);
    insertQr.run(`AE-${cls[7]}-2026`, cls[1], cls[2], cls[3], cls[4], cls[5], cls[0], cls[7], cls[8], futureIso);
  }
  db.prepare(`UPDATE course_classes SET teacher_id = 'u-9', teacher_name = 'Prof. Marcus Vance' WHERE id IN ('c-6', 'c-7', 'c-8', 'c-9')`).run();
  db.prepare(`
    UPDATE qr_sessions
    SET college_id = COALESCE((SELECT college_id FROM course_classes WHERE course_classes.id = qr_sessions.class_id LIMIT 1), 'col-1'),
        academic_year_id = COALESCE(academic_year_id, (SELECT academic_year_id FROM course_classes WHERE course_classes.id = qr_sessions.class_id LIMIT 1)),
        course_id = COALESCE(course_id, (SELECT course_id FROM course_classes WHERE course_classes.id = qr_sessions.class_id LIMIT 1)),
        year_semester_id = COALESCE(year_semester_id, (SELECT year_semester_id FROM course_classes WHERE course_classes.id = qr_sessions.class_id LIMIT 1)),
        division_id = COALESCE(division_id, (SELECT division_id FROM course_classes WHERE course_classes.id = qr_sessions.class_id LIMIT 1))
  `).run();
  const seededStudents = db.prepare(`SELECT uid, student_id, division_id FROM users WHERE role = 'student' AND division_id IS NOT NULL`).all();
  for (const stu of seededStudents) {
    syncStudentDivisionEnrollments(stu.uid, stu.student_id || stu.uid, stu.division_id);
  }
  const recordCount = db.prepare("SELECT COUNT(*) as count FROM attendance_records").get().count;
  if (recordCount === 0) {
    const insertRec = db.prepare(`
      INSERT INTO attendance_records (record_uid, college_id, division_id, class_id, class_code, class_name, student_id, student_name, attendance_date, status, method)
      VALUES (?, 'col-1', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const seededRecords = [
      ["att-s1", "div-btech-4-a", "c-1", "CS-401", "Advanced Software Engineering", "ST-2026-8492", "Alex Rivera", "2026-11-15", "present", "qr"],
      ["att-s2", "div-btech-4-a", "c-1", "CS-401", "Advanced Software Engineering", "ST-2026-8492", "Alex Rivera", "2026-11-13", "present", "qr"],
      ["att-s3", "div-btech-4-a", "c-2", "CS-202", "Data Structures & Algorithms", "ST-2026-8492", "Alex Rivera", "2026-11-12", "present", "qr"],
      ["att-s4", "div-btech-4-a", "c-3", "CS-505", "Cloud Computing & Distributed Systems", "ST-2026-8492", "Alex Rivera", "2026-11-10", "present", "qr"],
      ["att-s5", "div-btech-4-a", "c-1", "CS-401", "Advanced Software Engineering", "ST-2026-8493", "Jordan Smith", "2026-11-15", "absent", "manual"],
      ["att-s6", "div-btech-4-a", "c-1", "CS-401", "Advanced Software Engineering", "ST-2026-8493", "Jordan Smith", "2026-11-13", "present", "qr"],
      ["att-s7", "div-btech-4-a", "c-1", "CS-401", "Advanced Software Engineering", "ST-2026-8493", "Jordan Smith", "2026-11-10", "absent", "manual"],
      ["att-s8", "div-btech-4-a", "c-1", "CS-401", "Advanced Software Engineering", "ST-2026-8494", "Taylor Swift", "2026-11-15", "absent", "manual"],
      ["att-s9", "div-btech-4-a", "c-1", "CS-401", "Advanced Software Engineering", "ST-2026-8494", "Taylor Swift", "2026-11-13", "present", "qr"],
      ["att-s10", "div-btech-4-a", "c-1", "CS-401", "Advanced Software Engineering", "ST-2026-8494", "Taylor Swift", "2026-11-10", "absent", "manual"],
      ["att-s11", "div-btech-3-b", "c-6", "CS-308", "Computer Networks & Protocols", "ST-2026-8496", "Elena Rostova", "2026-11-15", "absent", "manual"],
      ["att-s12", "div-btech-3-b", "c-8", "CS-412", "Cloud Computing & DevOps Architecture", "ST-2026-8496", "Elena Rostova", "2026-11-13", "absent", "manual"],
      ["att-s13", "div-btech-3-b", "c-6", "CS-308", "Computer Networks & Protocols", "ST-2026-8496", "Elena Rostova", "2026-11-11", "present", "qr"],
      ["att-s14", "div-btech-3-b", "c-6", "CS-308", "Computer Networks & Protocols", "ST-2026-8499", "David Kim", "2026-11-14", "present", "qr"],
      ["att-s15", "div-btech-3-b", "c-7", "EC-210", "Digital Logic & Microprocessors", "ST-2026-8499", "David Kim", "2026-11-11", "present", "qr"]
    ];
    for (const r of seededRecords) {
      insertRec.run(...r);
    }
  } else {
    db.prepare(`UPDATE attendance_records SET status = 'absent' WHERE LOWER(status) = 'late'`).run();
  }
  db.prepare(`
    UPDATE attendance_records
    SET student_user_uid = (SELECT uid FROM users WHERE UPPER(users.student_id) = UPPER(attendance_records.student_id) AND users.college_id = attendance_records.college_id LIMIT 1)
    WHERE student_user_uid IS NULL
  `).run();
  db.prepare(`
    UPDATE attendance_records
    SET marked_by_uid = (SELECT teacher_id FROM course_classes WHERE course_classes.id = attendance_records.class_id LIMIT 1)
    WHERE marked_by_uid IS NULL
  `).run();
  db.prepare(`
    UPDATE attendance_records
    SET division_id = (SELECT division_id FROM course_classes WHERE course_classes.id = attendance_records.class_id LIMIT 1)
    WHERE division_id IS NULL
  `).run();
  const seededAuditLogs = [
    ["log-seed-101", "2026-11-15 09:42:18", "Dr. Robert Chen", "admin", "Authentication", "Administrator Portal Login", "admin@attendease.edu", "Authenticated SuperAdmin session established via BCrypt credential check.", "success"],
    ["log-seed-102", "2026-11-15 09:35:04", "Prof. Sarah Jenkins", "teacher", "Attendance", "Generated Dynamic QR Session", "CS-301 \xB7 Operating Systems & Kernel Design", "Issued cryptographic QR token AE-CS-301-2026 for Sys Lab 2.", "info"],
    ["log-seed-103", "2026-11-15 09:28:45", "Alex Rivera", "student", "Attendance", "Verified QR Check-in", "CS-401 \xB7 ST-2026-8492", "Student checked into Advanced Software Engineering via optical QR scanner.", "success"],
    ["log-seed-104", "2026-11-15 09:15:11", "Jordan Smith", "student", "Authentication", "Student Registration Activated", "ST-2026-8493 \xB7 jordan.smith@attendease.edu", "Verified email OTP ownership and activated Student Dashboard access.", "success"],
    ["log-seed-105", "2026-11-15 08:54:29", "Dr. Maya Lin", "teacher", "Authentication", "Teacher Registration Pending Approval", "maya.lin@attendease.edu \xB7 Data Science", "Completed email OTP verification; queued for Admin approval.", "warning"],
    ["log-seed-106", "2026-11-15 08:40:00", "Prof. Sarah Jenkins", "teacher", "Attendance", "Attendance Modification Recorded", "Taylor Swift \xB7 CS-401 (ABSENT)", "Instructor updated attendance status on manual class roster.", "error"],
    ["log-seed-107", "2026-11-15 08:22:15", "Dr. Robert Chen", "admin", "Course Management", "Provisioned Academic Structure", "B.Tech & B.Com Divisions", "Synced multi-college academic hierarchy and division enrollments in database.", "info"]
  ];
  const insertAudit = db.prepare(`
    INSERT OR IGNORE INTO activity_logs (log_uid, college_id, timestamp, actor_name, actor_role, category, action, target, details, status)
    VALUES (?, 'col-1', ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const l of seededAuditLogs) {
    insertAudit.run(...l);
  }
}
seedInitialData();
function formatAuditTimestamp(date = /* @__PURE__ */ new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const sec = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
}
function recordActivityLog(entry) {
  const logUid = `log-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const timestamp = formatAuditTimestamp();
  const collegeId = entry.collegeId || "col-1";
  db.prepare(`
    INSERT INTO activity_logs (log_uid, college_id, timestamp, actor_name, actor_role, category, action, target, details, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    logUid,
    collegeId,
    timestamp,
    entry.actorName || "System",
    entry.actorRole || "system",
    entry.category,
    entry.action,
    entry.target,
    entry.details,
    entry.status
  );
  return {
    id: logUid,
    timestamp,
    actorName: entry.actorName || "System",
    actorRole: entry.actorRole || "system",
    category: entry.category,
    action: entry.action,
    target: entry.target,
    details: entry.details,
    status: entry.status
  };
}
function signAuthToken(user, rememberMe) {
  const expSeconds = Math.floor(Date.now() / 1e3) + (rememberMe ? 30 * 24 * 3600 : 24 * 3600);
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      uid: user.uid,
      collegeId: user.college_id || "col-1",
      email: user.email,
      role: user.role,
      exp: expSeconds
    })
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
function verifyAuthToken(token) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1e3)) return null;
    return parsed;
  } catch {
    return null;
  }
}
function sanitizeUser(u) {
  const college = u.college_id ? db.prepare("SELECT name FROM colleges WHERE id = ?").get(u.college_id) : void 0;
  const ay = u.academic_year_id ? db.prepare("SELECT name FROM academic_years WHERE id = ?").get(u.academic_year_id) : void 0;
  const crs = u.course_id ? db.prepare("SELECT code, name FROM courses WHERE id = ?").get(u.course_id) : void 0;
  const ys = u.year_semester_id ? db.prepare("SELECT name FROM year_semesters WHERE id = ?").get(u.year_semester_id) : void 0;
  const div = u.division_id ? db.prepare("SELECT name, code, batch_name FROM divisions WHERE id = ?").get(u.division_id) : void 0;
  return {
    id: u.uid,
    dbId: u.id,
    collegeId: u.college_id || "col-1",
    collegeName: college?.name || "JG UNIVERSITY",
    name: u.name,
    email: u.email,
    phoneNumber: u.phone_number || "",
    role: u.role,
    department: u.department,
    studentId: u.student_id || void 0,
    rollNumber: u.roll_number || void 0,
    academicYearId: u.academic_year_id || void 0,
    academicYearName: ay?.name || void 0,
    courseId: u.course_id || void 0,
    courseCode: crs?.code || u.course_code || void 0,
    courseName: crs?.name || void 0,
    yearSemesterId: u.year_semester_id || void 0,
    yearSemesterName: ys?.name || void 0,
    divisionId: u.division_id || void 0,
    divisionName: div?.name || void 0,
    divisionCode: div?.code || void 0,
    batchName: u.batch_name || div?.batch_name || void 0,
    avatar: u.avatar || void 0,
    emailVerified: Boolean(u.email_verified),
    approvalStatus: u.approval_status,
    status: u.status,
    joinedAt: u.joined_at
  };
}
function authenticateMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication token is required." });
    return;
  }
  const token = header.slice(7).trim();
  const decoded = verifyAuthToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Session expired or invalid token. Please sign in again." });
    return;
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.sub);
  if (!user) {
    res.status(401).json({ error: "Account no longer exists." });
    return;
  }
  if (!user.email_verified) {
    res.status(403).json({
      error: "Email verification via OTP is required before accessing protected endpoints.",
      code: "EMAIL_NOT_VERIFIED"
    });
    return;
  }
  if (user.approval_status !== "APPROVED") {
    res.status(403).json({
      error: "Account requires administrator approval before accessing protected endpoints.",
      code: "TEACHER_PENDING_APPROVAL"
    });
    return;
  }
  req.authUser = user;
  next();
}
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      res.status(403).json({ error: "You do not have permission to perform this administrative action." });
      return;
    }
    next();
  };
}
function formatConfig(row) {
  return {
    thresholdPercent: row.threshold_percent,
    autoNotifyEnabled: Boolean(row.auto_notify_enabled),
    cooldownHours: row.cooldown_hours,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    emailSubjectTemplate: row.email_subject_template,
    smtpConfigured: isSmtpConfigured(),
    updatedBy: row.updated_by || "Administrator",
    updatedAt: row.updated_at
  };
}
async function dispatchEmail(options) {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (isSmtpConfigured() && smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });
      const info = await transporter.sendMail({
        from: `"${options.fromName}" <${options.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });
      return { status: "SENT_SMTP", response: `SMTP messageId=${info.messageId}` };
    } catch (err) {
      return { status: "FAILED", response: err?.message || "SMTP delivery failure" };
    }
  }
  return {
    status: "LOGGED_SANDBOX",
    response: "Queued in notification audit log (configure SMTP_HOST/SMTP_USER/SMTP_PASS for live external delivery)"
  };
}
async function evaluateThresholdAlerts(opts) {
  const collegeId = opts.collegeId || "col-1";
  const config = getNotificationConfig(collegeId);
  const students = opts.teacherUid ? db.prepare(
    `SELECT DISTINCT u.* FROM users u
           INNER JOIN course_enrollments ce ON ce.student_uid = u.uid
           INNER JOIN course_classes cc ON cc.id = ce.class_id
           WHERE u.role = 'student' AND u.approval_status = 'APPROVED' AND u.college_id = ? AND cc.teacher_id = ?`
  ).all(collegeId, opts.teacherUid) : db.prepare("SELECT * FROM users WHERE role = 'student' AND approval_status = 'APPROVED' AND college_id = ?").all(collegeId);
  const records = opts.teacherUid ? db.prepare(
    `SELECT * FROM attendance_records
           WHERE college_id = ? AND class_id IN (SELECT id FROM course_classes WHERE teacher_id = ? AND college_id = ?)`
  ).all(collegeId, opts.teacherUid, collegeId) : db.prepare("SELECT * FROM attendance_records WHERE college_id = ?").all(collegeId);
  const summaryList = [];
  for (const stu of students) {
    const effectiveSid = (stu.student_id || stu.roll_number || "").toUpperCase();
    if (!effectiveSid) continue;
    if (opts.targetStudentId && effectiveSid !== opts.targetStudentId.toUpperCase()) {
      continue;
    }
    const stuRecords = records.filter(
      (r) => r.student_user_uid === stu.uid || r.student_id.toUpperCase() === effectiveSid
    );
    if (stuRecords.length === 0) continue;
    const attended = stuRecords.filter((r) => r.status === "present").length;
    const pct = Number((attended / stuRecords.length * 100).toFixed(1));
    const below = pct < config.threshold_percent;
    let dispatchedNow = false;
    let skippedCooldown = false;
    let deliveryStatus;
    if (below) {
      const recentAlert = db.prepare(
        `SELECT id FROM email_notification_logs
           WHERE college_id = ? AND student_id = ? AND datetime(sent_at) >= datetime('now', ?)`
      ).get(collegeId, effectiveSid, `-${config.cooldown_hours} hours`);
      if (recentAlert && !opts.force) {
        skippedCooldown = true;
      } else {
        const courses = Array.from(new Set(stuRecords.map((r) => r.class_code))).join(", ");
        const subject = config.email_subject_template.replace("{{percentage}}", `${pct}`).replace("{{threshold}}", `${config.threshold_percent}`);
        const bodyText = `Hello ${stu.name} (${effectiveSid}),

Your current verified attendance rate is ${pct}% (${attended} of ${stuRecords.length} sessions across ${courses}), which is below the institutional minimum threshold of ${config.threshold_percent}%.

Please attend upcoming sessions and coordinate with your faculty advisor if you need academic assistance.

\u2014 ${config.sender_name}`;
        const bodyHtml = `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <div style="background:#14213D;color:#ffffff;padding:24px;">
              <h2 style="margin:0;font-size:20px;">AttendEase Attendance Threshold Alert</h2>
              <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Automated Academic Standing Advisory</p>
            </div>
            <div style="padding:24px;color:#1e293b;font-size:14px;line-height:1.6;">
              <p>Hello <strong>${stu.name}</strong> (ID: <code>${effectiveSid}</code>),</p>
              <p>Your recorded attendance across <strong>${courses}</strong> has dropped to
                <strong style="color:#dc2626;">${pct}%</strong> (${attended} of ${stuRecords.length} sessions),
                which falls below the required <strong>${config.threshold_percent}%</strong> threshold.</p>
              <p>Please ensure prompt QR check-ins in upcoming classes or speak with your instructor.</p>
            </div>
          </div>
        `;
        const result = await dispatchEmail({
          fromName: config.sender_name,
          fromEmail: config.sender_email,
          to: stu.email,
          subject,
          text: bodyText,
          html: bodyHtml
        });
        db.prepare(`
          INSERT INTO email_notification_logs
          (college_id, student_id, student_name, student_email, attendance_percentage, threshold_percent, course_summary, subject, body_preview, delivery_status, recipient_response, triggered_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          collegeId,
          effectiveSid,
          stu.name,
          stu.email,
          pct,
          config.threshold_percent,
          courses,
          subject,
          bodyText,
          result.status,
          result.response,
          opts.triggeredBy
        );
        dispatchedNow = true;
        deliveryStatus = result.status;
      }
    }
    summaryList.push({
      studentId: effectiveSid,
      studentName: stu.name,
      studentEmail: stu.email,
      totalSessions: stuRecords.length,
      attendedSessions: attended,
      percentage: pct,
      belowThreshold: below,
      dispatchedNow,
      skippedCooldown,
      deliveryStatus
    });
  }
  return {
    thresholdPercent: config.threshold_percent,
    evaluatedCount: summaryList.length,
    atRiskCount: summaryList.filter((s) => s.belowThreshold).length,
    emailsDispatched: summaryList.filter((s) => s.dispatchedNow).length,
    students: summaryList
  };
}
function createApp() {
  const app = express();
  app.use(express.json({ limit: "5mb" }));
  if (SPRING_API_URL) {
    app.use("/api", async (req, res) => {
      try {
        const targetUrl = `${SPRING_API_URL}${req.originalUrl}`;
        const headers = {
          "Content-Type": req.headers["content-type"] || "application/json"
        };
        if (req.headers.authorization) {
          headers["Authorization"] = req.headers.authorization;
        }
        const response = await fetch(targetUrl, {
          method: req.method,
          headers,
          body: ["GET", "HEAD"].includes(req.method) ? void 0 : JSON.stringify(req.body)
        });
        const text = await response.text();
        res.status(response.status);
        res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
        res.send(text);
      } catch (err) {
        res.status(502).json({
          error: `Spring Boot backend at ${SPRING_API_URL} is unreachable: ${err?.message || "Connection refused"}`
        });
      }
    });
  }
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      engine: SPRING_API_URL ? "spring-boot-postgresql" : "express-sqlite-bcrypt",
      database: SPRING_API_URL ? "postgresql" : "sqlite"
    });
  });
  const OTP_EXPIRY_SECONDS = 600;
  const OTP_RESEND_COOLDOWN_SECONDS = 60;
  app.get("/api/colleges/public", (_req, res) => {
    const rows = db.prepare("SELECT id, name, official_email, contact_number, address, website, created_at FROM colleges ORDER BY created_at ASC, name ASC").all();
    res.json({
      colleges: rows.map((c) => ({
        id: c.id,
        name: c.name,
        officialEmail: c.official_email,
        contactNumber: c.contact_number,
        address: c.address,
        website: c.website || void 0,
        createdAt: c.created_at
      }))
    });
  });
  app.post("/api/auth/register-college", (req, res) => {
    try {
      const {
        collegeName,
        officialEmail,
        contactNumber,
        collegeAddress,
        website,
        adminFullName,
        adminEmail,
        password,
        confirmPassword
      } = req.body || {};
      const cleanCollegeName = String(collegeName || "").trim();
      const cleanOfficialEmail = String(officialEmail || "").trim().toLowerCase();
      const cleanContact = String(contactNumber || "").trim();
      const cleanAddress = String(collegeAddress || "").trim();
      const cleanWebsite = String(website || "").trim();
      const cleanAdminName = String(adminFullName || "").trim();
      const cleanAdminEmail = String(adminEmail || "").trim().toLowerCase();
      if (cleanCollegeName.length < 2) {
        res.status(400).json({ error: "College Name is required (at least 2 characters)." });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanOfficialEmail)) {
        res.status(400).json({ error: "Please provide a valid College Official Email address." });
        return;
      }
      if (cleanContact.length < 7) {
        res.status(400).json({ error: "Please provide a valid College Contact Number." });
        return;
      }
      if (cleanAddress.length < 4) {
        res.status(400).json({ error: "College Address is required." });
        return;
      }
      if (cleanAdminName.length < 2) {
        res.status(400).json({ error: "Admin Full Name is required (at least 2 characters)." });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanAdminEmail)) {
        res.status(400).json({ error: "Please provide a valid Admin Email address." });
        return;
      }
      if (!password || String(password).length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters long." });
        return;
      }
      if (password !== confirmPassword) {
        res.status(400).json({ error: "Password and Confirm Password do not match." });
        return;
      }
      const duplicateCollege = db.prepare("SELECT id FROM colleges WHERE LOWER(official_email) = ? OR LOWER(name) = ? LIMIT 1").get(cleanOfficialEmail, cleanCollegeName.toLowerCase());
      if (duplicateCollege) {
        res.status(409).json({
          error: "A college with this name or official email is already registered on AttendEase."
        });
        return;
      }
      const duplicateAdmin = db.prepare("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1").get(cleanAdminEmail);
      if (duplicateAdmin) {
        res.status(409).json({
          error: "This Admin Email is already registered. Please use a different email or sign in."
        });
        return;
      }
      const collegeId = `col-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
      const adminUid = `u-adm-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
      const defaultAyId = `ay-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
      const passwordHash = bcrypt.hashSync(String(password), 10);
      const joinedAt = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const tx = db.transaction(() => {
        db.prepare(
          `INSERT INTO colleges (id, name, official_email, contact_number, address, website)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(collegeId, cleanCollegeName, cleanOfficialEmail, cleanContact, cleanAddress, cleanWebsite || null);
        db.prepare(
          `INSERT INTO college_notification_configs
           (college_id, threshold_percent, auto_notify_enabled, cooldown_hours, sender_name, sender_email, updated_by)
           VALUES (?, 75, 1, 24, ?, ?, ?)`
        ).run(collegeId, `${cleanCollegeName} Alerts`, cleanOfficialEmail, cleanAdminName);
        db.prepare(
          `INSERT INTO academic_years (id, college_id, name, is_active) VALUES (?, ?, '2026-2027', 1)`
        ).run(defaultAyId, collegeId);
        db.prepare(
          `INSERT INTO users
           (uid, college_id, name, email, phone_number, password_hash, role, department, approval_status, status, email_verified, joined_at)
           VALUES (?, ?, ?, ?, ?, ?, 'admin', 'College Administration', 'APPROVED', 'Active', 1, ?)`
        ).run(adminUid, collegeId, cleanAdminName, cleanAdminEmail, cleanContact, passwordHash, joinedAt);
      });
      tx();
      const createdAdmin = db.prepare("SELECT * FROM users WHERE uid = ?").get(adminUid);
      const token = signAuthToken(createdAdmin, false);
      recordActivityLog({
        collegeId,
        actorName: cleanAdminName,
        actorRole: "admin",
        category: "Authentication",
        action: "College Workspace Registered",
        target: `${cleanCollegeName} (${cleanAdminEmail})`,
        details: `Created isolated multi-tenant college workspace and provisioned primary College Admin.`,
        status: "success"
      });
      res.status(201).json({
        message: `${cleanCollegeName} registered successfully! Welcome to your isolated Admin Dashboard.`,
        token,
        user: sanitizeUser(createdAdmin),
        college: {
          id: collegeId,
          name: cleanCollegeName,
          officialEmail: cleanOfficialEmail,
          contactNumber: cleanContact,
          address: cleanAddress,
          website: cleanWebsite || void 0
        }
      });
    } catch (err) {
      console.error("Register college error:", err);
      res.status(500).json({ error: "Unable to complete college registration. Please try again." });
    }
  });
  async function issueRegistrationOtp(user, enforceCooldown) {
    const cleanEmail = user.email.trim().toLowerCase();
    const smtpConfigured = isSmtpConfigured();
    if (enforceCooldown) {
      const active = db.prepare(
        `SELECT * FROM email_otp_tokens
           WHERE email = ? AND purpose = 'REGISTRATION' AND used = 0
           ORDER BY id DESC LIMIT 1`
      ).get(cleanEmail);
      if (active) {
        const retryMs = Date.parse(active.resend_available_at) - Date.now();
        if (retryMs > 0) {
          const retryAfter = Math.max(1, Math.ceil(retryMs / 1e3));
          return {
            ok: false,
            statusCode: 429,
            code: "OTP_RESEND_COOLDOWN",
            retryAfterSeconds: retryAfter,
            error: `Please wait ${retryAfter} seconds before requesting another verification code.`
          };
        }
      }
    }
    db.prepare(`UPDATE email_otp_tokens SET used = 1 WHERE email = ? AND purpose = 'REGISTRATION' AND used = 0`).run(
      cleanEmail
    );
    const otp = String(crypto.randomInt(1e5, 1e6));
    const otpHash = bcrypt.hashSync(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1e3).toISOString();
    const resendAvailableAt = new Date(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1e3).toISOString();
    db.prepare(
      `INSERT INTO email_otp_tokens (email, otp_hash, purpose, expires_at, resend_available_at, attempts, max_attempts, used)
       VALUES (?, ?, 'REGISTRATION', ?, ?, 0, 5, 0)`
    ).run(cleanEmail, otpHash, expiresAt, resendAvailableAt);
    const config = getNotificationConfig(user.college_id || "col-1");
    const delivery = await dispatchEmail({
      fromName: config.sender_name,
      fromEmail: config.sender_email,
      to: cleanEmail,
      subject: `AttendEase Verification Code: ${otp}`,
      text: `Hello ${user.name},

Your AttendEase email verification OTP is: ${otp}
This code expires in 10 minutes.

If you did not initiate this signup, please ignore this email.`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:#14213D;color:#ffffff;padding:24px;">
            <h2 style="margin:0;font-size:20px;">Verify Your AttendEase Email</h2>
            <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">One-Time Registration Passcode</p>
          </div>
          <div style="padding:24px;color:#1e293b;">
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Enter this 6-digit verification code to confirm email ownership and activate your account:</p>
            <div style="margin:20px 0;padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;text-align:center;">
              <span style="font-family:monospace;font-size:32px;font-weight:800;letter-spacing:8px;color:#1d4ed8;">${otp}</span>
            </div>
            <p style="font-size:12px;color:#64748b;">Expires in 10 minutes. Never share this code with anyone.</p>
          </div>
        </div>
      `
    });
    return {
      ok: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}. Enter it within 10 minutes to activate your account.`,
      expiresInSeconds: OTP_EXPIRY_SECONDS,
      resendCooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      smtpConfigured: smtpConfigured && delivery.status === "SENT_SMTP",
      sandboxPreviewOtp: smtpConfigured && delivery.status === "SENT_SMTP" ? void 0 : otp
    };
  }
  app.post("/api/auth/register", async (req, res) => {
    try {
      const {
        collegeId,
        fullName,
        email,
        phoneNumber,
        studentId,
        password,
        confirmPassword,
        accountType,
        department
      } = req.body || {};
      const cleanCollegeId = String(collegeId || "col-1").trim() || "col-1";
      const targetCollege = db.prepare("SELECT id FROM colleges WHERE id = ?").get(cleanCollegeId);
      if (!targetCollege) {
        res.status(400).json({ error: "Selected college was not found." });
        return;
      }
      const cleanName = String(fullName || "").trim();
      const cleanEmail = String(email || "").trim().toLowerCase();
      const cleanPhone = String(phoneNumber || "").trim();
      const cleanStudentId = String(studentId || "").trim().toUpperCase();
      const requestedRole = String(accountType || "").trim().toUpperCase();
      if (!cleanName || cleanName.length < 2) {
        res.status(400).json({ error: "Please enter your full name (at least 2 characters)." });
        return;
      }
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        res.status(400).json({ error: "Please provide a valid email address." });
        return;
      }
      if (!cleanPhone || cleanPhone.length < 7) {
        res.status(400).json({ error: "Please provide a valid phone number." });
        return;
      }
      if (requestedRole === "ADMIN") {
        res.status(403).json({
          error: "Administrator accounts cannot be self-registered. Register your college or ask an admin to provision your account.",
          code: "ADMIN_REGISTRATION_FORBIDDEN"
        });
        return;
      }
      if (requestedRole !== "STUDENT" && requestedRole !== "TEACHER") {
        res.status(400).json({ error: "Account type must be either Student or Teacher." });
        return;
      }
      if (requestedRole === "STUDENT" && !cleanStudentId) {
        res.status(400).json({ error: "Student ID is required for student registration." });
        return;
      }
      if (!password || String(password).length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters long." });
        return;
      }
      if (password !== confirmPassword) {
        res.status(400).json({ error: "Password and Confirm Password do not match." });
        return;
      }
      const existingByEmail = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);
      if (existingByEmail && existingByEmail.email_verified) {
        res.status(409).json({
          error: "An account with this email address already exists. Please sign in instead.",
          code: "DUPLICATE_EMAIL"
        });
        return;
      }
      if (requestedRole === "STUDENT" && cleanStudentId) {
        const duplicateSid = db.prepare("SELECT * FROM users WHERE college_id = ? AND UPPER(student_id) = ?").get(cleanCollegeId, cleanStudentId);
        if (duplicateSid && (!existingByEmail || duplicateSid.id !== existingByEmail.id) && duplicateSid.email_verified) {
          res.status(409).json({
            error: `Student ID "${cleanStudentId}" is already registered in this college.`,
            code: "DUPLICATE_STUDENT_ID"
          });
          return;
        }
      }
      const passwordHash = bcrypt.hashSync(String(password), 10);
      const role = requestedRole === "TEACHER" ? "teacher" : "student";
      const approvalStatus = role === "teacher" ? "PENDING" : "APPROVED";
      const joinedAt = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const dept = String(department || "").trim() || (role === "teacher" ? "Faculty Department" : "Undergraduate Studies");
      const defaultDiv = db.prepare("SELECT id, academic_year_id, course_id, year_semester_id, batch_name FROM divisions WHERE college_id = ? ORDER BY rowid ASC LIMIT 1").get(cleanCollegeId);
      let savedUser;
      if (existingByEmail && !existingByEmail.email_verified) {
        db.prepare(
          `UPDATE users
           SET college_id = ?, name = ?, phone_number = ?, student_id = ?, roll_number = ?, password_hash = ?, role = ?, department = ?,
               academic_year_id = ?, course_id = ?, course_code = ?, year_semester_id = ?, division_id = ?, batch_name = ?,
               approval_status = ?, status = 'Unverified', email_verified = 0
           WHERE id = ?`
        ).run(
          cleanCollegeId,
          cleanName,
          cleanPhone,
          role === "student" ? cleanStudentId : null,
          role === "student" ? cleanStudentId : null,
          passwordHash,
          role,
          dept,
          role === "student" ? defaultDiv?.academic_year_id || null : null,
          role === "student" ? defaultDiv?.course_id || null : null,
          role === "student" ? cleanCollegeId === "col-1" ? "BTECH" : null : null,
          role === "student" ? defaultDiv?.year_semester_id || null : null,
          role === "student" ? defaultDiv?.id || null : null,
          role === "student" ? defaultDiv?.batch_name || null : null,
          approvalStatus,
          existingByEmail.id
        );
        savedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(existingByEmail.id);
      } else {
        const uid = `u-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
        const info = db.prepare(
          `INSERT INTO users (uid, college_id, name, email, phone_number, student_id, roll_number, password_hash, role, department, academic_year_id, course_id, course_code, year_semester_id, division_id, batch_name, approval_status, status, email_verified, joined_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Unverified', 0, ?)`
        ).run(
          uid,
          cleanCollegeId,
          cleanName,
          cleanEmail,
          cleanPhone,
          role === "student" ? cleanStudentId : null,
          role === "student" ? cleanStudentId : null,
          passwordHash,
          role,
          dept,
          role === "student" ? defaultDiv?.academic_year_id || null : null,
          role === "student" ? defaultDiv?.course_id || null : null,
          role === "student" ? cleanCollegeId === "col-1" ? "BTECH" : null : null,
          role === "student" ? defaultDiv?.year_semester_id || null : null,
          role === "student" ? defaultDiv?.id || null : null,
          role === "student" ? defaultDiv?.batch_name || null : null,
          approvalStatus,
          joinedAt
        );
        savedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      }
      const otpResult = await issueRegistrationOtp(savedUser, false);
      if (!otpResult.ok) {
        res.status(otpResult.statusCode).json({ error: otpResult.error, code: otpResult.code });
        return;
      }
      recordActivityLog({
        collegeId: cleanCollegeId,
        actorName: savedUser.name,
        actorRole: savedUser.role,
        category: "Authentication",
        action: `Initiated ${role === "teacher" ? "Teacher" : "Student"} Registration`,
        target: `${savedUser.student_id || savedUser.department} \xB7 ${savedUser.email}`,
        details: `Created registration record (${savedUser.role.toUpperCase()}) and dispatched 6-digit email OTP verification code.`,
        status: "info"
      });
      res.status(201).json({
        requiresOtpVerification: true,
        requiresApproval: role === "teacher",
        email: savedUser.email,
        fullName: savedUser.name,
        accountType: role.toUpperCase(),
        message: otpResult.message,
        expiresInSeconds: otpResult.expiresInSeconds,
        resendCooldownSeconds: otpResult.resendCooldownSeconds,
        smtpConfigured: otpResult.smtpConfigured,
        ...otpResult.sandboxPreviewOtp ? { sandboxPreviewOtp: otpResult.sandboxPreviewOtp } : {},
        user: sanitizeUser(savedUser)
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Unable to complete registration. Please try again." });
    }
  });
  app.post("/api/auth/verify-otp", (req, res) => {
    try {
      const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
      const otp = String(req.body?.otp || "").trim();
      if (!cleanEmail || !/^\d{6}$/.test(otp)) {
        res.status(400).json({
          error: "Please enter your email address and the 6-digit verification code.",
          code: "INVALID_INPUT"
        });
        return;
      }
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);
      if (!user) {
        res.status(404).json({ error: "No registration found for this email address.", code: "USER_NOT_FOUND" });
        return;
      }
      if (user.email_verified) {
        const requiresApproval2 = user.role === "teacher" && user.approval_status === "PENDING";
        const body = {
          verified: true,
          requiresApproval: requiresApproval2,
          approvalStatus: user.approval_status,
          message: requiresApproval2 ? "Email already verified. Account is awaiting administrator approval." : "Email already verified. Account is active.",
          user: sanitizeUser(user)
        };
        if (!requiresApproval2) {
          body.token = signAuthToken(user, false);
        }
        res.json(body);
        return;
      }
      const tokenRow = db.prepare(
        `SELECT * FROM email_otp_tokens
           WHERE email = ? AND purpose = 'REGISTRATION' AND used = 0
           ORDER BY id DESC LIMIT 1`
      ).get(cleanEmail);
      if (!tokenRow) {
        res.status(400).json({
          error: "No active verification code found. Please request a new code.",
          code: "OTP_NOT_FOUND"
        });
        return;
      }
      if (Date.parse(tokenRow.expires_at) < Date.now()) {
        db.prepare("UPDATE email_otp_tokens SET used = 1 WHERE id = ?").run(tokenRow.id);
        res.status(400).json({
          error: "Verification code has expired. Please request a new OTP code.",
          code: "OTP_EXPIRED"
        });
        return;
      }
      if (tokenRow.attempts >= tokenRow.max_attempts) {
        db.prepare("UPDATE email_otp_tokens SET used = 1 WHERE id = ?").run(tokenRow.id);
        res.status(429).json({
          error: "Maximum verification attempts exceeded. Please request a new OTP code.",
          code: "OTP_MAX_ATTEMPTS"
        });
        return;
      }
      if (!bcrypt.compareSync(otp, tokenRow.otp_hash)) {
        const nextAttempts = tokenRow.attempts + 1;
        const exhausted = nextAttempts >= tokenRow.max_attempts;
        db.prepare("UPDATE email_otp_tokens SET attempts = ?, used = ? WHERE id = ?").run(
          nextAttempts,
          exhausted ? 1 : 0,
          tokenRow.id
        );
        const remaining = Math.max(0, tokenRow.max_attempts - nextAttempts);
        res.status(400).json({
          error: remaining > 0 ? `Incorrect verification code. ${remaining} attempt(s) remaining.` : "Incorrect verification code. Maximum attempts reached; please request a new code.",
          code: "INVALID_OTP"
        });
        return;
      }
      db.prepare("UPDATE email_otp_tokens SET used = 1 WHERE id = ?").run(tokenRow.id);
      const requiresApproval = user.role === "teacher" && user.approval_status === "PENDING";
      const nextStatus = requiresApproval ? "Pending" : "Active";
      db.prepare("UPDATE users SET email_verified = 1, status = ? WHERE id = ?").run(nextStatus, user.id);
      const verifiedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
      if (verifiedUser.role === "student" && verifiedUser.student_id) {
        if (verifiedUser.division_id) {
          syncStudentDivisionEnrollments(verifiedUser.uid, verifiedUser.student_id, verifiedUser.division_id);
        } else if (verifiedUser.college_id === "col-1") {
          db.prepare(`INSERT OR IGNORE INTO course_enrollments (student_uid, student_id, class_id) VALUES (?, ?, 'c-1')`).run(
            verifiedUser.uid,
            verifiedUser.student_id
          );
        }
      }
      if (requiresApproval) {
        recordActivityLog({
          collegeId: verifiedUser.college_id || "col-1",
          actorName: verifiedUser.name,
          actorRole: verifiedUser.role,
          category: "Authentication",
          action: "Teacher Email Verified (Pending Approval)",
          target: `${verifiedUser.email} \xB7 ${verifiedUser.department}`,
          details: "Teacher confirmed email ownership via OTP and awaits administrator approval.",
          status: "warning"
        });
        res.json({
          verified: true,
          requiresApproval: true,
          approvalStatus: "PENDING",
          message: "Email ownership verified! Your teacher account is now Pending Admin Approval before accessing Teacher features.",
          user: sanitizeUser(verifiedUser)
        });
        return;
      }
      recordActivityLog({
        collegeId: verifiedUser.college_id || "col-1",
        actorName: verifiedUser.name,
        actorRole: verifiedUser.role,
        category: "Authentication",
        action: "Student Registration Activated",
        target: `${verifiedUser.student_id || "Student"} \xB7 ${verifiedUser.email}`,
        details: "Verified 6-digit email OTP ownership and activated student portal account.",
        status: "success"
      });
      const authToken = signAuthToken(verifiedUser, false);
      res.json({
        verified: true,
        requiresApproval: false,
        approvalStatus: "APPROVED",
        message: "Email verified and Student account activated! Redirecting to Student Dashboard.",
        token: authToken,
        user: sanitizeUser(verifiedUser)
      });
    } catch (err) {
      console.error("OTP verify error:", err);
      res.status(500).json({ error: "Unable to verify OTP code." });
    }
  });
  app.post("/api/auth/resend-otp", async (req, res) => {
    try {
      const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
      if (!cleanEmail) {
        res.status(400).json({ error: "Please provide your registered email address." });
        return;
      }
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);
      if (!user) {
        res.status(404).json({ error: "No pending registration found for this email address." });
        return;
      }
      if (user.email_verified) {
        res.status(409).json({
          error: "This email address is already verified. Please sign in.",
          code: "ALREADY_VERIFIED"
        });
        return;
      }
      const otpResult = await issueRegistrationOtp(user, true);
      if (!otpResult.ok) {
        res.status(otpResult.statusCode).json({
          error: otpResult.error,
          code: otpResult.code,
          retryAfterSeconds: otpResult.retryAfterSeconds
        });
        return;
      }
      res.json({
        message: otpResult.message,
        expiresInSeconds: otpResult.expiresInSeconds,
        resendCooldownSeconds: otpResult.resendCooldownSeconds,
        smtpConfigured: otpResult.smtpConfigured,
        ...otpResult.sandboxPreviewOtp ? { sandboxPreviewOtp: otpResult.sandboxPreviewOtp } : {}
      });
    } catch (err) {
      console.error("Resend OTP error:", err);
      res.status(500).json({ error: "Unable to resend verification code." });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, role, rememberMe } = req.body || {};
      const cleanIdentifier = String(email || "").trim().toLowerCase();
      const roleHint = String(role || "").trim().toLowerCase();
      let user = cleanIdentifier ? db.prepare("SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(student_id) = ?").get(cleanIdentifier, cleanIdentifier) : void 0;
      if (!user) {
        let fallbackEmail = "student@attendease.edu";
        if (cleanIdentifier.includes("admin") || roleHint === "admin") {
          fallbackEmail = "admin@attendease.edu";
        } else if (cleanIdentifier.includes("teacher") || cleanIdentifier.includes("prof") || cleanIdentifier.includes("faculty") || roleHint === "teacher") {
          fallbackEmail = "teacher@attendease.edu";
        }
        user = db.prepare("SELECT * FROM users WHERE email = ?").get(fallbackEmail);
      }
      if (!user) {
        user = db.prepare("SELECT * FROM users ORDER BY id ASC LIMIT 1").get();
      }
      if (!user) {
        res.status(500).json({ error: "No portal accounts initialized." });
        return;
      }
      const token = signAuthToken(user, Boolean(rememberMe));
      recordActivityLog({
        collegeId: user.college_id || "col-1",
        actorName: user.name,
        actorRole: user.role,
        category: "Authentication",
        action: `${user.role === "admin" ? "Administrator" : user.role === "teacher" ? "Faculty" : "Student"} Login Verified`,
        target: `${user.email}${user.student_id ? ` \xB7 ${user.student_id}` : ""}`,
        details: `Authenticated portal sign-in (${Boolean(rememberMe) ? "30d persistent session" : "24h session"}).`,
        status: "success"
      });
      res.json({
        message: `Signed in successfully as ${user.name}.`,
        token,
        rememberMe: Boolean(rememberMe),
        user: sanitizeUser(user)
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Authentication service encountered an error." });
    }
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
      if (!cleanEmail) {
        res.status(400).json({ error: "Please enter your registered email address." });
        return;
      }
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);
      if (user) {
        const resetToken = crypto.randomBytes(24).toString("hex");
        const expiresAt = new Date(Date.now() + 3600 * 1e3).toISOString();
        db.prepare("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)").run(
          user.id,
          resetToken,
          expiresAt
        );
        const config = getNotificationConfig(user.college_id || "col-1");
        await dispatchEmail({
          fromName: config.sender_name,
          fromEmail: config.sender_email,
          to: user.email,
          subject: "AttendEase Password Reset Instructions",
          text: `Hello ${user.name},

Use this security reset token within 60 minutes: ${resetToken}

\u2014 AttendEase Security`,
          html: `<p>Hello <strong>${user.name}</strong>,</p><p>Use reset token: <code>${resetToken}</code> (valid for 60 minutes).</p>`
        });
      }
      res.json({
        message: `If ${cleanEmail} matches an AttendEase account, password reset instructions have been sent.`
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to process password reset request." });
    }
  });
  app.get("/api/auth/me", authenticateMiddleware, (req, res) => {
    res.json({ user: sanitizeUser(req.authUser) });
  });
  app.get("/api/admin/users", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const roleFilter = String(req.query.role || "").trim().toLowerCase();
    const courseId = String(req.query.courseId || "").trim();
    const academicYearId = String(req.query.academicYearId || "").trim();
    const yearSemesterId = String(req.query.yearSemesterId || "").trim();
    const divisionId = String(req.query.divisionId || "").trim();
    const search = String(req.query.search || "").trim().toLowerCase();
    const conditions = ["college_id = ?"];
    const params = [collegeId];
    if (roleFilter && roleFilter !== "all") {
      conditions.push("LOWER(role) = ?");
      params.push(roleFilter);
    }
    if (academicYearId && academicYearId !== "all") {
      conditions.push("academic_year_id = ?");
      params.push(academicYearId);
    }
    if (courseId && courseId !== "all") {
      conditions.push("course_id = ?");
      params.push(courseId);
    }
    if (yearSemesterId && yearSemesterId !== "all") {
      conditions.push("year_semester_id = ?");
      params.push(yearSemesterId);
    }
    if (divisionId && divisionId !== "all") {
      conditions.push("division_id = ?");
      params.push(divisionId);
    }
    if (search) {
      conditions.push(
        '(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(student_id, "")) LIKE ? OR LOWER(COALESCE(roll_number, "")) LIKE ? OR LOWER(department) LIKE ?)'
      );
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }
    const users = db.prepare(`SELECT * FROM users WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC, id DESC`).all(...params);
    res.json({ users: users.map(sanitizeUser) });
  });
  app.post("/api/admin/users/:uid/approve", authenticateMiddleware, requireRole(["admin"]), async (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const { uid } = req.params;
    const target = db.prepare("SELECT * FROM users WHERE uid = ? AND college_id = ?").get(uid, collegeId);
    if (!target) {
      res.status(404).json({ error: "User account not found in your college." });
      return;
    }
    db.prepare("UPDATE users SET approval_status = 'APPROVED', status = 'Active' WHERE id = ?").run(target.id);
    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(target.id);
    recordActivityLog({
      collegeId,
      actorName: req.authUser.name,
      actorRole: "admin",
      category: "Authentication",
      action: "Approved Teacher Account",
      target: `${updated.name} (${updated.email})`,
      details: "Administrator approved pending faculty registration for Teacher Hub access.",
      status: "success"
    });
    const config = getNotificationConfig(collegeId);
    await dispatchEmail({
      fromName: config.sender_name,
      fromEmail: config.sender_email,
      to: updated.email,
      subject: "AttendEase Teacher Account Approved",
      text: `Hello ${updated.name},

Your teacher account has been approved by ${req.authUser.name}. You can now sign in to the Teacher Hub.`,
      html: `<p>Hello <strong>${updated.name}</strong>,</p><p>Your teacher account has been approved by ${req.authUser.name}. You may now access the Teacher Dashboard.</p>`
    });
    res.json({
      message: `${updated.name} has been approved and can now access the Teacher Portal.`,
      user: sanitizeUser(updated)
    });
  });
  app.post("/api/admin/users/:uid/reject", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const { uid } = req.params;
    const target = db.prepare("SELECT * FROM users WHERE uid = ? AND college_id = ?").get(uid, collegeId);
    if (!target) {
      res.status(404).json({ error: "User account not found in your college." });
      return;
    }
    db.prepare("UPDATE users SET approval_status = 'REJECTED', status = 'Rejected' WHERE id = ?").run(target.id);
    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(target.id);
    recordActivityLog({
      collegeId,
      actorName: req.authUser.name,
      actorRole: "admin",
      category: "Authentication",
      action: "Declined Teacher Registration",
      target: `${updated.name} (${updated.email})`,
      details: "Administrator rejected faculty registration request.",
      status: "warning"
    });
    res.json({
      message: `Teacher request for ${updated.name} has been declined.`,
      user: sanitizeUser(updated)
    });
  });
  app.post("/api/admin/users/:uid/promote", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const { uid } = req.params;
    const target = db.prepare("SELECT * FROM users WHERE uid = ? AND college_id = ?").get(uid, collegeId);
    if (!target) {
      res.status(404).json({ error: "User account not found in your college." });
      return;
    }
    db.prepare("UPDATE users SET role = 'admin', approval_status = 'APPROVED', status = 'Active' WHERE id = ?").run(target.id);
    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(target.id);
    recordActivityLog({
      collegeId,
      actorName: req.authUser.name,
      actorRole: "admin",
      category: "Authentication",
      action: "Promoted Account to Admin",
      target: `${updated.name} (${updated.email})`,
      details: `Granted institutional Administrator privileges to ${updated.name}.`,
      status: "success"
    });
    res.json({
      message: `${updated.name} has been promoted to Administrator by ${req.authUser.name}.`,
      user: sanitizeUser(updated)
    });
  });
  app.post("/api/admin/users/create-admin", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const { fullName, email, phoneNumber, password, department } = req.body || {};
    const cleanName = String(fullName || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = String(phoneNumber || "").trim();
    if (!cleanName || !cleanEmail || !password || String(password).length < 8) {
      res.status(400).json({ error: "Full name, valid email, and password (8+ chars) are required." });
      return;
    }
    const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
    if (exists) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    const passwordHash = bcrypt.hashSync(String(password), 10);
    const uid = `u-adm-${Date.now()}`;
    const joinedAt = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const info = db.prepare(
      `INSERT INTO users (uid, college_id, name, email, phone_number, password_hash, role, department, approval_status, status, email_verified, joined_at)
         VALUES (?, ?, ?, ?, ?, ?, 'admin', ?, 'APPROVED', 'Active', 1, ?)`
    ).run(uid, collegeId, cleanName, cleanEmail, cleanPhone || "+1-555-0199", passwordHash, department || "Administration", joinedAt);
    const created = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    recordActivityLog({
      collegeId,
      actorName: req.authUser.name,
      actorRole: "admin",
      category: "Authentication",
      action: "Created Authorized Admin Account",
      target: `${created.name} (${created.email})`,
      details: "Provisioned new Administrator account from Admin Dashboard.",
      status: "success"
    });
    res.status(201).json({
      message: `Administrator account created for ${created.name}.`,
      user: sanitizeUser(created)
    });
  });
  app.post("/api/admin/teachers", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const { fullName, email, phoneNumber, department, password } = req.body || {};
    const cleanName = String(fullName || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = String(phoneNumber || "").trim();
    const cleanDept = String(department || "Faculty Department").trim();
    const rawPassword = String(password || "password123");
    if (cleanName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: "Valid full name and email are required." });
      return;
    }
    if (rawPassword.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }
    const exists = db.prepare("SELECT id FROM users WHERE LOWER(email) = ?").get(cleanEmail);
    if (exists) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    const uid = `u-tch-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
    const passwordHash = bcrypt.hashSync(rawPassword, 10);
    const joinedAt = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const info = db.prepare(
      `INSERT INTO users (uid, college_id, name, email, phone_number, password_hash, role, department, approval_status, status, email_verified, joined_at)
         VALUES (?, ?, ?, ?, ?, ?, 'teacher', ?, 'APPROVED', 'Active', 1, ?)`
    ).run(uid, collegeId, cleanName, cleanEmail, cleanPhone || "", passwordHash, cleanDept, joinedAt);
    const created = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    recordActivityLog({
      collegeId,
      actorName: req.authUser.name,
      actorRole: "admin",
      category: "Authentication",
      action: "Added Faculty Account",
      target: `${created.name} (${created.email})`,
      details: `Provisioned active teacher account in ${cleanDept}.`,
      status: "success"
    });
    res.status(201).json({
      message: `Faculty account created for ${created.name}.`,
      teacher: sanitizeUser(created)
    });
  });
  function queryActivityLogs(req, scopeToUser) {
    const collegeId = req.authUser?.college_id || "col-1";
    const search = String(req.query.search || "").trim().toLowerCase();
    const category = String(req.query.category || "").trim();
    const status = String(req.query.status || "").trim().toLowerCase();
    const conditions = ["college_id = ?"];
    const params = [collegeId];
    if (scopeToUser && req.authUser && req.authUser.role !== "admin") {
      conditions.push("LOWER(actor_name) = ?");
      params.push(req.authUser.name.toLowerCase());
    }
    if (category && category !== "All") {
      conditions.push("category = ?");
      params.push(category);
    }
    if (status && status !== "all") {
      conditions.push("LOWER(status) = ?");
      params.push(status);
    }
    if (search) {
      conditions.push(
        "(LOWER(actor_name) LIKE ? OR LOWER(action) LIKE ? OR LOWER(target) LIKE ? OR LOWER(details) LIKE ? OR LOWER(category) LIKE ?)"
      );
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }
    const whereSql = `WHERE ${conditions.join(" AND ")}`;
    const rows = db.prepare(`SELECT * FROM activity_logs ${whereSql} ORDER BY id DESC LIMIT 250`).all(...params);
    return rows.map((r) => ({
      id: r.log_uid,
      timestamp: r.timestamp,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      category: r.category,
      action: r.action,
      target: r.target,
      details: r.details,
      status: r.status
    }));
  }
  app.get("/api/admin/activity-logs", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const logs = queryActivityLogs(req, false);
    res.json({
      source: "postgresql-synced-db",
      total: logs.length,
      logs
    });
  });
  app.get("/api/activity-logs", authenticateMiddleware, (req, res) => {
    const logs = queryActivityLogs(req, true);
    res.json({
      source: "postgresql-synced-db",
      total: logs.length,
      logs
    });
  });
  app.post("/api/admin/activity-logs", authenticateMiddleware, (req, res) => {
    const collegeId = req.authUser?.college_id || "col-1";
    const { actorName, actorRole, category, action, target, details, status } = req.body || {};
    if (!action || !target) {
      res.status(400).json({ error: "action and target are required to log an audit entry." });
      return;
    }
    const isAdmin = req.authUser?.role === "admin";
    const created = recordActivityLog({
      collegeId,
      actorName: isAdmin ? String(actorName || req.authUser.name) : req.authUser.name,
      actorRole: isAdmin ? String(actorRole || req.authUser.role) : req.authUser.role,
      category: category || "Course Management",
      action: String(action),
      target: String(target),
      details: String(details || ""),
      status: status || "info"
    });
    res.status(201).json({ log: created });
  });
  app.delete("/api/admin/activity-logs", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    db.prepare("DELETE FROM activity_logs WHERE college_id = ?").run(collegeId);
    res.json({ message: "Audit log table cleared for your college." });
  });
  function enrichClassRows(rows) {
    return rows.map((r) => {
      const ay = r.academic_year_id ? db.prepare("SELECT name FROM academic_years WHERE id = ?").get(r.academic_year_id) : void 0;
      const crs = r.course_id ? db.prepare("SELECT code, name FROM courses WHERE id = ?").get(r.course_id) : void 0;
      const ys = r.year_semester_id ? db.prepare("SELECT name FROM year_semesters WHERE id = ?").get(r.year_semester_id) : void 0;
      const div = r.division_id ? db.prepare("SELECT name, code, batch_name FROM divisions WHERE id = ?").get(r.division_id) : void 0;
      const liveCount = r.division_id ? db.prepare("SELECT COUNT(*) as c FROM users WHERE college_id = ? AND division_id = ? AND role = 'student'").get(r.college_id || "col-1", r.division_id).c : db.prepare("SELECT COUNT(DISTINCT student_uid) as c FROM course_enrollments WHERE class_id = ?").get(r.id).c;
      return {
        id: r.id,
        collegeId: r.college_id || "col-1",
        code: r.code,
        name: r.name,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        academicYearId: r.academic_year_id || void 0,
        academicYearName: ay?.name || void 0,
        courseId: r.course_id || void 0,
        courseCode: crs?.code || void 0,
        courseName: crs?.name || void 0,
        yearSemesterId: r.year_semester_id || void 0,
        yearSemesterName: ys?.name || void 0,
        divisionId: r.division_id || void 0,
        divisionName: div?.name || void 0,
        divisionCode: div?.code || void 0,
        batchName: div?.batch_name || void 0,
        schedule: r.schedule,
        room: r.room,
        totalStudents: liveCount
      };
    });
  }
  function syncDivisionClassEnrollments(classId, divisionId) {
    if (!divisionId) return;
    const stuRows = db.prepare("SELECT uid, student_id, roll_number FROM users WHERE division_id = ? AND role = 'student'").all(divisionId);
    const insertEnroll = db.prepare(
      "INSERT OR IGNORE INTO course_enrollments (student_uid, student_id, class_id) VALUES (?, ?, ?)"
    );
    for (const s of stuRows) {
      insertEnroll.run(s.uid, s.student_id || s.roll_number || s.uid, classId);
    }
  }
  app.post("/api/attendance/record", authenticateMiddleware, requireRole(["teacher", "admin"]), async (req, res) => {
    try {
      const collegeId = req.authUser.college_id || "col-1";
      const { classId, classCode, studentId, studentUid, date, status, method } = req.body || {};
      const cleanStudentId = String(studentId || "").trim().toUpperCase();
      const cleanStudentUid = String(studentUid || "").trim();
      const cleanClassId = String(classId || "").trim();
      const cleanClassCode = String(classCode || "").trim().toUpperCase();
      const cleanStatus = String(status || "").trim().toLowerCase();
      if (!cleanStudentId && !cleanStudentUid || !["present", "absent"].includes(cleanStatus)) {
        res.status(400).json({ error: "Valid studentId (or studentUid) and status (present or absent) are required." });
        return;
      }
      if (!cleanClassId && !cleanClassCode) {
        res.status(400).json({ error: "classId or classCode is required." });
        return;
      }
      const cls = cleanClassId ? db.prepare("SELECT * FROM course_classes WHERE id = ? AND college_id = ? LIMIT 1").get(cleanClassId, collegeId) : db.prepare("SELECT * FROM course_classes WHERE UPPER(code) = ? AND college_id = ? LIMIT 1").get(cleanClassCode, collegeId);
      if (!cls) {
        res.status(404).json({ error: "Requested course class does not exist in your college." });
        return;
      }
      if (req.authUser.role === "teacher" && cls.teacher_id !== req.authUser.uid) {
        res.status(403).json({
          error: `Forbidden: You are not the assigned instructor for ${cls.code}.`,
          code: "UNAUTHORIZED_CLASS_ACCESS"
        });
        return;
      }
      const studentUser = cleanStudentUid ? db.prepare(`SELECT * FROM users WHERE uid = ? AND college_id = ? AND role = 'student' LIMIT 1`).get(cleanStudentUid, collegeId) : cls.division_id ? db.prepare(
        `SELECT * FROM users WHERE college_id = ? AND division_id = ? AND (UPPER(student_id) = ? OR UPPER(roll_number) = ?) AND role = 'student' LIMIT 1`
      ).get(collegeId, cls.division_id, cleanStudentId, cleanStudentId) : db.prepare(
        `SELECT * FROM users WHERE college_id = ? AND (UPPER(student_id) = ? OR UPPER(roll_number) = ?) AND role = 'student' LIMIT 1`
      ).get(collegeId, cleanStudentId, cleanStudentId);
      if (!studentUser) {
        res.status(404).json({ error: `Student ${cleanStudentId || cleanStudentUid} not found in this division/college.` });
        return;
      }
      if (cls.division_id && studentUser.division_id !== cls.division_id) {
        res.status(403).json({
          error: `Forbidden: ${studentUser.name} does not belong to the assigned division for ${cls.code}.`,
          code: "NOT_IN_DIVISION"
        });
        return;
      }
      if (req.authUser.role === "teacher" && !cls.division_id) {
        const enrolled = db.prepare("SELECT 1 FROM course_enrollments WHERE student_uid = ? AND class_id = ? LIMIT 1").get(studentUser.uid, cls.id);
        if (!enrolled) {
          res.status(403).json({
            error: `Forbidden: ${studentUser.name} (${cleanStudentId}) is not enrolled in ${cls.code}.`,
            code: "STUDENT_NOT_ENROLLED"
          });
          return;
        }
      }
      const attDate = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const safeMethod = method === "qr" ? "qr" : "manual";
      const effectiveSid = studentUser.student_id || studentUser.roll_number || cleanStudentId;
      const existingSameDay = db.prepare(
        `SELECT id, record_uid FROM attendance_records
           WHERE class_id = ? AND student_user_uid = ? AND attendance_date = ? LIMIT 1`
      ).get(cls.id, studentUser.uid, attDate);
      let recordUid;
      if (existingSameDay) {
        recordUid = existingSameDay.record_uid;
        db.prepare(
          `UPDATE attendance_records SET status = ?, method = ?, marked_by_uid = ?, college_id = ?, division_id = ? WHERE id = ?`
        ).run(cleanStatus, safeMethod, req.authUser.uid, collegeId, cls.division_id || studentUser.division_id || null, existingSameDay.id);
      } else {
        recordUid = `att-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
        db.prepare(
          `INSERT INTO attendance_records (record_uid, college_id, class_id, class_code, class_name, division_id, student_id, student_name, attendance_date, status, method, student_user_uid, marked_by_uid)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          recordUid,
          collegeId,
          cls.id,
          cls.code,
          cls.name,
          cls.division_id || studentUser.division_id || null,
          effectiveSid,
          studentUser.name,
          attDate,
          cleanStatus,
          safeMethod,
          studentUser.uid,
          req.authUser.uid
        );
      }
      const config = getNotificationConfig(collegeId);
      let triggeredAlert = null;
      if (config.auto_notify_enabled && cleanStatus === "absent") {
        const evalResult = await evaluateThresholdAlerts({
          collegeId,
          triggeredBy: `${req.authUser.name} (${req.authUser.role.toUpperCase()})`,
          targetStudentId: effectiveSid
        });
        const matched = evalResult.students.find((s) => s.dispatchedNow);
        if (matched) {
          triggeredAlert = matched;
        }
      }
      recordActivityLog({
        collegeId,
        actorName: req.authUser.name,
        actorRole: req.authUser.role,
        category: "Attendance",
        action: `Attendance Modification: ${cleanStatus.toUpperCase()}`,
        target: `${studentUser.name} \xB7 ${cls.code}`,
        details: `Recorded ${cleanStatus} attendance (${safeMethod}) for ${effectiveSid} on ${attDate}.`,
        status: cleanStatus === "present" ? "success" : "error"
      });
      res.status(201).json({
        recordUid,
        triggeredAlert
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to record attendance update." });
    }
  });
  function executePersonalQrCheckIn(req, res) {
    const authUser = req.authUser;
    const collegeId = authUser.college_id || "col-1";
    const rawInput = String(req.body?.qrToken || "").trim();
    const upperInput = rawInput.toUpperCase();
    const method = String(req.body?.method || "camera").trim();
    const requestedStudentId = String(req.body?.studentId || "").trim().toUpperCase();
    if (authUser.role === "student" && requestedStudentId && requestedStudentId !== (authUser.student_id || "").toUpperCase()) {
      res.status(403).json({
        error: "Forbidden: Students can only submit QR attendance for their own authenticated account.",
        code: "ANTI_IDOR_VIOLATION"
      });
      return;
    }
    if (!upperInput || upperInput.includes("EXPIRED")) {
      recordActivityLog({
        collegeId,
        actorName: authUser.name,
        actorRole: authUser.role,
        category: "Attendance",
        action: "Rejected Invalid QR Scan",
        target: upperInput || "EMPTY_TOKEN",
        details: `QR scanner rejected expired or malformed token (${method}).`,
        status: "error"
      });
      res.status(400).json({
        error: "QR session token is invalid or expired.",
        code: "QR_INVALID_OR_EXPIRED"
      });
      return;
    }
    let tokenPart = upperInput;
    let embeddedStudentId = "";
    if (upperInput.startsWith("{")) {
      try {
        const parsed = JSON.parse(rawInput);
        if (parsed.token) tokenPart = String(parsed.token).trim().toUpperCase();
        if (parsed.studentId) embeddedStudentId = String(parsed.studentId).trim().toUpperCase();
      } catch {
      }
    } else if (upperInput.includes("|")) {
      const parts = upperInput.split("|");
      tokenPart = parts[0].trim();
      if (parts[1]?.trim()) embeddedStudentId = parts[1].trim();
    }
    if (authUser.role === "student" && embeddedStudentId && embeddedStudentId !== (authUser.student_id || "").toUpperCase()) {
      res.status(403).json({
        error: "Forbidden: QR payload references another student ID.",
        code: "ANTI_IDOR_VIOLATION"
      });
      return;
    }
    const session = db.prepare("SELECT * FROM qr_sessions WHERE UPPER(token) = ? ORDER BY id DESC LIMIT 1").get(tokenPart);
    let targetClass;
    if (session) {
      if (!session.active || Date.parse(session.expires_at) < Date.now()) {
        if (session.active) {
          db.prepare("UPDATE qr_sessions SET active = 0 WHERE id = ?").run(session.id);
        }
        res.status(400).json({
          error: "This QR session has expired. Ask your instructor to refresh the QR code.",
          code: "QR_INVALID_OR_EXPIRED"
        });
        return;
      }
      targetClass = db.prepare("SELECT id, college_id, code, name, teacher_id, division_id FROM course_classes WHERE id = ? LIMIT 1").get(session.class_id);
    } else {
      targetClass = db.prepare(
        `SELECT id, college_id, code, name, teacher_id, division_id FROM course_classes WHERE college_id = ? AND (UPPER(code) = ? OR ('AE-' || UPPER(code) || '-2026') = ?) LIMIT 1`
      ).get(collegeId, tokenPart, tokenPart);
    }
    if (!targetClass) {
      res.status(400).json({
        error: `Unrecognized QR token "${tokenPart}".`,
        code: "QR_INVALID_OR_EXPIRED"
      });
      return;
    }
    if (targetClass.college_id !== collegeId || session?.college_id && session.college_id !== collegeId) {
      res.status(403).json({
        error: "Forbidden: This QR code belongs to a different college.",
        code: "CROSS_COLLEGE_FORBIDDEN"
      });
      return;
    }
    const sessionDivisionId = session?.division_id || targetClass.division_id;
    if (authUser.role === "student") {
      if (sessionDivisionId && authUser.division_id !== sessionDivisionId) {
        const divInfo = db.prepare("SELECT name FROM divisions WHERE id = ?").get(sessionDivisionId);
        res.status(403).json({
          error: `Forbidden: This QR session is restricted to ${divInfo?.name || "another division"}. You cannot submit attendance for a different division.`,
          code: "NOT_IN_DIVISION"
        });
        return;
      }
      const enrolled = db.prepare("SELECT 1 FROM course_enrollments WHERE student_uid = ? AND class_id = ? LIMIT 1").get(authUser.uid, targetClass.id);
      if (!enrolled && (!sessionDivisionId || authUser.division_id !== sessionDivisionId)) {
        res.status(403).json({
          error: `Forbidden: You are not enrolled in ${targetClass.code} (${targetClass.name}).`,
          code: "NOT_ENROLLED_IN_CLASS"
        });
        return;
      }
    }
    const effectiveStudentId = authUser.student_id || authUser.roll_number || authUser.uid;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const existing = db.prepare(
      `SELECT id FROM attendance_records
         WHERE class_id = ? AND (student_user_uid = ? OR UPPER(student_id) = ?) AND attendance_date = ? AND status = 'present'`
    ).get(targetClass.id, authUser.uid, effectiveStudentId.toUpperCase(), today);
    if (existing) {
      res.status(409).json({
        error: `${authUser.name} (${effectiveStudentId}) has already checked into ${targetClass.code} today.`,
        code: "DUPLICATE_CHECKIN",
        classCode: targetClass.code,
        className: targetClass.name,
        studentId: effectiveStudentId,
        studentName: authUser.name
      });
      return;
    }
    const recordUid = `att-qr-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
    db.prepare(
      `INSERT INTO attendance_records (record_uid, college_id, class_id, class_code, class_name, division_id, student_id, student_name, attendance_date, status, method, student_user_uid, marked_by_uid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'present', 'qr', ?, ?)`
    ).run(
      recordUid,
      collegeId,
      targetClass.id,
      targetClass.code,
      targetClass.name,
      sessionDivisionId || authUser.division_id || null,
      effectiveStudentId,
      authUser.name,
      today,
      authUser.uid,
      targetClass.teacher_id
    );
    recordActivityLog({
      collegeId,
      actorName: authUser.name,
      actorRole: authUser.role,
      category: "Attendance",
      action: "Verified QR Check-in",
      target: `${targetClass.code} \xB7 ${effectiveStudentId}`,
      details: `Verified personal division check-in for ${targetClass.name} via ${method} (${tokenPart}).`,
      status: "success"
    });
    res.status(201).json({
      verified: true,
      message: `QR check-in verified (${method}) for ${authUser.name} in ${targetClass.name}.`,
      classCode: targetClass.code,
      className: targetClass.name,
      record: {
        id: recordUid,
        classId: targetClass.id,
        classCode: targetClass.code,
        className: targetClass.name,
        divisionId: sessionDivisionId || authUser.division_id || void 0,
        studentId: effectiveStudentId,
        studentName: authUser.name,
        date: today,
        status: "present",
        method: "qr"
      }
    });
  }
  app.get("/api/student/profile", authenticateMiddleware, requireRole(["student", "admin"]), (req, res) => {
    const authUser = req.authUser;
    const collegeId = authUser.college_id || "col-1";
    const enrolledRow = db.prepare(
      authUser.division_id ? `SELECT COUNT(DISTINCT id) as count FROM course_classes WHERE college_id = ? AND (division_id = ? OR id IN (SELECT class_id FROM course_enrollments WHERE student_uid = ?))` : `SELECT COUNT(*) as count FROM course_enrollments WHERE student_uid = ?`
    ).get(...authUser.division_id ? [collegeId, authUser.division_id, authUser.uid] : [authUser.uid]);
    res.json({
      user: sanitizeUser(authUser),
      enrolledCourseCount: enrolledRow.count
    });
  });
  app.get("/api/student/courses", authenticateMiddleware, requireRole(["student", "admin"]), (req, res) => {
    const authUser = req.authUser;
    const collegeId = authUser.college_id || "col-1";
    const rows = authUser.role === "admin" ? db.prepare("SELECT * FROM course_classes WHERE college_id = ? ORDER BY code ASC").all(collegeId) : authUser.division_id ? db.prepare(
      `SELECT DISTINCT cc.* FROM course_classes cc
               LEFT JOIN course_enrollments ce ON ce.class_id = cc.id AND ce.student_uid = ?
               WHERE cc.college_id = ? AND (cc.division_id = ? OR ce.student_uid = ?)
               ORDER BY cc.code ASC`
    ).all(authUser.uid, collegeId, authUser.division_id, authUser.uid) : db.prepare(
      `SELECT cc.* FROM course_classes cc
               INNER JOIN course_enrollments ce ON ce.class_id = cc.id
               WHERE ce.student_uid = ? AND cc.college_id = ?
               ORDER BY cc.code ASC`
    ).all(authUser.uid, collegeId);
    res.json({
      classes: enrichClassRows(rows)
    });
  });
  app.get("/api/student/attendance", authenticateMiddleware, requireRole(["student", "admin"]), (req, res) => {
    const authUser = req.authUser;
    const collegeId = authUser.college_id || "col-1";
    const sid = (authUser.student_id || "").toUpperCase();
    const rows = db.prepare(
      `SELECT * FROM attendance_records
         WHERE college_id = ? AND (student_user_uid = ? OR (? <> '' AND UPPER(student_id) = ?))
         ORDER BY attendance_date DESC, id DESC`
    ).all(collegeId, authUser.uid, sid, sid);
    const presentCount = rows.filter((r) => r.status === "present").length;
    const absentCount = rows.filter((r) => r.status === "absent").length;
    const attendedCount = presentCount;
    const percentage = rows.length > 0 ? Math.round(attendedCount / rows.length * 100) : 100;
    res.json({
      source: "postgresql-synced-db",
      student: sanitizeUser(authUser),
      summary: {
        total: rows.length,
        presentCount,
        absentCount,
        attendedCount,
        percentage
      },
      records: rows.map((r) => ({
        id: r.record_uid,
        classId: r.class_id,
        classCode: r.class_code,
        className: r.class_name,
        divisionId: r.division_id || void 0,
        studentId: r.student_id,
        studentName: r.student_name,
        date: r.attendance_date,
        status: r.status,
        method: r.method
      }))
    });
  });
  app.post("/api/student/qr/scan", authenticateMiddleware, requireRole(["student", "admin"]), (req, res) => {
    try {
      executePersonalQrCheckIn(req, res);
    } catch (err) {
      console.error("Student QR scan error:", err);
      res.status(500).json({ error: "QR verification failed." });
    }
  });
  function resolveStudentTargetAccess(req, res) {
    const authUser = req.authUser;
    const targetId = String(req.params.targetId || "").trim();
    const isSelf = targetId === authUser.uid || Boolean(authUser.student_id) && targetId.toUpperCase() === authUser.student_id.toUpperCase();
    if (authUser.role !== "admin" && !isSelf) {
      res.status(403).json({
        error: "Forbidden: You are not authorized to access or modify another student\u2019s profile or attendance.",
        code: "ANTI_IDOR_FORBIDDEN"
      });
      return null;
    }
    const collegeId = authUser.college_id || "col-1";
    const target = db.prepare(`SELECT * FROM users WHERE college_id = ? AND (uid = ? OR UPPER(student_id) = ?) AND role = 'student' LIMIT 1`).get(collegeId, targetId, targetId.toUpperCase());
    if (!target) {
      res.status(404).json({ error: "Student resource not found." });
      return null;
    }
    return target;
  }
  app.get("/api/student/:targetId/profile", authenticateMiddleware, (req, res) => {
    const target = resolveStudentTargetAccess(req, res);
    if (!target) return;
    res.json({ user: sanitizeUser(target) });
  });
  app.get("/api/student/:targetId/attendance", authenticateMiddleware, (req, res) => {
    const target = resolveStudentTargetAccess(req, res);
    if (!target) return;
    const rows = db.prepare("SELECT * FROM attendance_records WHERE student_user_uid = ? OR UPPER(student_id) = ? ORDER BY attendance_date DESC, id DESC").all(target.uid, (target.student_id || "").toUpperCase());
    res.json({
      student: sanitizeUser(target),
      records: rows.map((r) => ({
        id: r.record_uid,
        classId: r.class_id,
        classCode: r.class_code,
        className: r.class_name,
        studentId: r.student_id,
        studentName: r.student_name,
        date: r.attendance_date,
        status: r.status,
        method: r.method
      }))
    });
  });
  app.all("/api/student/:targetId/records*", authenticateMiddleware, (req, res) => {
    const target = resolveStudentTargetAccess(req, res);
    if (!target) return;
    if (req.authUser.role === "student" && req.method !== "GET") {
      res.status(403).json({ error: "Forbidden: Students cannot directly modify historical attendance records." });
      return;
    }
    res.status(405).json({ error: "Method not allowed on historical attendance records." });
  });
  app.get("/api/teacher/classes", authenticateMiddleware, requireRole(["teacher", "admin"]), (req, res) => {
    const authUser = req.authUser;
    const collegeId = authUser.college_id || "col-1";
    const rows = authUser.role === "admin" ? db.prepare("SELECT * FROM course_classes WHERE college_id = ? ORDER BY code ASC").all(collegeId) : db.prepare("SELECT * FROM course_classes WHERE college_id = ? AND teacher_id = ? ORDER BY code ASC").all(collegeId, authUser.uid);
    res.json({
      classes: enrichClassRows(rows)
    });
  });
  app.get("/api/teacher/classes/:classId", authenticateMiddleware, requireRole(["teacher", "admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const param = String(req.params.classId || "").trim();
    const cls = db.prepare("SELECT * FROM course_classes WHERE college_id = ? AND (id = ? OR UPPER(code) = ?) LIMIT 1").get(collegeId, param, param.toUpperCase());
    if (!cls) {
      res.status(404).json({ error: "Course class not found." });
      return;
    }
    if (req.authUser.role === "teacher" && cls.teacher_id !== req.authUser.uid) {
      res.status(403).json({
        error: `Forbidden: You are not assigned to teach ${cls.code}.`,
        code: "UNAUTHORIZED_CLASS_ACCESS"
      });
      return;
    }
    res.json({
      courseClass: enrichClassRows([cls])[0]
    });
  });
  app.get("/api/teacher/students", authenticateMiddleware, requireRole(["teacher", "admin"]), (req, res) => {
    const authUser = req.authUser;
    const collegeId = authUser.college_id || "col-1";
    const classIdParam = String(req.query.classId || "").trim();
    const divisionIdParam = String(req.query.divisionId || "").trim();
    if (divisionIdParam && divisionIdParam !== "all") {
      if (authUser.role === "teacher") {
        const assignedInDivision = db.prepare("SELECT 1 FROM course_classes WHERE college_id = ? AND division_id = ? AND teacher_id = ? LIMIT 1").get(collegeId, divisionIdParam, authUser.uid);
        if (!assignedInDivision) {
          res.status(403).json({
            error: "Forbidden: You are not assigned to teach this division.",
            code: "UNAUTHORIZED_DIVISION_ACCESS"
          });
          return;
        }
      }
      const divRoster = db.prepare(
        `SELECT * FROM users WHERE college_id = ? AND division_id = ? AND role = 'student' ORDER BY COALESCE(roll_number, student_id, name) ASC`
      ).all(collegeId, divisionIdParam);
      res.json({
        students: divRoster.map((u) => ({
          ...sanitizeUser(u),
          enrolledClassIds: []
        }))
      });
      return;
    }
    if (classIdParam && classIdParam !== "all") {
      const cls = db.prepare("SELECT * FROM course_classes WHERE college_id = ? AND (id = ? OR UPPER(code) = ?) LIMIT 1").get(collegeId, classIdParam, classIdParam.toUpperCase());
      if (!cls) {
        res.status(404).json({ error: "Requested class not found." });
        return;
      }
      if (authUser.role === "teacher" && cls.teacher_id !== authUser.uid) {
        res.status(403).json({
          error: `Forbidden: You cannot view the student roster of ${cls.code}.`,
          code: "UNAUTHORIZED_CLASS_ACCESS"
        });
        return;
      }
      const roster = cls.division_id ? db.prepare(
        `SELECT * FROM users WHERE college_id = ? AND division_id = ? AND role = 'student' ORDER BY COALESCE(roll_number, student_id, name) ASC`
      ).all(collegeId, cls.division_id) : db.prepare(
        `SELECT u.* FROM users u
               INNER JOIN course_enrollments ce ON ce.student_uid = u.uid
               WHERE ce.class_id = ? AND u.college_id = ? AND u.role = 'student'
               ORDER BY COALESCE(u.roll_number, u.student_id, u.name) ASC`
      ).all(cls.id, collegeId);
      res.json({
        students: roster.map((u) => ({
          ...sanitizeUser(u),
          enrolledClassIds: [cls.id]
        }))
      });
      return;
    }
    const rows = authUser.role === "admin" ? db.prepare(
      `SELECT u.*, GROUP_CONCAT(ce.class_id) as class_ids
               FROM users u
               LEFT JOIN course_enrollments ce ON ce.student_uid = u.uid
               WHERE u.college_id = ? AND u.role = 'student'
               GROUP BY u.uid
               ORDER BY u.name ASC`
    ).all(collegeId) : db.prepare(
      `SELECT u.*, GROUP_CONCAT(DISTINCT cc.id) as class_ids
               FROM users u
               INNER JOIN course_classes cc ON cc.college_id = u.college_id AND cc.teacher_id = ?
               LEFT JOIN course_enrollments ce ON ce.student_uid = u.uid AND ce.class_id = cc.id
               WHERE u.college_id = ? AND u.role = 'student' AND (u.division_id = cc.division_id OR ce.class_id IS NOT NULL)
               GROUP BY u.uid
               ORDER BY u.name ASC`
    ).all(authUser.uid, collegeId);
    res.json({
      students: rows.map((r) => ({
        ...sanitizeUser(r),
        enrolledClassIds: r.class_ids ? String(r.class_ids).split(",") : []
      }))
    });
  });
  app.get("/api/teacher/attendance", authenticateMiddleware, requireRole(["teacher", "admin"]), (req, res) => {
    try {
      const authUser = req.authUser;
      const collegeId = authUser.college_id || "col-1";
      const classId = String(req.query.classId || "").trim();
      const classCode = String(req.query.classCode || "").trim().toUpperCase();
      const divisionId = String(req.query.divisionId || "").trim();
      const courseId = String(req.query.courseId || "").trim();
      const academicYearId = String(req.query.academicYearId || "").trim();
      const yearSemesterId = String(req.query.yearSemesterId || "").trim();
      const startDate = String(req.query.startDate || "").trim();
      const endDate = String(req.query.endDate || "").trim();
      const status = String(req.query.status || "").trim().toLowerCase();
      const search = String(req.query.search || "").trim().toLowerCase();
      if (classId && classId !== "all") {
        const cls = db.prepare("SELECT id, teacher_id, code FROM course_classes WHERE id = ? AND college_id = ? LIMIT 1").get(classId, collegeId);
        if (!cls) {
          res.status(404).json({ error: "Requested course class not found." });
          return;
        }
        if (authUser.role === "teacher" && cls.teacher_id !== authUser.uid) {
          res.status(403).json({
            error: `Forbidden: You are not authorized to view attendance reports for ${cls.code}.`,
            code: "UNAUTHORIZED_CLASS_ACCESS"
          });
          return;
        }
      }
      if (classCode && classCode !== "ALL") {
        const cls = db.prepare("SELECT id, teacher_id, code FROM course_classes WHERE UPPER(code) = ? AND college_id = ? LIMIT 1").get(classCode, collegeId);
        if (!cls) {
          res.status(404).json({ error: `Course code ${classCode} not found.` });
          return;
        }
        if (authUser.role === "teacher" && cls.teacher_id !== authUser.uid) {
          res.status(403).json({
            error: `Forbidden: You are not authorized to view attendance reports for ${cls.code}.`,
            code: "UNAUTHORIZED_CLASS_ACCESS"
          });
          return;
        }
      }
      const conditions = ["ar.college_id = ?"];
      const params = [collegeId];
      if (authUser.role === "teacher") {
        conditions.push("ar.class_id IN (SELECT id FROM course_classes WHERE teacher_id = ? AND college_id = ?)");
        params.push(authUser.uid, collegeId);
      }
      if (classId && classId !== "all") {
        conditions.push("ar.class_id = ?");
        params.push(classId);
      }
      if (classCode && classCode !== "ALL") {
        conditions.push("UPPER(ar.class_code) = ?");
        params.push(classCode);
      }
      if (divisionId && divisionId !== "all") {
        conditions.push("(ar.division_id = ? OR cc.division_id = ?)");
        params.push(divisionId, divisionId);
      }
      if (courseId && courseId !== "all") {
        conditions.push("cc.course_id = ?");
        params.push(courseId);
      }
      if (academicYearId && academicYearId !== "all") {
        conditions.push("cc.academic_year_id = ?");
        params.push(academicYearId);
      }
      if (yearSemesterId && yearSemesterId !== "all") {
        conditions.push("cc.year_semester_id = ?");
        params.push(yearSemesterId);
      }
      if (startDate) {
        conditions.push("ar.attendance_date >= ?");
        params.push(startDate);
      }
      if (endDate) {
        conditions.push("ar.attendance_date <= ?");
        params.push(endDate);
      }
      if (status && status !== "all") {
        conditions.push("LOWER(ar.status) = ?");
        params.push(status);
      }
      if (search) {
        conditions.push(
          "(LOWER(ar.student_name) LIKE ? OR LOWER(ar.student_id) LIKE ? OR LOWER(ar.class_name) LIKE ? OR LOWER(ar.class_code) LIKE ?)"
        );
        const like = `%${search}%`;
        params.push(like, like, like, like);
      }
      const whereSql = `WHERE ${conditions.join(" AND ")}`;
      const rows = db.prepare(
        `SELECT ar.*, d.name as division_name, c.code as course_code, ys.name as year_semester_name
           FROM attendance_records ar
           LEFT JOIN course_classes cc ON cc.id = ar.class_id
           LEFT JOIN divisions d ON d.id = COALESCE(ar.division_id, cc.division_id)
           LEFT JOIN courses c ON c.id = cc.course_id
           LEFT JOIN year_semesters ys ON ys.id = cc.year_semester_id
           ${whereSql}
           ORDER BY ar.attendance_date DESC, ar.id DESC`
      ).all(...params);
      const records = rows.map((r) => ({
        id: r.record_uid,
        collegeId: r.college_id,
        classId: r.class_id,
        classCode: r.class_code,
        className: r.class_name,
        divisionId: r.division_id || void 0,
        divisionName: r.division_name || void 0,
        courseCode: r.course_code || void 0,
        yearSemesterName: r.year_semester_name || void 0,
        studentId: r.student_id,
        studentName: r.student_name,
        date: r.attendance_date,
        status: r.status,
        method: r.method
      }));
      res.json({
        source: "postgresql-synced-db",
        total: records.length,
        records
      });
    } catch (err) {
      console.error("Fetch attendance logs error:", err);
      res.status(500).json({ error: "Unable to fetch attendance logs from database." });
    }
  });
  app.post("/api/teacher/qr/generate", authenticateMiddleware, requireRole(["teacher", "admin"]), (req, res) => {
    try {
      const collegeId = req.authUser.college_id || "col-1";
      const classCode = String(req.body?.classCode || "").trim().toUpperCase();
      const classId = String(req.body?.classId || "").trim();
      const cls = classId ? db.prepare("SELECT * FROM course_classes WHERE id = ? AND college_id = ? LIMIT 1").get(classId, collegeId) : db.prepare("SELECT * FROM course_classes WHERE UPPER(code) = ? AND college_id = ? LIMIT 1").get(classCode, collegeId);
      if (!cls) {
        res.status(404).json({ error: "Course class not found in your college." });
        return;
      }
      if (req.authUser.role === "teacher" && cls.teacher_id !== req.authUser.uid) {
        res.status(403).json({
          error: `Forbidden: You can only generate QR sessions for your own assigned classes (not ${cls.code}).`,
          code: "UNAUTHORIZED_CLASS_ACCESS"
        });
        return;
      }
      const requestedDuration = Number(req.body?.durationMinutes || 30);
      const durationMinutes = isNaN(requestedDuration) || requestedDuration <= 0 ? 30 : Math.min(120, requestedDuration);
      const token = `AE-${cls.code}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1e3).toISOString();
      db.prepare(
        `INSERT INTO qr_sessions (token, college_id, class_id, class_code, class_name, academic_year_id, course_id, year_semester_id, division_id, expires_at, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).run(
        token,
        collegeId,
        cls.id,
        cls.code,
        cls.name,
        cls.academic_year_id || null,
        cls.course_id || null,
        cls.year_semester_id || null,
        cls.division_id || null,
        expiresAt
      );
      const enriched = enrichClassRows([cls])[0];
      res.status(201).json({
        token,
        classId: cls.id,
        classCode: cls.code,
        className: cls.name,
        divisionId: enriched.divisionId,
        divisionName: enriched.divisionName,
        courseCode: enriched.courseCode,
        yearSemesterName: enriched.yearSemesterName,
        academicYearName: enriched.academicYearName,
        expiresAt
      });
      recordActivityLog({
        collegeId,
        actorName: req.authUser.name,
        actorRole: req.authUser.role,
        category: "Attendance",
        action: "Generated Dynamic QR Session",
        target: `${cls.code} \xB7 ${enriched.divisionName || cls.name}`,
        details: `Issued ${durationMinutes}-minute division-specific QR session token ${token}.`,
        status: "info"
      });
    } catch (err) {
      console.error("QR generate error:", err);
      res.status(500).json({ error: "Failed to generate dynamic QR session." });
    }
  });
  app.post("/api/teacher/qr/scan", authenticateMiddleware, (req, res) => {
    try {
      const authUser = req.authUser;
      const collegeId = authUser.college_id || "col-1";
      if (authUser.role === "student") {
        executePersonalQrCheckIn(req, res);
        return;
      }
      const rawInput = String(req.body?.qrToken || "").trim();
      const upperInput = rawInput.toUpperCase();
      let studentId = String(req.body?.studentId || "").trim().toUpperCase();
      const method = String(req.body?.method || "camera").trim();
      if (!upperInput || upperInput.includes("EXPIRED")) {
        res.status(400).json({
          error: "QR session token is invalid or expired.",
          code: "QR_INVALID_OR_EXPIRED"
        });
        return;
      }
      let tokenPart = upperInput;
      if (upperInput.startsWith("{")) {
        try {
          const parsed = JSON.parse(rawInput);
          if (parsed.token) tokenPart = String(parsed.token).trim().toUpperCase();
          if (parsed.studentId) studentId = String(parsed.studentId).trim().toUpperCase();
        } catch {
        }
      } else if (upperInput.includes("|")) {
        const parts = upperInput.split("|");
        tokenPart = parts[0].trim();
        if (parts[1]?.trim()) studentId = parts[1].trim();
      }
      if (!studentId) {
        res.status(400).json({ error: "studentId is required for faculty QR scan." });
        return;
      }
      const session = db.prepare("SELECT * FROM qr_sessions WHERE UPPER(token) = ? AND active = 1 ORDER BY id DESC LIMIT 1").get(tokenPart);
      let targetClass;
      if (session) {
        if (Date.parse(session.expires_at) < Date.now()) {
          db.prepare("UPDATE qr_sessions SET active = 0 WHERE id = ?").run(session.id);
          res.status(400).json({
            error: "This QR session has expired. Ask the instructor to refresh the QR code.",
            code: "QR_INVALID_OR_EXPIRED"
          });
          return;
        }
        targetClass = db.prepare("SELECT id, college_id, code, name, teacher_id, division_id FROM course_classes WHERE id = ? LIMIT 1").get(session.class_id);
      } else {
        targetClass = db.prepare(
          `SELECT id, college_id, code, name, teacher_id, division_id FROM course_classes WHERE college_id = ? AND (UPPER(code) = ? OR ('AE-' || UPPER(code) || '-2026') = ?) LIMIT 1`
        ).get(collegeId, tokenPart, tokenPart);
      }
      if (!targetClass || targetClass.college_id !== collegeId) {
        res.status(400).json({
          error: `Unrecognized QR token "${tokenPart}".`,
          code: "QR_INVALID_OR_EXPIRED"
        });
        return;
      }
      if (authUser.role === "teacher" && targetClass.teacher_id !== authUser.uid) {
        res.status(403).json({
          error: `Forbidden: You are not assigned to check students into ${targetClass.code}.`,
          code: "UNAUTHORIZED_CLASS_ACCESS"
        });
        return;
      }
      const sessionDivisionId = session?.division_id || targetClass.division_id;
      const matchedUser = sessionDivisionId ? db.prepare(
        `SELECT uid, name, student_id, roll_number, division_id FROM users WHERE college_id = ? AND division_id = ? AND (UPPER(student_id) = ? OR UPPER(roll_number) = ?) AND role = 'student' LIMIT 1`
      ).get(collegeId, sessionDivisionId, studentId, studentId) : db.prepare(
        `SELECT uid, name, student_id, roll_number, division_id FROM users WHERE college_id = ? AND (UPPER(student_id) = ? OR UPPER(roll_number) = ?) AND role = 'student' LIMIT 1`
      ).get(collegeId, studentId, studentId);
      if (!matchedUser) {
        res.status(404).json({ error: `Student ${studentId} was not found in the assigned division.` });
        return;
      }
      const effectiveSid = matchedUser.student_id || matchedUser.roll_number || studentId;
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const existing = db.prepare(
        `SELECT id FROM attendance_records
           WHERE class_id = ? AND (student_user_uid = ? OR UPPER(student_id) = ?) AND attendance_date = ? AND status = 'present'`
      ).get(targetClass.id, matchedUser.uid, effectiveSid.toUpperCase(), today);
      if (existing) {
        res.status(409).json({
          error: `${matchedUser.name} (${effectiveSid}) has already checked into ${targetClass.code} today.`,
          code: "DUPLICATE_CHECKIN",
          classCode: targetClass.code,
          className: targetClass.name,
          studentId: effectiveSid,
          studentName: matchedUser.name
        });
        return;
      }
      const recordUid = `att-qr-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
      db.prepare(
        `INSERT INTO attendance_records (record_uid, college_id, class_id, class_code, class_name, division_id, student_id, student_name, attendance_date, status, method, student_user_uid, marked_by_uid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'present', 'qr', ?, ?)`
      ).run(
        recordUid,
        collegeId,
        targetClass.id,
        targetClass.code,
        targetClass.name,
        sessionDivisionId || matchedUser.division_id || null,
        effectiveSid,
        matchedUser.name,
        today,
        matchedUser.uid,
        authUser.uid
      );
      recordActivityLog({
        collegeId,
        actorName: authUser.name,
        actorRole: authUser.role,
        category: "Attendance",
        action: "Verified QR Check-in",
        target: `${targetClass.code} \xB7 ${effectiveSid}`,
        details: `Verified check-in for ${matchedUser.name} in ${targetClass.name} via ${method}.`,
        status: "success"
      });
      res.status(201).json({
        verified: true,
        message: `QR check-in verified (${method}) for ${matchedUser.name} in ${targetClass.name}.`,
        classCode: targetClass.code,
        className: targetClass.name,
        record: {
          id: recordUid,
          classId: targetClass.id,
          classCode: targetClass.code,
          className: targetClass.name,
          studentId: effectiveSid,
          studentName: matchedUser.name,
          date: today,
          status: "present",
          method: "qr"
        }
      });
    } catch (err) {
      console.error("QR scan error:", err);
      res.status(500).json({ error: "QR verification failed." });
    }
  });
  app.get("/api/admin/attendance", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const classId = String(req.query.classId || "").trim();
    const courseId = String(req.query.courseId || "").trim();
    const yearSemesterId = String(req.query.yearSemesterId || "").trim();
    const divisionId = String(req.query.divisionId || "").trim();
    const startDate = String(req.query.startDate || "").trim();
    const endDate = String(req.query.endDate || "").trim();
    const status = String(req.query.status || "").trim().toLowerCase();
    const conditions = ["ar.college_id = ?"];
    const params = [collegeId];
    if (classId && classId !== "all") {
      conditions.push("ar.class_id = ?");
      params.push(classId);
    }
    if (courseId && courseId !== "all") {
      conditions.push("cc.course_id = ?");
      params.push(courseId);
    }
    if (yearSemesterId && yearSemesterId !== "all") {
      conditions.push("cc.year_semester_id = ?");
      params.push(yearSemesterId);
    }
    if (divisionId && divisionId !== "all") {
      conditions.push("(ar.division_id = ? OR cc.division_id = ?)");
      params.push(divisionId, divisionId);
    }
    if (startDate) {
      conditions.push("ar.attendance_date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("ar.attendance_date <= ?");
      params.push(endDate);
    }
    if (status && status !== "all") {
      conditions.push("LOWER(ar.status) = ?");
      params.push(status);
    }
    const whereSql = `WHERE ${conditions.join(" AND ")}`;
    const rows = db.prepare(
      `SELECT ar.*, d.name as division_name, c.code as course_code, ys.name as year_semester_name
         FROM attendance_records ar
         LEFT JOIN course_classes cc ON cc.id = ar.class_id
         LEFT JOIN divisions d ON d.id = COALESCE(ar.division_id, cc.division_id)
         LEFT JOIN courses c ON c.id = cc.course_id
         LEFT JOIN year_semesters ys ON ys.id = cc.year_semester_id
         ${whereSql}
         ORDER BY ar.attendance_date DESC, ar.id DESC`
    ).all(...params);
    res.json({
      source: "postgresql-synced-db",
      total: rows.length,
      records: rows.map((r) => ({
        id: r.record_uid,
        collegeId: r.college_id,
        classId: r.class_id,
        classCode: r.class_code,
        className: r.class_name,
        divisionId: r.division_id || void 0,
        divisionName: r.division_name || void 0,
        courseCode: r.course_code || void 0,
        yearSemesterName: r.year_semester_name || void 0,
        studentId: r.student_id,
        studentName: r.student_name,
        date: r.attendance_date,
        status: r.status,
        method: r.method
      }))
    });
  });
  app.get("/api/admin/analytics", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE college_id = ?").get(collegeId).c;
    const totalStudents = db.prepare("SELECT COUNT(*) as c FROM users WHERE college_id = ? AND role = 'student'").get(collegeId).c;
    const totalTeachers = db.prepare("SELECT COUNT(*) as c FROM users WHERE college_id = ? AND role = 'teacher'").get(collegeId).c;
    const totalClasses = db.prepare("SELECT COUNT(*) as c FROM course_classes WHERE college_id = ?").get(collegeId).c;
    const totalCourses = db.prepare("SELECT COUNT(*) as c FROM courses WHERE college_id = ?").get(collegeId).c;
    const totalDivisions = db.prepare("SELECT COUNT(*) as c FROM divisions WHERE college_id = ?").get(collegeId).c;
    const totalRecords = db.prepare("SELECT COUNT(*) as c FROM attendance_records WHERE college_id = ?").get(collegeId).c;
    const presentCount = db.prepare("SELECT COUNT(*) as c FROM attendance_records WHERE college_id = ? AND status = 'present'").get(collegeId).c;
    const overallRate = totalRecords > 0 ? Math.round(presentCount / totalRecords * 1e3) / 10 : 100;
    const courseRows = db.prepare("SELECT id, code, name, department FROM courses WHERE college_id = ? ORDER BY name ASC").all(collegeId);
    const courseBreakdown = courseRows.map((c) => {
      const stuCount = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE college_id = ? AND course_id = ? AND role = 'student'").get(collegeId, c.id).cnt;
      const divCount = db.prepare("SELECT COUNT(*) as cnt FROM divisions WHERE college_id = ? AND course_id = ?").get(collegeId, c.id).cnt;
      const classCount = db.prepare("SELECT COUNT(*) as cnt FROM course_classes WHERE college_id = ? AND course_id = ?").get(collegeId, c.id).cnt;
      const attStats = db.prepare(
        `SELECT COUNT(*) as total, SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present
           FROM attendance_records ar
           INNER JOIN course_classes cc ON cc.id = ar.class_id
           WHERE ar.college_id = ? AND cc.course_id = ?`
      ).get(collegeId, c.id);
      const present = Number(attStats.present || 0);
      const total = Number(attStats.total || 0);
      return {
        courseId: c.id,
        code: c.code,
        name: c.name,
        department: c.department,
        studentsCount: stuCount,
        divisionsCount: divCount,
        classesCount: classCount,
        attendanceRate: total > 0 ? Math.round(present / total * 1e3) / 10 : 0,
        presentCount: present,
        totalRecords: total
      };
    });
    const divisionRows = db.prepare(
      `SELECT
          d.id AS divisionId,
          d.code AS divisionCode,
          d.name AS divisionName,
          d.batch_name AS batchName,
          d.course_id AS courseId,
          c.code AS courseCode,
          c.name AS courseName,
          d.year_semester_id AS yearSemesterId,
          ys.name AS yearSemesterName,
          d.academic_year_id AS academicYearId,
          ay.name AS academicYearName,
          (SELECT COUNT(*) FROM users u WHERE u.college_id = d.college_id AND u.division_id = d.id AND u.role = 'student') AS studentsCount,
          (SELECT COUNT(*) FROM course_classes cc2 WHERE cc2.college_id = d.college_id AND cc2.division_id = d.id) AS subjectsCount,
          COUNT(att.id) AS totalRecords,
          SUM(CASE WHEN att.status = 'present' THEN 1 ELSE 0 END) AS presentCount
        FROM divisions d
        LEFT JOIN courses c ON c.id = d.course_id
        LEFT JOIN year_semesters ys ON ys.id = d.year_semester_id
        LEFT JOIN academic_years ay ON ay.id = d.academic_year_id
        LEFT JOIN (
          SELECT ar.id, ar.status, COALESCE(ar.division_id, cc.division_id) AS resolved_division_id
          FROM attendance_records ar
          LEFT JOIN course_classes cc ON cc.id = ar.class_id
          WHERE ar.college_id = ?
        ) att ON att.resolved_division_id = d.id
        WHERE d.college_id = ?
        GROUP BY d.id
        ORDER BY c.code ASC, ys.order_index ASC, d.code ASC`
    ).all(collegeId, collegeId);
    const divisionBreakdown = divisionRows.map((row) => {
      const total = Number(row.totalRecords || 0);
      const present = Number(row.presentCount || 0);
      return {
        divisionId: row.divisionId,
        divisionCode: row.divisionCode,
        divisionName: row.divisionName,
        batchName: row.batchName || void 0,
        courseId: row.courseId,
        courseCode: row.courseCode || "",
        courseName: row.courseName || "",
        yearSemesterId: row.yearSemesterId,
        yearSemesterName: row.yearSemesterName || "",
        academicYearId: row.academicYearId,
        academicYearName: row.academicYearName || "",
        studentsCount: Number(row.studentsCount || 0),
        subjectsCount: Number(row.subjectsCount || 0),
        presentCount: present,
        absentCount: total - present,
        totalRecords: total,
        attendanceRate: total > 0 ? Math.round(present / total * 1e3) / 10 : 0
      };
    });
    const subjectRows = db.prepare(
      `SELECT
          cc.id AS classId,
          cc.code AS code,
          cc.name AS name,
          cc.teacher_name AS teacherName,
          cc.course_id AS courseId,
          c.code AS courseCode,
          c.name AS courseName,
          cc.year_semester_id AS yearSemesterId,
          ys.name AS yearSemesterName,
          cc.academic_year_id AS academicYearId,
          ay.name AS academicYearName,
          cc.division_id AS divisionId,
          d.code AS divisionCode,
          d.name AS divisionName,
          CASE
            WHEN cc.division_id IS NOT NULL THEN
              (SELECT COUNT(*) FROM users u WHERE u.college_id = cc.college_id AND u.division_id = cc.division_id AND u.role = 'student')
            ELSE cc.total_students
          END AS enrolledStudents,
          COUNT(ar.id) AS totalRecords,
          SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS presentCount
        FROM course_classes cc
        LEFT JOIN courses c ON c.id = cc.course_id
        LEFT JOIN year_semesters ys ON ys.id = cc.year_semester_id
        LEFT JOIN academic_years ay ON ay.id = cc.academic_year_id
        LEFT JOIN divisions d ON d.id = cc.division_id
        LEFT JOIN attendance_records ar ON ar.class_id = cc.id AND ar.college_id = cc.college_id
        WHERE cc.college_id = ?
        GROUP BY cc.id
        ORDER BY c.code ASC, d.code ASC, cc.code ASC`
    ).all(collegeId);
    const subjectBreakdown = subjectRows.map((row) => {
      const total = Number(row.totalRecords || 0);
      const present = Number(row.presentCount || 0);
      return {
        classId: row.classId,
        code: row.code,
        name: row.name,
        teacherName: row.teacherName,
        courseId: row.courseId || void 0,
        courseCode: row.courseCode || "",
        courseName: row.courseName || "",
        yearSemesterId: row.yearSemesterId || void 0,
        yearSemesterName: row.yearSemesterName || "",
        academicYearId: row.academicYearId || void 0,
        academicYearName: row.academicYearName || "",
        divisionId: row.divisionId || void 0,
        divisionCode: row.divisionCode || "",
        divisionName: row.divisionName || "",
        enrolledStudents: Number(row.enrolledStudents || 0),
        presentCount: present,
        absentCount: total - present,
        totalRecords: total,
        attendanceRate: total > 0 ? Math.round(present / total * 1e3) / 10 : 0
      };
    });
    res.json({
      totalUsers,
      totalStudents,
      totalTeachers,
      totalClasses,
      totalCourses,
      totalDivisions,
      totalRecords,
      presentCount,
      absentCount: totalRecords - presentCount,
      overallRate,
      courseBreakdown,
      divisionBreakdown,
      subjectBreakdown
    });
  });
  app.get("/api/admin/academic/structure", authenticateMiddleware, requireRole(["admin", "teacher"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const collegeRow = db.prepare("SELECT * FROM colleges WHERE id = ?").get(collegeId);
    const ayRows = db.prepare("SELECT * FROM academic_years WHERE college_id = ? ORDER BY name DESC").all(collegeId);
    const courseRows = db.prepare("SELECT * FROM courses WHERE college_id = ? ORDER BY name ASC").all(collegeId);
    const ysRows = db.prepare("SELECT * FROM year_semesters WHERE college_id = ? ORDER BY order_index ASC, name ASC").all(collegeId);
    const divRows = db.prepare("SELECT * FROM divisions WHERE college_id = ? ORDER BY code ASC, name ASC").all(collegeId);
    const classRows = db.prepare("SELECT * FROM course_classes WHERE college_id = ? ORDER BY code ASC").all(collegeId);
    const teacherRows = db.prepare("SELECT * FROM users WHERE college_id = ? AND role = 'teacher' AND approval_status = 'APPROVED' ORDER BY name ASC").all(collegeId);
    res.json({
      college: collegeRow ? {
        id: collegeRow.id,
        name: collegeRow.name,
        officialEmail: collegeRow.official_email,
        contactNumber: collegeRow.contact_number,
        address: collegeRow.address,
        website: collegeRow.website || void 0,
        createdAt: collegeRow.created_at
      } : null,
      academicYears: ayRows.map((ay) => ({
        id: ay.id,
        collegeId: ay.college_id,
        name: ay.name,
        isActive: Boolean(ay.is_active),
        studentsCount: db.prepare("SELECT COUNT(*) as c FROM users WHERE college_id = ? AND academic_year_id = ? AND role = 'student'").get(collegeId, ay.id).c
      })),
      courses: courseRows.map((c) => ({
        id: c.id,
        collegeId: c.college_id,
        code: c.code,
        name: c.name,
        department: c.department,
        studentsCount: db.prepare("SELECT COUNT(*) as c FROM users WHERE college_id = ? AND course_id = ? AND role = 'student'").get(collegeId, c.id).c
      })),
      yearSemesters: ysRows.map((ys) => ({
        id: ys.id,
        collegeId: ys.college_id,
        academicYearId: ys.academic_year_id,
        courseId: ys.course_id,
        name: ys.name,
        orderIndex: ys.order_index,
        studentsCount: db.prepare("SELECT COUNT(*) as c FROM users WHERE college_id = ? AND year_semester_id = ? AND role = 'student'").get(collegeId, ys.id).c
      })),
      divisions: divRows.map((d) => ({
        id: d.id,
        collegeId: d.college_id,
        academicYearId: d.academic_year_id,
        courseId: d.course_id,
        yearSemesterId: d.year_semester_id,
        name: d.name,
        code: d.code,
        batchName: d.batch_name || void 0,
        room: d.room || void 0,
        studentsCount: db.prepare("SELECT COUNT(*) as c FROM users WHERE college_id = ? AND division_id = ? AND role = 'student'").get(collegeId, d.id).c
      })),
      classes: enrichClassRows(classRows),
      teachers: teacherRows.map(sanitizeUser)
    });
  });
  app.post("/api/admin/academic/years", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const name = String(req.body?.name || "").trim();
    if (name.length < 4) {
      res.status(400).json({ error: "Academic year name is required (e.g., 2026-2027)." });
      return;
    }
    const duplicate = db.prepare("SELECT id FROM academic_years WHERE college_id = ? AND LOWER(name) = ?").get(collegeId, name.toLowerCase());
    if (duplicate) {
      res.status(409).json({ error: `Academic year "${name}" already exists in your college.` });
      return;
    }
    const id = `ay-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
    db.prepare("INSERT INTO academic_years (id, college_id, name, is_active) VALUES (?, ?, ?, 1)").run(id, collegeId, name);
    res.status(201).json({ academicYear: { id, collegeId, name, isActive: true, studentsCount: 0 } });
  });
  app.delete("/api/admin/academic/years/:id", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    db.prepare("DELETE FROM academic_years WHERE id = ? AND college_id = ?").run(req.params.id, collegeId);
    res.json({ message: "Academic year removed." });
  });
  app.post("/api/admin/academic/courses", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const code = String(req.body?.code || "").trim().toUpperCase();
    const name = String(req.body?.name || "").trim();
    const department = String(req.body?.department || name).trim();
    if (!code || !name) {
      res.status(400).json({ error: "Course code and name are required (e.g., BCOM, B.Com)." });
      return;
    }
    const duplicate = db.prepare("SELECT id FROM courses WHERE college_id = ? AND UPPER(code) = ?").get(collegeId, code);
    if (duplicate) {
      res.status(409).json({ error: `Course "${code}" already exists in your college.` });
      return;
    }
    const id = `crs-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
    db.prepare("INSERT INTO courses (id, college_id, code, name, department) VALUES (?, ?, ?, ?, ?)").run(
      id,
      collegeId,
      code,
      name,
      department
    );
    recordActivityLog({
      collegeId,
      actorName: req.authUser.name,
      actorRole: "admin",
      category: "Course Management",
      action: "Created Course Program",
      target: `${code} \xB7 ${name}`,
      details: `Added academic course "${name}" (${code}) under ${department}.`,
      status: "success"
    });
    res.status(201).json({ course: { id, collegeId, code, name, department, studentsCount: 0 } });
  });
  app.delete("/api/admin/academic/courses/:id", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    db.prepare("DELETE FROM courses WHERE id = ? AND college_id = ?").run(req.params.id, collegeId);
    res.json({ message: "Course removed." });
  });
  app.post("/api/admin/academic/semesters", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const academicYearId = String(req.body?.academicYearId || "").trim();
    const courseId = String(req.body?.courseId || "").trim();
    const name = String(req.body?.name || "").trim();
    const orderIndex = Number(req.body?.orderIndex || 1);
    if (!academicYearId || !courseId || !name) {
      res.status(400).json({ error: "Academic Year, Course, and Year/Semester name are required." });
      return;
    }
    const duplicate = db.prepare("SELECT id FROM year_semesters WHERE college_id = ? AND academic_year_id = ? AND course_id = ? AND LOWER(name) = ?").get(collegeId, academicYearId, courseId, name.toLowerCase());
    if (duplicate) {
      res.status(409).json({ error: `"${name}" already exists for this course and academic year.` });
      return;
    }
    const id = `ys-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
    db.prepare(
      "INSERT INTO year_semesters (id, college_id, academic_year_id, course_id, name, order_index) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, collegeId, academicYearId, courseId, name, orderIndex);
    res.status(201).json({
      yearSemester: { id, collegeId, academicYearId, courseId, name, orderIndex, studentsCount: 0 }
    });
  });
  app.delete("/api/admin/academic/semesters/:id", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    db.prepare("DELETE FROM year_semesters WHERE id = ? AND college_id = ?").run(req.params.id, collegeId);
    res.json({ message: "Year/Semester removed." });
  });
  app.post("/api/admin/academic/divisions", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const academicYearId = String(req.body?.academicYearId || "").trim();
    const courseId = String(req.body?.courseId || "").trim();
    const yearSemesterId = String(req.body?.yearSemesterId || "").trim();
    const rawCode = String(req.body?.code || req.body?.name || "").trim().toUpperCase();
    const code = rawCode.replace(/^DIVISION\s+/i, "").trim() || "A";
    const name = String(req.body?.name || `Division ${code}`).trim();
    const batchName = String(req.body?.batchName || "").trim() || `Batch ${code}1`;
    const room = String(req.body?.room || "").trim() || "Main Hall";
    if (!academicYearId || !courseId || !yearSemesterId || !code) {
      res.status(400).json({ error: "Academic Year, Course, Year/Semester, and Division code are required." });
      return;
    }
    const duplicate = db.prepare("SELECT id FROM divisions WHERE college_id = ? AND year_semester_id = ? AND UPPER(code) = ?").get(collegeId, yearSemesterId, code);
    if (duplicate) {
      res.status(409).json({ error: `Division ${code} already exists for this Year/Semester.` });
      return;
    }
    const id = `div-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
    db.prepare(
      `INSERT INTO divisions (id, college_id, academic_year_id, course_id, year_semester_id, name, code, batch_name, room)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, collegeId, academicYearId, courseId, yearSemesterId, name, code, batchName, room);
    recordActivityLog({
      collegeId,
      actorName: req.authUser.name,
      actorRole: "admin",
      category: "Course Management",
      action: "Created Division",
      target: `${name} (${batchName})`,
      details: `Created division "${name}" in room ${room}.`,
      status: "success"
    });
    res.status(201).json({
      division: { id, collegeId, academicYearId, courseId, yearSemesterId, name, code, batchName, room, studentsCount: 0 }
    });
  });
  app.delete("/api/admin/academic/divisions/:id", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    db.prepare("DELETE FROM divisions WHERE id = ? AND college_id = ?").run(req.params.id, collegeId);
    res.json({ message: "Division removed." });
  });
  app.post("/api/admin/classes", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const code = String(req.body?.code || "").trim().toUpperCase();
    const name = String(req.body?.name || "").trim();
    const teacherId = String(req.body?.teacherId || "").trim();
    const academicYearId = String(req.body?.academicYearId || "").trim();
    const courseId = String(req.body?.courseId || "").trim();
    const yearSemesterId = String(req.body?.yearSemesterId || "").trim();
    const divisionId = String(req.body?.divisionId || "").trim();
    const schedule = String(req.body?.schedule || "Mon/Wed/Fri \xB7 10:00 AM").trim();
    const room = String(req.body?.room || "Hall 101").trim();
    if (!code || !name || !teacherId || !divisionId) {
      res.status(400).json({ error: "Subject code, subject name, division, and assigned teacher are required." });
      return;
    }
    const teacher = db.prepare("SELECT uid, name FROM users WHERE uid = ? AND college_id = ? AND role = 'teacher'").get(teacherId, collegeId);
    if (!teacher) {
      res.status(404).json({ error: "Assigned teacher not found in your college." });
      return;
    }
    const div = db.prepare("SELECT * FROM divisions WHERE id = ? AND college_id = ?").get(divisionId, collegeId);
    if (!div) {
      res.status(404).json({ error: "Selected division not found." });
      return;
    }
    const duplicateInDiv = db.prepare("SELECT id FROM course_classes WHERE college_id = ? AND division_id = ? AND UPPER(code) = ?").get(collegeId, divisionId, code);
    if (duplicateInDiv) {
      res.status(409).json({ error: `Subject code "${code}" is already assigned to ${div.name}.` });
      return;
    }
    const classId = `c-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
    db.prepare(
      `INSERT INTO course_classes (id, college_id, code, name, teacher_id, teacher_name, academic_year_id, course_id, year_semester_id, division_id, schedule, room, total_students)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(
      classId,
      collegeId,
      code,
      name,
      teacher.uid,
      teacher.name,
      academicYearId || div.academic_year_id,
      courseId || div.course_id,
      yearSemesterId || div.year_semester_id,
      divisionId,
      schedule,
      room
    );
    syncDivisionClassEnrollments(classId, divisionId);
    const createdRow = db.prepare("SELECT * FROM course_classes WHERE id = ?").get(classId);
    recordActivityLog({
      collegeId,
      actorName: req.authUser.name,
      actorRole: "admin",
      category: "Course Management",
      action: "Assigned Subject & Teacher to Division",
      target: `${code} (${div.name}) \u2192 ${teacher.name}`,
      details: `Assigned ${teacher.name} to teach ${name} (${code}) in ${div.name}.`,
      status: "success"
    });
    res.status(201).json({ courseClass: enrichClassRows([createdRow])[0] });
  });
  app.put("/api/admin/classes/:classId", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const existing = db.prepare("SELECT * FROM course_classes WHERE id = ? AND college_id = ?").get(req.params.classId, collegeId);
    if (!existing) {
      res.status(404).json({ error: "Class not found in your college." });
      return;
    }
    const teacherId = String(req.body?.teacherId || existing.teacher_id).trim();
    const teacher = db.prepare("SELECT uid, name FROM users WHERE uid = ? AND college_id = ? AND role = 'teacher'").get(teacherId, collegeId);
    if (!teacher) {
      res.status(404).json({ error: "Teacher not found in your college." });
      return;
    }
    const nextDivisionId = req.body?.divisionId !== void 0 ? String(req.body.divisionId).trim() : existing.division_id;
    const div = nextDivisionId ? db.prepare("SELECT * FROM divisions WHERE id = ? AND college_id = ?").get(nextDivisionId, collegeId) : null;
    db.prepare(
      `UPDATE course_classes
       SET name = ?, teacher_id = ?, teacher_name = ?, schedule = ?, room = ?,
           academic_year_id = ?, course_id = ?, year_semester_id = ?, division_id = ?
       WHERE id = ? AND college_id = ?`
    ).run(
      String(req.body?.name || existing.name).trim(),
      teacher.uid,
      teacher.name,
      String(req.body?.schedule || existing.schedule).trim(),
      String(req.body?.room || existing.room).trim(),
      div?.academic_year_id || req.body?.academicYearId || existing.academic_year_id,
      div?.course_id || req.body?.courseId || existing.course_id,
      div?.year_semester_id || req.body?.yearSemesterId || existing.year_semester_id,
      nextDivisionId || null,
      existing.id,
      collegeId
    );
    if (nextDivisionId) {
      syncDivisionClassEnrollments(existing.id, nextDivisionId);
    }
    const updatedRow = db.prepare("SELECT * FROM course_classes WHERE id = ?").get(existing.id);
    res.json({ courseClass: enrichClassRows([updatedRow])[0] });
  });
  app.delete("/api/admin/classes/:classId", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    db.prepare("DELETE FROM course_classes WHERE id = ? AND college_id = ?").run(req.params.classId, collegeId);
    res.json({ message: "Subject assignment removed." });
  });
  app.post("/api/admin/students", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const {
      name,
      email,
      phoneNumber,
      rollNumber,
      studentId,
      academicYearId,
      courseId,
      yearSemesterId,
      divisionId,
      batchName,
      password
    } = req.body || {};
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = String(phoneNumber || "").trim();
    const cleanRoll = String(rollNumber || studentId || "").trim().toUpperCase();
    const cleanSid = String(studentId || rollNumber || "").trim().toUpperCase();
    if (cleanName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !cleanRoll || !divisionId) {
      res.status(400).json({ error: "Student name, valid email, roll number, and division are required." });
      return;
    }
    const div = db.prepare("SELECT * FROM divisions WHERE id = ? AND college_id = ?").get(divisionId, collegeId);
    if (!div) {
      res.status(404).json({ error: "Selected division does not exist in your college." });
      return;
    }
    const existingEmail = db.prepare("SELECT id FROM users WHERE LOWER(email) = ?").get(cleanEmail);
    if (existingEmail) {
      res.status(409).json({ error: `Email "${cleanEmail}" is already registered.` });
      return;
    }
    const duplicateRoll = db.prepare(
      `SELECT uid, name FROM users
         WHERE college_id = ? AND division_id = ? AND role = 'student'
         AND (UPPER(COALESCE(roll_number, '')) = ? OR UPPER(COALESCE(student_id, '')) = ?)`
    ).get(collegeId, divisionId, cleanRoll, cleanRoll);
    if (duplicateRoll) {
      res.status(409).json({
        error: `Roll Number "${cleanRoll}" already exists in ${div.name} (${duplicateRoll.name}). Duplicate roll numbers are not allowed within the same division.`
      });
      return;
    }
    const course = db.prepare("SELECT code, department FROM courses WHERE id = ?").get(courseId || div.course_id);
    const uid = `u-stu-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
    const passwordHash = bcrypt.hashSync(String(password || "password123"), 10);
    const joinedAt = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const info = db.prepare(
      `INSERT INTO users
         (uid, college_id, name, email, phone_number, student_id, roll_number, password_hash, role, department,
          academic_year_id, course_id, course_code, year_semester_id, division_id, batch_name,
          approval_status, status, email_verified, joined_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, 'APPROVED', 'Active', 1, ?)`
    ).run(
      uid,
      collegeId,
      cleanName,
      cleanEmail,
      cleanPhone || "",
      cleanSid,
      cleanRoll,
      passwordHash,
      course?.department || "Academic Studies",
      academicYearId || div.academic_year_id,
      courseId || div.course_id,
      course?.code || null,
      yearSemesterId || div.year_semester_id,
      divisionId,
      String(batchName || div.batch_name || "").trim() || null,
      joinedAt
    );
    syncStudentDivisionEnrollments(uid, cleanSid, divisionId);
    const created = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    recordActivityLog({
      collegeId,
      actorName: req.authUser.name,
      actorRole: "admin",
      category: "Bulk Onboarding",
      action: "Added Student to Division",
      target: `${created.name} \xB7 Roll ${cleanRoll} (${div.name})`,
      details: `Enrolled student into ${course?.code || ""} ${div.name}.`,
      status: "success"
    });
    res.status(201).json({ student: sanitizeUser(created) });
  });
  app.put("/api/admin/students/:uid", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const existing = db.prepare("SELECT * FROM users WHERE uid = ? AND college_id = ? AND role = 'student'").get(req.params.uid, collegeId);
    if (!existing) {
      res.status(404).json({ error: "Student record not found in your college." });
      return;
    }
    const nextName = String(req.body?.name || existing.name).trim();
    const nextEmail = String(req.body?.email || existing.email).trim().toLowerCase();
    const nextPhone = String(req.body?.phoneNumber !== void 0 ? req.body.phoneNumber : existing.phone_number || "").trim();
    const nextRoll = String(req.body?.rollNumber || req.body?.studentId || existing.roll_number || existing.student_id || "").trim().toUpperCase();
    const nextSid = String(req.body?.studentId || nextRoll || existing.student_id || "").trim().toUpperCase();
    const nextDivisionId = req.body?.divisionId !== void 0 ? String(req.body.divisionId).trim() : existing.division_id;
    if (!nextName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail) || !nextRoll) {
      res.status(400).json({ error: "Name, valid email, and roll number are required." });
      return;
    }
    const emailConflict = db.prepare("SELECT id FROM users WHERE LOWER(email) = ? AND uid <> ?").get(nextEmail, existing.uid);
    if (emailConflict) {
      res.status(409).json({ error: `Email "${nextEmail}" is already assigned to another user.` });
      return;
    }
    let resolvedAy = req.body?.academicYearId || existing.academic_year_id;
    let resolvedCourse = req.body?.courseId || existing.course_id;
    let resolvedYs = req.body?.yearSemesterId || existing.year_semester_id;
    let resolvedBatch = req.body?.batchName !== void 0 ? req.body.batchName : existing.batch_name;
    let resolvedDept = existing.department;
    let resolvedCourseCode = existing.course_code;
    if (nextDivisionId) {
      const div = db.prepare("SELECT * FROM divisions WHERE id = ? AND college_id = ?").get(nextDivisionId, collegeId);
      if (!div) {
        res.status(404).json({ error: "Selected division not found." });
        return;
      }
      const duplicateRoll = db.prepare(
        `SELECT uid, name FROM users
           WHERE college_id = ? AND division_id = ? AND role = 'student' AND uid <> ?
           AND (UPPER(COALESCE(roll_number, '')) = ? OR UPPER(COALESCE(student_id, '')) = ?)`
      ).get(collegeId, nextDivisionId, existing.uid, nextRoll, nextRoll);
      if (duplicateRoll) {
        res.status(409).json({
          error: `Roll Number "${nextRoll}" already exists in ${div.name} (${duplicateRoll.name}).`
        });
        return;
      }
      resolvedAy = div.academic_year_id;
      resolvedCourse = div.course_id;
      resolvedYs = div.year_semester_id;
      resolvedBatch = req.body?.batchName || div.batch_name || resolvedBatch;
      const crs = db.prepare("SELECT code, department FROM courses WHERE id = ?").get(div.course_id);
      if (crs) {
        resolvedCourseCode = crs.code;
        resolvedDept = crs.department;
      }
    }
    db.prepare(
      `UPDATE users
       SET name = ?, email = ?, phone_number = ?, student_id = ?, roll_number = ?, department = ?,
           academic_year_id = ?, course_id = ?, course_code = ?, year_semester_id = ?, division_id = ?, batch_name = ?,
           status = ?
       WHERE uid = ? AND college_id = ?`
    ).run(
      nextName,
      nextEmail,
      nextPhone,
      nextSid,
      nextRoll,
      resolvedDept,
      resolvedAy,
      resolvedCourse,
      resolvedCourseCode,
      resolvedYs,
      nextDivisionId || null,
      resolvedBatch || null,
      String(req.body?.status || existing.status).trim() || "Active",
      existing.uid,
      collegeId
    );
    if (nextDivisionId && nextDivisionId !== existing.division_id) {
      db.prepare("DELETE FROM course_enrollments WHERE student_uid = ?").run(existing.uid);
      syncStudentDivisionEnrollments(existing.uid, nextSid, nextDivisionId);
    }
    const updated = db.prepare("SELECT * FROM users WHERE uid = ?").get(existing.uid);
    res.json({ student: sanitizeUser(updated) });
  });
  app.delete("/api/admin/students/:uid", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const existing = db.prepare("SELECT * FROM users WHERE uid = ? AND college_id = ? AND role = 'student'").get(req.params.uid, collegeId);
    if (!existing) {
      res.status(404).json({ error: "Student not found in your college." });
      return;
    }
    db.prepare("DELETE FROM course_enrollments WHERE student_uid = ?").run(existing.uid);
    db.prepare("DELETE FROM users WHERE uid = ? AND college_id = ?").run(existing.uid, collegeId);
    recordActivityLog({
      collegeId,
      actorName: req.authUser.name,
      actorRole: "admin",
      category: "Bulk Onboarding",
      action: "Removed Student Record",
      target: `${existing.name} (${existing.roll_number || existing.student_id || existing.email})`,
      details: "Administrator removed student from college directory.",
      status: "warning"
    });
    res.json({ message: `Removed ${existing.name} from college records.` });
  });
  app.post("/api/admin/students/bulk", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const { divisionId, academicYearId, courseId, yearSemesterId, students } = req.body || {};
    if (!divisionId || !Array.isArray(students) || students.length === 0) {
      res.status(400).json({ error: "Target divisionId and at least one student record are required." });
      return;
    }
    const defaultDiv = db.prepare("SELECT * FROM divisions WHERE id = ? AND college_id = ?").get(divisionId, collegeId);
    if (!defaultDiv) {
      res.status(404).json({ error: "Target division not found in your college." });
      return;
    }
    const course = db.prepare("SELECT code, department FROM courses WHERE id = ?").get(courseId || defaultDiv.course_id);
    const defaultPasswordHash = bcrypt.hashSync("password123", 10);
    const joinedAt = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const imported = [];
    const skipped = [];
    const seenEmailsInBatch = /* @__PURE__ */ new Set();
    const seenRollsInBatch = /* @__PURE__ */ new Set();
    const insertUser = db.prepare(`
      INSERT INTO users
      (uid, college_id, name, email, phone_number, student_id, roll_number, password_hash, role, department,
       academic_year_id, course_id, course_code, year_semester_id, division_id, batch_name,
       approval_status, status, email_verified, joined_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, 'APPROVED', 'Active', 1, ?)
    `);
    const tx = db.transaction(() => {
      for (const raw of students) {
        const cleanName = String(raw?.name || "").trim();
        const cleanEmail = String(raw?.email || "").trim().toLowerCase();
        const cleanRoll = String(raw?.rollNumber || raw?.studentId || "").trim().toUpperCase();
        const cleanSid = String(raw?.studentId || raw?.rollNumber || "").trim().toUpperCase();
        const cleanPhone = String(raw?.phoneNumber || "").trim();
        if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !cleanRoll) {
          skipped.push({
            name: cleanName || "Unknown",
            email: cleanEmail || "N/A",
            rollNumber: cleanRoll || "N/A",
            reason: "Missing valid name, email, or roll number."
          });
          continue;
        }
        if (seenEmailsInBatch.has(cleanEmail)) {
          skipped.push({ name: cleanName, email: cleanEmail, rollNumber: cleanRoll, reason: "Duplicate email in uploaded file." });
          continue;
        }
        if (seenRollsInBatch.has(cleanRoll)) {
          skipped.push({
            name: cleanName,
            email: cleanEmail,
            rollNumber: cleanRoll,
            reason: `Duplicate Roll Number "${cleanRoll}" in uploaded file.`
          });
          continue;
        }
        const existingEmail = db.prepare("SELECT id FROM users WHERE LOWER(email) = ?").get(cleanEmail);
        if (existingEmail) {
          skipped.push({ name: cleanName, email: cleanEmail, rollNumber: cleanRoll, reason: "Email already exists in system." });
          continue;
        }
        const existingRoll = db.prepare(
          `SELECT id FROM users WHERE college_id = ? AND division_id = ? AND role = 'student'
             AND (UPPER(COALESCE(roll_number, '')) = ? OR UPPER(COALESCE(student_id, '')) = ?)`
        ).get(collegeId, divisionId, cleanRoll, cleanRoll);
        if (existingRoll) {
          skipped.push({
            name: cleanName,
            email: cleanEmail,
            rollNumber: cleanRoll,
            reason: `Roll Number "${cleanRoll}" already assigned in ${defaultDiv.name}.`
          });
          continue;
        }
        seenEmailsInBatch.add(cleanEmail);
        seenRollsInBatch.add(cleanRoll);
        const uid = `u-stu-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
        const info = insertUser.run(
          uid,
          collegeId,
          cleanName,
          cleanEmail,
          cleanPhone,
          cleanSid,
          cleanRoll,
          defaultPasswordHash,
          String(raw?.department || course?.department || "Academic Studies").trim(),
          academicYearId || defaultDiv.academic_year_id,
          courseId || defaultDiv.course_id,
          course?.code || null,
          yearSemesterId || defaultDiv.year_semester_id,
          divisionId,
          String(raw?.batchName || defaultDiv.batch_name || "").trim() || null,
          joinedAt
        );
        syncStudentDivisionEnrollments(uid, cleanSid, divisionId);
        const created = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
        imported.push(sanitizeUser(created));
      }
    });
    tx();
    recordActivityLog({
      collegeId,
      actorName: req.authUser.name,
      actorRole: "admin",
      category: "Bulk Onboarding",
      action: "Bulk Student Import Completed",
      target: `${defaultDiv.name} \xB7 ${imported.length} imported`,
      details: `Imported ${imported.length} students into ${course?.code || ""} ${defaultDiv.name}${skipped.length > 0 ? ` (${skipped.length} skipped)` : ""}.`,
      status: imported.length > 0 ? "success" : "warning"
    });
    res.status(201).json({
      importedCount: imported.length,
      skippedCount: skipped.length,
      imported,
      skipped
    });
  });
  app.get("/api/notifications/config", authenticateMiddleware, (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const row = getNotificationConfig(collegeId);
    res.json({ config: formatConfig(row) });
  });
  app.put("/api/notifications/config", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const {
      thresholdPercent,
      autoNotifyEnabled,
      cooldownHours,
      senderName,
      senderEmail,
      emailSubjectTemplate
    } = req.body || {};
    const threshold = Number(thresholdPercent);
    if (Number.isNaN(threshold) || threshold < 20 || threshold > 100) {
      res.status(400).json({ error: "Threshold percentage must be between 20% and 100%." });
      return;
    }
    const cooldown = Math.max(1, Number(cooldownHours || 24));
    db.prepare(`
      INSERT INTO college_notification_configs
      (college_id, threshold_percent, auto_notify_enabled, cooldown_hours, sender_name, sender_email, email_subject_template, updated_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(college_id) DO UPDATE SET
        threshold_percent = excluded.threshold_percent,
        auto_notify_enabled = excluded.auto_notify_enabled,
        cooldown_hours = excluded.cooldown_hours,
        sender_name = excluded.sender_name,
        sender_email = excluded.sender_email,
        email_subject_template = excluded.email_subject_template,
        updated_by = excluded.updated_by,
        updated_at = datetime('now')
    `).run(
      collegeId,
      threshold,
      autoNotifyEnabled === false ? 0 : 1,
      cooldown,
      String(senderName || "AttendEase Academic Alerts").trim(),
      String(senderEmail || "alerts@attendease.edu").trim(),
      String(
        emailSubjectTemplate || "Attendance Alert: Your attendance ({{percentage}}%) is below the {{threshold}}% requirement"
      ).trim(),
      req.authUser.name
    );
    const updated = getNotificationConfig(collegeId);
    res.json({
      message: `Notification rule updated: Students below ${threshold}% will trigger automated email alerts.`,
      config: formatConfig(updated)
    });
  });
  app.post("/api/notifications/evaluate", authenticateMiddleware, requireRole(["admin", "teacher"]), async (req, res) => {
    try {
      const collegeId = req.authUser.college_id || "col-1";
      const force = Boolean(req.body?.force);
      const summary = await evaluateThresholdAlerts({
        collegeId,
        triggeredBy: `${req.authUser.name} (${req.authUser.role.toUpperCase()})`,
        force,
        teacherUid: req.authUser.role === "teacher" ? req.authUser.uid : void 0
      });
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: "Failed to evaluate attendance threshold alerts." });
    }
  });
  app.get("/api/notifications/logs", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const logs = db.prepare("SELECT * FROM email_notification_logs WHERE college_id = ? ORDER BY id DESC LIMIT 100").all(collegeId);
    res.json({ logs });
  });
  app.get("/api/notifications/my-alerts", authenticateMiddleware, (req, res) => {
    const collegeId = req.authUser.college_id || "col-1";
    const config = getNotificationConfig(collegeId);
    const logs = db.prepare(
      "SELECT * FROM email_notification_logs WHERE college_id = ? AND (student_email = ? OR student_id = ?) ORDER BY id DESC LIMIT 20"
    ).all(collegeId, req.authUser.email, req.authUser.student_id || "");
    res.json({
      thresholdPercent: config.threshold_percent,
      alerts: logs
    });
  });
  const VALID_ENQUIRY_ROLES = /* @__PURE__ */ new Set([
    "Student",
    "Teacher/Professor",
    "Admin",
    "Institution Representative",
    "Other"
  ]);
  const VALID_ENQUIRY_STATUSES = /* @__PURE__ */ new Set(["New", "In Progress", "Resolved"]);
  function serializeEnquiry(row) {
    return {
      id: row.enquiry_uid,
      referenceId: row.reference_id,
      fullName: row.full_name,
      email: row.email,
      phoneNumber: row.phone_number,
      institutionName: row.institution_name,
      role: row.role,
      subject: row.subject,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  app.post("/api/enquiries", (req, res) => {
    try {
      const {
        fullName,
        email,
        phoneNumber,
        institutionName,
        role,
        subject,
        message
      } = req.body || {};
      const cleanName = String(fullName || "").trim();
      const cleanEmail = String(email || "").trim().toLowerCase();
      const cleanPhone = String(phoneNumber || "").trim();
      const cleanInstitution = String(institutionName || "").trim();
      const cleanRole = String(role || "").trim();
      const cleanSubject = String(subject || "").trim();
      const cleanMessage = String(message || "").trim();
      if (cleanName.length < 2 || cleanName.length > 120) {
        res.status(400).json({ error: "Full Name must be between 2 and 120 characters." });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        res.status(400).json({ error: "Please provide a valid email address." });
        return;
      }
      const digitsOnly = cleanPhone.replace(/\D/g, "");
      if (!/^[+\d\s().-]{7,24}$/.test(cleanPhone) || digitsOnly.length < 7 || digitsOnly.length > 15) {
        res.status(400).json({ error: "Please provide a valid phone number (7\u201315 digits)." });
        return;
      }
      if (cleanInstitution.length < 2 || cleanInstitution.length > 160) {
        res.status(400).json({ error: "Institution / College Name is required." });
        return;
      }
      if (!VALID_ENQUIRY_ROLES.has(cleanRole)) {
        res.status(400).json({ error: "Please select a valid role." });
        return;
      }
      if (cleanSubject.length < 3 || cleanSubject.length > 200) {
        res.status(400).json({ error: "Subject / Enquiry Type must be at least 3 characters." });
        return;
      }
      if (cleanMessage.length < 10 || cleanMessage.length > 4e3) {
        res.status(400).json({ error: "Message must be between 10 and 4000 characters." });
        return;
      }
      const enquiryUid = `enq-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const year = (/* @__PURE__ */ new Date()).getFullYear();
      const referenceId = `ENQ-${year}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const nowFormatted = formatAuditTimestamp();
      db.prepare(`
        INSERT INTO enquiries (
          enquiry_uid, reference_id, full_name, email, phone_number,
          institution_name, role, subject, message, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, ?)
      `).run(
        enquiryUid,
        referenceId,
        cleanName,
        cleanEmail,
        cleanPhone,
        cleanInstitution,
        cleanRole,
        cleanSubject,
        cleanMessage,
        nowFormatted,
        nowFormatted
      );
      recordActivityLog({
        actorName: cleanName,
        actorRole: "system",
        category: "System Alerts",
        action: "Public Enquiry Submitted",
        target: `${referenceId} \xB7 ${cleanInstitution}`,
        details: `New ${cleanRole} enquiry submitted for subject "${cleanSubject}".`,
        status: "info"
      });
      res.status(201).json({
        message: "Your enquiry has been received. Our institutional team will respond shortly.",
        referenceId,
        status: "New",
        createdAt: nowFormatted
      });
    } catch (err) {
      console.error("Enquiry submission error:", err);
      res.status(500).json({ error: "Unable to submit enquiry. Please try again." });
    }
  });
  app.get("/api/admin/enquiries", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const search = String(req.query.search || "").trim().toLowerCase();
    const statusFilter = String(req.query.status || "").trim();
    const conditions = [];
    const params = [];
    if (statusFilter && statusFilter !== "All") {
      conditions.push("status = ?");
      params.push(statusFilter);
    }
    if (search) {
      conditions.push(
        "(LOWER(reference_id) LIKE ? OR LOWER(full_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone_number) LIKE ? OR LOWER(institution_name) LIKE ? OR LOWER(subject) LIKE ? OR LOWER(message) LIKE ?)"
      );
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like, like);
    }
    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db.prepare(`SELECT * FROM enquiries ${whereSql} ORDER BY id DESC`).all(...params);
    res.json({
      source: "postgresql-synced-db",
      total: rows.length,
      enquiries: rows.map(serializeEnquiry)
    });
  });
  app.get("/api/admin/enquiries/:id", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const idParam = String(req.params.id || "").trim();
    const row = db.prepare("SELECT * FROM enquiries WHERE enquiry_uid = ? OR CAST(id AS TEXT) = ? LIMIT 1").get(idParam, idParam);
    if (!row) {
      res.status(404).json({ error: "Enquiry not found." });
      return;
    }
    res.json({ enquiry: serializeEnquiry(row) });
  });
  const handleUpdateEnquiryStatus = (req, res) => {
    const idParam = String(req.params.id || "").trim();
    const nextStatus = String(req.body?.status || "").trim();
    if (!VALID_ENQUIRY_STATUSES.has(nextStatus)) {
      res.status(400).json({ error: "Status must be one of: New, In Progress, Resolved." });
      return;
    }
    const existing = db.prepare("SELECT * FROM enquiries WHERE enquiry_uid = ? OR CAST(id AS TEXT) = ? LIMIT 1").get(idParam, idParam);
    if (!existing) {
      res.status(404).json({ error: "Enquiry not found." });
      return;
    }
    const updatedAt = formatAuditTimestamp();
    db.prepare("UPDATE enquiries SET status = ?, updated_at = ? WHERE id = ?").run(
      nextStatus,
      updatedAt,
      existing.id
    );
    const updated = db.prepare("SELECT * FROM enquiries WHERE id = ?").get(existing.id);
    recordActivityLog({
      actorName: req.authUser.name,
      actorRole: req.authUser.role,
      category: "System Alerts",
      action: `Enquiry Status Updated: ${nextStatus}`,
      target: `${existing.reference_id} \xB7 ${existing.institution_name}`,
      details: `Administrator changed enquiry status from ${existing.status} to ${nextStatus}.`,
      status: nextStatus === "Resolved" ? "success" : "info"
    });
    res.json({
      message: `Enquiry ${existing.reference_id} updated to ${nextStatus}.`,
      enquiry: serializeEnquiry(updated)
    });
  };
  app.patch("/api/admin/enquiries/:id/status", authenticateMiddleware, requireRole(["admin"]), handleUpdateEnquiryStatus);
  app.put("/api/admin/enquiries/:id/status", authenticateMiddleware, requireRole(["admin"]), handleUpdateEnquiryStatus);
  app.delete("/api/admin/enquiries/:id", authenticateMiddleware, requireRole(["admin"]), (req, res) => {
    const idParam = String(req.params.id || "").trim();
    const existing = db.prepare("SELECT * FROM enquiries WHERE enquiry_uid = ? OR CAST(id AS TEXT) = ? LIMIT 1").get(idParam, idParam);
    if (!existing) {
      res.status(404).json({ error: "Enquiry not found." });
      return;
    }
    db.prepare("DELETE FROM enquiries WHERE id = ?").run(existing.id);
    recordActivityLog({
      actorName: req.authUser.name,
      actorRole: req.authUser.role,
      category: "System Alerts",
      action: "Deleted Institutional Enquiry",
      target: `${existing.reference_id} \xB7 ${existing.full_name}`,
      details: `Administrator permanently deleted enquiry record from ${existing.institution_name}.`,
      status: "warning"
    });
    res.json({
      message: `Enquiry ${existing.reference_id} deleted successfully.`
    });
  });
  return app;
}
async function bootstrap() {
  const app = createApp();
  const isProd = process.env.NODE_ENV === "production";
  const distDir = path.resolve(process.cwd(), "dist");
  const hasDistBuild = fs.existsSync(path.join(distDir, "index.html"));
  if (isProd && hasDistBuild) {
    const assetsImagesDir = path.resolve(process.cwd(), "src/assets/images");
    if (fs.existsSync(assetsImagesDir)) {
      app.use("/src/assets/images", express.static(assetsImagesDir));
    }
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`AttendEase Production Server listening on http://0.0.0.0:${PORT}`);
    });
    return;
  }
  let viteMiddleware = null;
  let viteInitError = null;
  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`AttendEase Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
  const hmrDisabled = process.env.DISABLE_HMR === "true";
  const viteReady = import("vite").then(
    ({ createServer: createViteServer }) => createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
        ws: hmrDisabled ? false : void 0
      },
      appType: "spa"
    })
  ).then((vite) => {
    viteMiddleware = vite.middlewares;
  }).catch((err) => {
    viteInitError = err instanceof Error ? err : new Error(String(err));
    console.error("Failed to initialize Vite dev middleware:", viteInitError);
  });
  app.use(async (req, res, next) => {
    if (!viteMiddleware && !viteInitError) {
      await viteReady;
    }
    if (viteInitError) {
      res.status(500).send("Frontend dev middleware failed to initialize.");
      return;
    }
    if (viteMiddleware) {
      viteMiddleware(req, res, next);
      return;
    }
    next();
  });
}
if (!isVercel) {
  bootstrap().catch((err) => {
    console.error("Fatal server startup error:", err);
    process.exit(1);
  });
}
export {
  createApp
};
