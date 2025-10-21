package com.example.demo.client.binance.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class BinanceTicker24hr {
    
    @JsonProperty("symbol")
    private String symbol;
    
    @JsonProperty("priceChange")
    private String priceChange;
    
    @JsonProperty("priceChangePercent")
    private String priceChangePercent;
    
    @JsonProperty("weightedAvgPrice")
    private String weightedAvgPrice;
    
    @JsonProperty("prevClosePrice")
    private String prevClosePrice;
    
    @JsonProperty("lastPrice")
    private String lastPrice;
    
    @JsonProperty("lastQty")
    private String lastQty;
    
    @JsonProperty("bidPrice")
    private String bidPrice;
    
    @JsonProperty("bidQty")
    private String bidQty;
    
    @JsonProperty("askPrice")
    private String askPrice;
    
    @JsonProperty("askQty")
    private String askQty;
    
    @JsonProperty("openPrice")
    private String openPrice;
    
    @JsonProperty("highPrice")
    private String highPrice;
    
    @JsonProperty("lowPrice")
    private String lowPrice;
    
    @JsonProperty("volume")
    private String volume;
    
    @JsonProperty("quoteVolume")
    private String quoteVolume;
    
    @JsonProperty("openTime")
    private Long openTime;
    
    @JsonProperty("closeTime")
    private Long closeTime;
    
    @JsonProperty("firstId")
    private Long firstId;
    
    @JsonProperty("lastId")
    private Long lastId;
    
    @JsonProperty("count")
    private Integer count;
}
