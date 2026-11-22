package com.attendease.controller;

import com.attendease.model.AttendanceRecord;
import com.attendease.model.CourseClass;
import com.attendease.model.QrSession;
import com.attendease.model.User;
import com.attendease.repository.AttendanceRecordRepository;
import com.attendease.repository.CourseClassRepository;
import com.attendease.repository.UserRepository;
import com.attendease.service.AttendanceService;
import com.attendease.service.QrCodeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AttendanceRestController {
    private final UserRepository userRepo;
    private final CourseClassRepository classRepo;
    private final AttendanceRecordRepository attendanceRepo;
    private final AttendanceService attendanceService;
    private final QrCodeService qrCodeService;

    public AttendanceRestController(
            UserRepository userRepo,
            CourseClassRepository classRepo,
            AttendanceRecordRepository attendanceRepo,
            AttendanceService attendanceService,
            QrCodeService qrCodeService
    ) {
        this.userRepo = userRepo;
        this.classRepo = classRepo;
        this.attendanceRepo = attendanceRepo;
        this.attendanceService = attendanceService;
        this.qrCodeService = qrCodeService;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "service", "attendease-java");
    }

    @GetMapping("/teacher/classes")
    public List<CourseClass> getTeacherClasses(Authentication auth) {
        User user = userRepo.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            return classRepo.findAll();
        }
        return classRepo.findByTeacherUid(user.getUid());
    }

    @PostMapping("/teacher/qr/generate")
    public ResponseEntity<Map<String, Object>> generateQr(
            @RequestBody Map<String, Object> body,
            Authentication auth
    ) {
        User teacher = userRepo.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        String classId = String.valueOf(body.getOrDefault("classId", "c1"));
        int duration = Integer.parseInt(String.valueOf(body.getOrDefault("durationMinutes", 15)));

        CourseClass cls = classRepo.findById(classId).orElseThrow();
        if (!"ADMIN".equalsIgnoreCase(teacher.getRole()) && !cls.getTeacherUid().equals(teacher.getUid())) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden: Class not assigned to teacher."));
        }

        QrSession session = attendanceService.createQrSession(cls, duration);
        String qrPngBase64 = qrCodeService.generateQrBase64(session.getToken(), 240, 240);
        return ResponseEntity.ok(Map.of(
                "token", session.getToken(),
                "classCode", session.getClassCode(),
                "expiresAt", session.getExpiresAt().toString(),
                "qrImageBase64", qrPngBase64
        ));
    }

    @GetMapping("/student/attendance")
    public Map<String, Object> getStudentAttendance(Authentication auth) {
        User student = userRepo.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        List<AttendanceRecord> records = attendanceRepo.findByStudentUidOrderByAttendanceDateDesc(student.getUid());
        double percentage = attendanceService.calculateAttendancePercentage(student.getUid());
        return Map.of(
                "student", student.getName(),
                "percentage", percentage,
                "records", records
        );
    }

    @PostMapping("/student/qr/scan")
    public ResponseEntity<?> scanQr(
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        User student = userRepo.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        String token = body.getOrDefault("qrToken", "").trim();
        AttendanceRecord saved = attendanceService.verifyStudentQrCheckIn(token, student);
        return ResponseEntity.ok(Map.of("verified", true, "record", saved));
    }
}
