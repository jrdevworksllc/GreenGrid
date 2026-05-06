package com.greengrid.backendapi.dto;

import java.time.LocalDate;
import java.util.UUID;

public class TaskDtos {

    public record TodayTaskResponse(
            UUID id,
            String title,
            String detail,
            String priority,
            LocalDate dueOn,
            boolean completed
    ) {}
}
