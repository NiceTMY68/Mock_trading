package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutRequestDto {
    
    @NotBlank(message = "Plan ID is required")
    @Pattern(regexp = "^(pro|premium)$", message = "Plan ID must be 'pro' or 'premium'")
    private String planId;
    
    private String successUrl;
    
    private String cancelUrl;
}
