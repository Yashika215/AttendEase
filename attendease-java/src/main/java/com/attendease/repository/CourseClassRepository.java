package com.attendease.repository;

import com.attendease.model.CourseClass;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CourseClassRepository extends JpaRepository<CourseClass, String> {
    List<CourseClass> findByTeacherUid(String teacherUid);
    List<CourseClass> findByDivisionId(String divisionId);
}
