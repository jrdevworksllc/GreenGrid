package com.greengrid.backendapi.model;

public record TodayTask(
        String id,
        String title,
        String detail,
        String priority
) {
}
