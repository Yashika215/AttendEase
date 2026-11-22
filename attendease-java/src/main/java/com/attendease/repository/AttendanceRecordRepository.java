package com.attendease.repository;

import com.attendease.model.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByStudentUidOrderByAttendanceDateDesc(String studentUid);
    List<AttendanceRecord> findByClassIdOrderByAttendanceDateDesc(String classId);
    Optional<AttendanceRecord> findByClassIdAndStudentUidAndAttendanceDate(String classId, String studentUid, LocalDate attendanceDate);
}
