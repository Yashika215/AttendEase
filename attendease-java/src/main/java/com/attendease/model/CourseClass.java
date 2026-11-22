package com.attendease.model;

import jakarta.persistence.*;

@Entity
@Table(name = "course_classes")
public class CourseClass {
    @Id
    private String id;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String teacherUid;

    @Column(nullable = false)
    private String teacherName;

    private String divisionId;
    private String collegeId = "col-1";
    private String schedule;
    private String room;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTeacherUid() { return teacherUid; }
    public void setTeacherUid(String teacherUid) { this.teacherUid = teacherUid; }
    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String teacherName) { this.teacherName = teacherName; }
    public String getDivisionId() { return divisionId; }
    public void setDivisionId(String divisionId) { this.divisionId = divisionId; }
    public String getCollegeId() { return collegeId; }
    public void setCollegeId(String collegeId) { this.collegeId = collegeId; }
    public String getSchedule() { return schedule; }
    public void setSchedule(String schedule) { this.schedule = schedule; }
    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }
}
