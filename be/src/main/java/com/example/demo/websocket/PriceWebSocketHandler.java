package com.example.demo.websocket;

import com.example.demo.service.PriceWebSocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Slf4j
@Component
@RequiredArgsConstructor
public class PriceWebSocketHandler extends TextWebSocketHandler {

    private final PriceWebSocketService priceWebSocketService;

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) throws Exception {
        priceWebSocketService.registerSession(session);
    }

    @Override
    protected void handleTextMessage(@NonNull WebSocketSession session,
                                     @NonNull TextMessage message) throws Exception {
        priceWebSocketService.handleMessage(session, message.getPayload());
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session,
                                      @NonNull CloseStatus status) {
        priceWebSocketService.removeSession(session);
    }

    @Override
    public void handleTransportError(@NonNull WebSocketSession session, @NonNull Throwable exception) {
        log.warn("WebSocket transport error for session {}: {}", session.getId(), exception.getMessage());
        priceWebSocketService.removeSession(session);
    }
}


