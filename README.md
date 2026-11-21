# AttendEase — Cloud-Based Smart Attendance Management System

AttendEase is a full-stack smart attendance management platform designed for universities and colleges (**JG University**), combining a **Java 21 / Spring Boot** backend (`attendease-java`) with a **React, TypeScript, and Tailwind CSS** web portal.

---

## Key Features

- **Role-Based Portals:** Dedicated dashboards for Administrators, Teachers/Faculty, and Students.
- **Dynamic QR Attendance:** Time-limited, division-scoped QR code generation and browser camera scanning.
- **Academic Structure Management:** Manage academic years, courses, semesters, divisions, subjects, and student enrollments.
- **Bulk Onboarding & Reports:** Import student rosters via CSV/Excel and export attendance reports in CSV/PDF formats.
- **Automated Threshold Alerts:** Track attendance below `75%` and dispatch email alerts via configured SMTP transport.

---

## Tech Stack

- **Java Backend (`attendease-java/`):** Java 21, Spring Boot 3.3.5, Spring Security, Spring Data JPA, PostgreSQL / H2, Thymeleaf, ZXing, Apache POI, Docker
- **Web Frontend & API Gateway:** React 19, TypeScript, Vite, Tailwind CSS, Express, SQLite

---

## Running Locally

### Option 1: Web Portal + Express Server
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

### Option 2: Java Spring Boot Backend (`attendease-java`)
```bash
cd attendease-java
mvn spring-boot:run -Dspring-boot.run.profiles=local
```
Runs on `http://localhost:8080` using H2 in PostgreSQL compatibility mode (or run `mvn spring-boot:run` with PostgreSQL configured).
