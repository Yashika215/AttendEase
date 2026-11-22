package com.attendease.repository;

import com.attendease.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByUid(String uid);
    List<User> findByRole(String role);
    List<User> findByDivisionIdAndRole(String divisionId, String role);
}
