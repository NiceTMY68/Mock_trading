package com.example.demo.dto;

import com.example.demo.entity.Alert;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to create a price alert")
public class CreateAlertDto {
    
    @NotBlank
    @Schema(description = "Trading symbol", example = "BTCUSDT")
    private String symbol;
    
    @NotNull
    @Schema(description = "Alert direction", example = "ABOVE")
    private Alert.Direction direction;
    
    @NotNull
    @Schema(description = "Price threshold", example = "50000.00")
    private BigDecimal threshold;
}

