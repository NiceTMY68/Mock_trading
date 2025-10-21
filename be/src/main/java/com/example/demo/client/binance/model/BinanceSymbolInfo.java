package com.example.demo.client.binance.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class BinanceSymbolInfo {
    
    @JsonProperty("symbol")
    private String symbol;
    
    @JsonProperty("status")
    private String status;
    
    @JsonProperty("baseAsset")
    private String baseAsset;
    
    @JsonProperty("baseAssetPrecision")
    private Integer baseAssetPrecision;
    
    @JsonProperty("quoteAsset")
    private String quoteAsset;
    
    @JsonProperty("quotePrecision")
    private Integer quotePrecision;
    
    @JsonProperty("quoteAssetPrecision")
    private Integer quoteAssetPrecision;
    
    @JsonProperty("orderTypes")
    private List<String> orderTypes;
    
    @JsonProperty("icebergAllowed")
    private Boolean icebergAllowed;
    
    @JsonProperty("ocoAllowed")
    private Boolean ocoAllowed;
    
    @JsonProperty("isSpotTradingAllowed")
    private Boolean isSpotTradingAllowed;
    
    @JsonProperty("isMarginTradingAllowed")
    private Boolean isMarginTradingAllowed;
    
    @JsonProperty("filters")
    private List<Filter> filters;
    
    @JsonProperty("permissions")
    private List<String> permissions;
    
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Filter {
        @JsonProperty("filterType")
        private String filterType;
        
        @JsonProperty("minPrice")
        private String minPrice;
        
        @JsonProperty("maxPrice")
        private String maxPrice;
        
        @JsonProperty("tickSize")
        private String tickSize;
        
        @JsonProperty("minQty")
        private String minQty;
        
        @JsonProperty("maxQty")
        private String maxQty;
        
        @JsonProperty("stepSize")
        private String stepSize;
        
        @JsonProperty("minNotional")
        private String minNotional;
        
        @JsonProperty("applyToMarket")
        private Boolean applyToMarket;
        
        @JsonProperty("avgPriceMins")
        private Integer avgPriceMins;
        
        @JsonProperty("limit")
        private Integer limit;
        
        @JsonProperty("maxNumAlgoOrders")
        private Integer maxNumAlgoOrders;
    }
}
