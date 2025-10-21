package com.example.demo.client.binance.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AggTrade {
    
    @JsonProperty("e")
    private String eventType;
    
    @JsonProperty("E")
    private Long eventTime;
    
    @JsonProperty("s")
    private String symbol;
    
    @JsonProperty("a")
    private Long aggregateTradeId;
    
    @JsonProperty("p")
    private BigDecimal price;
    
    @JsonProperty("q")
    private BigDecimal quantity;
    
    @JsonProperty("f")
    private Long firstTradeId;
    
    @JsonProperty("l")
    private Long lastTradeId;
    
    @JsonProperty("T")
    private Long tradeTime;
    
    @JsonProperty("m")
    private Boolean isBuyerMaker;
    
    @JsonProperty("M")
    private Boolean ignore;
}

