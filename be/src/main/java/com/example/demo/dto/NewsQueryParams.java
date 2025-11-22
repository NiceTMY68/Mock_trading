package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsQueryParams {
    
    private String query;
    private String endpoint;
    private Instant fromDate;
    private Instant toDate;
    private Integer page;
}

