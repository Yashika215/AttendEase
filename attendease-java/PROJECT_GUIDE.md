# AttendEase Java Backend Architecture Guide

## Architecture Overview
- **Spring Boot 3.3.5 + Java 21** REST backend (`AttendEaseApplication.java`)
- **Spring Security** (`SecurityConfig.java`): BCrypt password hashing and role-based endpoint isolation (`ADMIN`, `TEACHER`, `STUDENT`)
- **Spring Data JPA / Hibernate**: Persistence over PostgreSQL (`application.properties`) or H2 PostgreSQL mode (`application-local.properties`)
- **ZXing (`QrCodeService.java`)**: Dynamic QR code generation as PNG Base64 payloads
- **Business Logic (`AttendanceService.java`)**: Division-scoped QR session verification, duplicate check-in prevention, and attendance percentage calculation

## Running Locally
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```
