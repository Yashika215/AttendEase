package com.attendease;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class SecurityIsolationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthEndpointIsAccessible() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "student@attendease.edu", roles = "STUDENT")
    void studentCannotAccessTeacherClasses() throws Exception {
        mockMvc.perform(get("/api/teacher/classes"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "teacher@attendease.edu", roles = "TEACHER")
    void teacherDemoCanAccessAssignedClasses() throws Exception {
        mockMvc.perform(get("/api/teacher/classes"))
                .andExpect(status().isOk());
    }
}
