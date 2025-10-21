package com.example.demo.client.binance.service;

import com.example.demo.client.binance.config.BinanceProperties;
import lombok.extern.slf4j.Slf4j;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class BinanceWebSocketClient extends WebSocketClient {

    private final BinanceProperties properties;
    private final BinanceMessageHandler messageHandler;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    private int reconnectAttempts = 0;

    public BinanceWebSocketClient(
            BinanceProperties properties,
            BinanceMessageHandler messageHandler) throws Exception {
        super(new URI(buildStreamUrl(properties)));
        this.properties = properties;
        this.messageHandler = messageHandler;
    }

    private static String buildStreamUrl(BinanceProperties properties) {
        return properties.getWebsocket().getBaseUrl();
    }

    @Override
    public void onOpen(ServerHandshake handshake) {
        log.info("Connected to Binance WebSocket");
        reconnectAttempts = 0;
        
        scheduler.scheduleAtFixedRate(
                this::sendPing,
                properties.getWebsocket().getPingInterval(),
                properties.getWebsocket().getPingInterval(),
                TimeUnit.MILLISECONDS
        );
    }

    @Override
    public void onMessage(String message) {
        try {
            messageHandler.handleMessage(message);
        } catch (Exception e) {
            log.error("Error processing message: {}", e.getMessage(), e);
        }
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        log.warn("WebSocket closed. Code: {}, Reason: {}", code, reason);
        scheduler.shutdown();
        attemptReconnect();
    }

    @Override
    public void onError(Exception ex) {
        log.error("WebSocket error: {}", ex.getMessage(), ex);
    }

    private void attemptReconnect() {
        if (reconnectAttempts < properties.getWebsocket().getMaxReconnectAttempts()) {
            reconnectAttempts++;
            log.info("Attempting to reconnect... ({}/{})",
                    reconnectAttempts,
                    properties.getWebsocket().getMaxReconnectAttempts());

            try {
                Thread.sleep(properties.getWebsocket().getReconnectDelay());
                this.reconnect();
            } catch (InterruptedException e) {
                log.error("Reconnect interrupted: {}", e.getMessage());
                Thread.currentThread().interrupt();
            }
        } else {
            log.error("Max reconnect attempts reached");
        }
    }

    public void subscribeToSymbol(String symbol, String streamType) {
        String stream = symbol.toLowerCase() + "@" + streamType;
        String subscribeMessage = String.format(
                "{\"method\":\"SUBSCRIBE\",\"params\":[\"%s\"],\"id\":1}",
                stream
        );
        send(subscribeMessage);
        log.info("Subscribed to stream: {}", stream);
    }

    public void unsubscribeFromSymbol(String symbol, String streamType) {
        String stream = symbol.toLowerCase() + "@" + streamType;
        String unsubscribeMessage = String.format(
                "{\"method\":\"UNSUBSCRIBE\",\"params\":[\"%s\"],\"id\":1}",
                stream
        );
        send(unsubscribeMessage);
        log.info("Unsubscribed from stream: {}", stream);
    }
}

