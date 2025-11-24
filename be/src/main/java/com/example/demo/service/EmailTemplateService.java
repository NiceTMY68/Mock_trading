package com.example.demo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Slf4j
@Service
public class EmailTemplateService {

    private static final String TEMPLATE_DIR = "email/templates/";

    /**
     * Load and process email template with variables
     * @param templateName Template name without extension (e.g., "password-reset")
     * @param format Template format ("html" or "txt")
     * @param variables Map of variables to replace in template (e.g., {{variableName}})
     * @return Processed template content
     */
    public String loadTemplate(String templateName, String format, Map<String, String> variables) {
        try {
            String templatePath = TEMPLATE_DIR + templateName + "." + format;
            ClassPathResource resource = new ClassPathResource(templatePath);
            
            if (!resource.exists()) {
                log.warn("Template not found: {}", templatePath);
                throw new IllegalArgumentException("Email template not found: " + templatePath);
            }

            String content = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
            
            // Replace variables in format {{variableName}}
            for (Map.Entry<String, String> entry : variables.entrySet()) {
                String placeholder = "{{" + entry.getKey() + "}}";
                content = content.replace(placeholder, entry.getValue() != null ? entry.getValue() : "");
            }

            return content;
        } catch (IOException e) {
            log.error("Error loading email template: {}", templateName, e);
            throw new RuntimeException("Failed to load email template: " + templateName, e);
        }
    }

    /**
     * Load HTML template
     */
    public String loadHtmlTemplate(String templateName, Map<String, String> variables) {
        return loadTemplate(templateName, "html", variables);
    }

    /**
     * Load text template
     */
    public String loadTextTemplate(String templateName, Map<String, String> variables) {
        return loadTemplate(templateName, "txt", variables);
    }
}

