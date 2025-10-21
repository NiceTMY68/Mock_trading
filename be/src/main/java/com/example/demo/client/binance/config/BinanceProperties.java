package com.example.demo.client.binance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "binance")
public class BinanceProperties {

    private WebSocket websocket = new WebSocket();
    private Streams streams = new Streams();

    @Data
    public static class WebSocket {
        private String baseUrl = "wss://data-stream.binance.vision";
        private String streamUrl = "wss://data-stream.binance.vision/stream";
        private Long reconnectDelay = 5000L;
        private Integer maxReconnectAttempts = 10;
        private Long pingInterval = 180000L;
    }

    @Data
    public static class Streams {
        private Boolean enabled = false;
    }
}

