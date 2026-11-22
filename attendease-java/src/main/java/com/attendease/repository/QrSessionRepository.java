package com.attendease.repository;

import com.attendease.model.QrSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface QrSessionRepository extends JpaRepository<QrSession, Long> {
    Optional<QrSession> findByTokenIgnoreCase(String token);
}
