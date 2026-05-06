package com.greengrid.backendapi.service;

import com.greengrid.backendapi.dto.TaskDtos;
import com.greengrid.backendapi.repository.GreenGridRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class TaskService {

    private final GreenGridRepository repository;
    private final PropertyService propertyService;

    public TaskService(GreenGridRepository repository, PropertyService propertyService) {
        this.repository = repository;
        this.propertyService = propertyService;
    }

    public List<TaskDtos.TodayTaskResponse> listTodayTasks(UUID propertyId) {
        UUID resolvedPropertyId = propertyService.resolvePropertyId(propertyId);
        return repository.listTodayTasks(resolvedPropertyId);
    }
}
