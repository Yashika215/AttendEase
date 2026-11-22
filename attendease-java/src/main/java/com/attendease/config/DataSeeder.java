package com.attendease.config;

import com.attendease.model.CourseClass;
import com.attendease.model.User;
import com.attendease.repository.CourseClassRepository;
import com.attendease.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    @Bean
    public CommandLineRunner seedDatabase(
            UserRepository userRepo,
            CourseClassRepository classRepo,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {
            if (userRepo.count() == 0) {
                User admin = new User();
                admin.setUid("u-adm-1");
                admin.setName("System Administrator");
                admin.setEmail("admin@attendease.edu");
                admin.setPasswordHash(passwordEncoder.encode("password123"));
                admin.setRole("ADMIN");
                admin.setDepartment("Administration");
                userRepo.save(admin);

                User teacher = new User();
                teacher.setUid("u-tch-1");
                teacher.setName("Teacher Demo");
                teacher.setEmail("teacher@attendease.edu");
                teacher.setPasswordHash(passwordEncoder.encode("password123"));
                teacher.setRole("TEACHER");
                teacher.setDepartment("Computer Science & Engineering");
                userRepo.save(teacher);

                User student = new User();
                student.setUid("u-stu-1");
                student.setName("Alex Rivera");
                student.setEmail("student@attendease.edu");
                student.setStudentId("ST-2026-8492");
                student.setDivisionId("div-cs-a");
                student.setPasswordHash(passwordEncoder.encode("password123"));
                student.setRole("STUDENT");
                student.setDepartment("Computer Science & Engineering");
                userRepo.save(student);
            }

            if (classRepo.count() == 0) {
                CourseClass c1 = new CourseClass();
                c1.setId("c1");
                c1.setCode("CS-401");
                c1.setName("Data Structures & Algorithms");
                c1.setTeacherUid("u-tch-1");
                c1.setTeacherName("Teacher Demo");
                c1.setDivisionId("div-cs-a");
                c1.setSchedule("Mon/Wed/Fri · 09:00 AM");
                c1.setRoom("Block A-201");
                classRepo.save(c1);

                CourseClass c2 = new CourseClass();
                c2.setId("c2");
                c2.setCode("CS-505");
                c2.setName("Cloud Computing & Distributed Systems");
                c2.setTeacherUid("u-tch-1");
                c2.setTeacherName("Teacher Demo");
                c2.setDivisionId("div-cs-a");
                c2.setSchedule("Tue/Thu · 11:30 AM");
                c2.setRoom("Cloud Lab 302");
                classRepo.save(c2);
            }
        };
    }
}
