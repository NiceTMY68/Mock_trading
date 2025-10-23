package com.example.demo.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "price_snapshots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PriceSnapshot {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "coin_symbol", nullable = false, length = 20)
    private String coinSymbol;
    
    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;
    
    @Column(name = "open", precision = 20, scale = 8)
    private BigDecimal open;
    
    @Column(name = "high", precision = 20, scale = 8)
    private BigDecimal high;
    
    @Column(name = "low", precision = 20, scale = 8)
    private BigDecimal low;
    
    @Column(name = "close", precision = 20, scale = 8)
    private BigDecimal close;
    
    @Column(name = "volume", precision = 20, scale = 8)
    private BigDecimal volume;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_meta", columnDefinition = "json")
    private JsonNode rawMeta;
}
