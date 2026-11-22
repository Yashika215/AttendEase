package com.attendease.service;

import com.attendease.model.AttendanceRecord;
import com.attendease.model.CourseClass;
import com.attendease.model.QrSession;
import com.attendease.model.User;
import com.attendease.repository.AttendanceRecordRepository;
import com.attendease.repository.CourseClassRepository;
import com.attendease.repository.QrSessionRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class AttendanceService {
    private final AttendanceRecordRepository attendanceRepo;
    private final CourseClassRepository classRepo;
    private final QrSessionRepository qrSessionRepo;

    public AttendanceService(
            AttendanceRecordRepository attendanceRepo,
            CourseClassRepository classRepo,
            QrSessionRepository qrSessionRepo
    ) {
        this.attendanceRepo = attendanceRepo;
        this.classRepo = classRepo;
        this.qrSessionRepo = qrSessionRepo;
    }

    public QrSession createQrSession(CourseClass courseClass, int durationMinutes) {
        QrSession session = new QrSession();
        session.setToken("AE-" + courseClass.getCode() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        session.setClassId(courseClass.getId());
        session.setClassCode(courseClass.getCode());
        session.setDivisionId(courseClass.getDivisionId());
        session.setCollegeId(courseClass.getCollegeId());
        session.setExpiresAt(Instant.now().plus(durationMinutes, ChronoUnit.MINUTES));
        session.setActive(true);
        return qrSessionRepo.save(session);
    }

    public AttendanceRecord verifyStudentQrCheckIn(String token, User student) {
        QrSession session = qrSessionRepo.findByTokenIgnoreCase(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid QR session token."));

        if (!session.isActive() || session.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalStateException("QR session has expired.");
        }

        if (session.getDivisionId() != null && !session.getDivisionId().equals(student.getDivisionId())) {
            throw new SecurityException("Forbidden: Student belongs to a different division.");
        }

        CourseClass cls = classRepo.findById(session.getClassId())
                .orElseThrow(() -> new IllegalArgumentException("Course class not found."));

        LocalDate today = LocalDate.now();
        attendanceRepo.findByClassIdAndStudentUidAndAttendanceDate(cls.getId(), student.getUid(), today)
                .ifPresent(existing -> {
                    throw new IllegalStateException("Duplicate check-in already recorded for today.");
                });

        AttendanceRecord record = new AttendanceRecord();
        record.setClassId(cls.getId());
        record.setClassCode(cls.getCode());
        record.setClassName(cls.getName());
        record.setDivisionId(cls.getDivisionId());
        record.setCollegeId(cls.getCollegeId());
        record.setStudentUid(student.getUid());
        record.setStudentId(student.getStudentId() != null ? student.getStudentId() : student.getUid());
        record.setStudentName(student.getName());
        record.setAttendanceDate(today);
        record.setStatus("present");
        record.setMethod("qr");
        return attendanceRepo.save(record);
    }

    public double calculateAttendancePercentage(String studentUid) {
        List<AttendanceRecord> records = attendanceRepo.findByStudentUidOrderByAttendanceDateDesc(studentUid);
        if (records.isEmpty()) return 100.0;
        long present = records.stream().filter(r -> "present".equalsIgnoreCase(r.getStatus())).count();
        return Math.round((present * 1000.0) / records.size()) / 10.0;
    }
}
