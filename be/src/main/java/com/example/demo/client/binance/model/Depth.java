package com.example.demo.client.binance.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Depth {
    
    @JsonProperty("e")
    private String eventType;
    
    @JsonProperty("E")
    private Long eventTime;
    
    @JsonProperty("s")
    private String symbol;
    
    @JsonProperty("U")
    private Long firstUpdateId;
    
    @JsonProperty("u")
    private Long finalUpdateId;
    
    @JsonProperty("b")
    private List<List<BigDecimal>> bids;
    
    @JsonProperty("a")
    private List<List<BigDecimal>> asks;
}

