package com.example.demo.client.binance.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Kline {
    
    @JsonProperty("e")
    private String eventType;
    
    @JsonProperty("E")
    private Long eventTime;
    
    @JsonProperty("s")
    private String symbol;
    
    @JsonProperty("k")
    private KlineData kline;
    
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class KlineData {
        
        @JsonProperty("t")
        private Long startTime;
        
        @JsonProperty("T")
        private Long closeTime;
        
        @JsonProperty("s")
        private String symbol;
        
        @JsonProperty("i")
        private String interval;
        
        @JsonProperty("f")
        private Long firstTradeId;
        
        @JsonProperty("L")
        private Long lastTradeId;
        
        @JsonProperty("o")
        private BigDecimal openPrice;
        
        @JsonProperty("c")
        private BigDecimal closePrice;
        
        @JsonProperty("h")
        private BigDecimal highPrice;
        
        @JsonProperty("l")
        private BigDecimal lowPrice;
        
        @JsonProperty("v")
        private BigDecimal volume;
        
        @JsonProperty("n")
        private Long numberOfTrades;
        
        @JsonProperty("x")
        private Boolean isClosed;
        
        @JsonProperty("q")
        private BigDecimal quoteAssetVolume;
        
        @JsonProperty("V")
        private BigDecimal takerBuyBaseAssetVolume;
        
        @JsonProperty("Q")
        private BigDecimal takerBuyQuoteAssetVolume;
    }
}

