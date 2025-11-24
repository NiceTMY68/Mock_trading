package com.example.demo.config;

import com.example.demo.client.binance.model.BinanceSymbolInfo;
import com.example.demo.client.binance.service.BinanceRestClient;
import com.example.demo.client.newsdata.service.NewsDataRestClient;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.JwtUtil;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@TestConfiguration
public class TestConfig {

    @Bean
    @Primary
    public BinanceRestClient mockBinanceRestClient() {
        BinanceRestClient mockClient = mock(BinanceRestClient.class);
        
        // Mock responses for testing
        when(mockClient.getTopCoinsByMarketCap(any(Integer.class))).thenReturn(List.of());
        when(mockClient.getTopCoinsByVolume(any(Integer.class))).thenReturn(List.of());
        when(mockClient.getTopGainers(any(Integer.class))).thenReturn(List.of());
        when(mockClient.getTopLosers(any(Integer.class))).thenReturn(List.of());
        when(mockClient.getAllTicker24hr()).thenReturn(List.of());
        when(mockClient.getAllSymbols()).thenReturn(List.of(
                sampleSymbolInfo("BTCUSDT", "0.0001", "0.0001", "10"),
                sampleSymbolInfo("ETHUSDT", "0.001", "0.001", "10")
        ));
        
        return mockClient;
    }

    @Bean
    @Primary
    public NewsDataRestClient mockNewsDataRestClient() {
        NewsDataRestClient mockClient = mock(NewsDataRestClient.class);
        
        // Mock responses for testing
        when(mockClient.getCryptoNews(any())).thenReturn(null);
        when(mockClient.getNews(anyString(), any())).thenReturn(null);
        
        return mockClient;
    }

    @Bean
    @Primary
    public JwtUtil mockJwtUtil() {
        JwtUtil mockJwtUtil = mock(JwtUtil.class);
        
        // Mock JWT operations
        when(mockJwtUtil.generateToken(any(User.class))).thenReturn("mock-jwt-token");
        when(mockJwtUtil.getExpirationInstant(anyString())).thenReturn(Instant.now().plusSeconds(86400));
        when(mockJwtUtil.validateToken(anyString())).thenReturn(true);
        when(mockJwtUtil.getUsername(anyString())).thenReturn("test@example.com");
        
        return mockJwtUtil;
    }

    @Bean
    @Primary
    public PasswordEncoder mockPasswordEncoder() {
        PasswordEncoder mockEncoder = mock(PasswordEncoder.class);
        
        // Mock password operations
        when(mockEncoder.encode(anyString())).thenReturn("hashedPassword");
        when(mockEncoder.matches(anyString(), anyString())).thenReturn(true);
        
        return mockEncoder;
    }

    private BinanceSymbolInfo sampleSymbolInfo(String symbol, String minQty, String stepSize, String minNotional) {
        BinanceSymbolInfo info = new BinanceSymbolInfo();
        info.setSymbol(symbol);

        BinanceSymbolInfo.Filter lotSize = new BinanceSymbolInfo.Filter();
        lotSize.setFilterType("LOT_SIZE");
        lotSize.setMinQty(minQty);
        lotSize.setStepSize(stepSize);

        BinanceSymbolInfo.Filter notional = new BinanceSymbolInfo.Filter();
        notional.setFilterType("MIN_NOTIONAL");
        notional.setMinNotional(minNotional);

        info.setFilters(List.of(lotSize, notional));
        return info;
    }
}
