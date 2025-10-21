package com.example.demo.client.newsdata.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NewsDataResponse {
    
    @JsonProperty("status")
    private String status;
    
    @JsonProperty("totalResults")
    private Integer totalResults;
    
    @JsonProperty("results")
    private List<NewsArticle> results;
    
    @JsonProperty("nextPage")
    private String nextPage;
}

