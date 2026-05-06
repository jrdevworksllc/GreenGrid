package com.greengrid.backendapi.controller;

import com.greengrid.backendapi.dto.TaskDtos;
import com.greengrid.backendapi.service.TaskService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/tasks/today")
    public List<TaskDtos.TodayTaskResponse> todaysTasks(@RequestParam(value = "propertyId", required = false) UUID propertyId) {
        return taskService.listTodayTasks(propertyId);
    }
}
