package com.example.demo.client.binance.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class BinanceMessage {
    @JsonProperty("stream")
    private String stream;
    
    @JsonProperty("data")
    private Object data;
}

