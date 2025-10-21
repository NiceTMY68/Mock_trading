package com.example.demo.client.newsdata.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NewsArticle {
    
    @JsonProperty("article_id")
    private String articleId;
    
    @JsonProperty("title")
    private String title;
    
    @JsonProperty("link")
    private String link;
    
    @JsonProperty("keywords")
    private List<String> keywords;
    
    @JsonProperty("creator")
    private List<String> creator;
    
    @JsonProperty("video_url")
    private String videoUrl;
    
    @JsonProperty("description")
    private String description;
    
    @JsonProperty("content")
    private String content;
    
    @JsonProperty("pubDate")
    private String pubDate;
    
    @JsonProperty("image_url")
    private String imageUrl;
    
    @JsonProperty("source_id")
    private String sourceId;
    
    @JsonProperty("source_priority")
    private Integer sourcePriority;
    
    @JsonProperty("source_url")
    private String sourceUrl;
    
    @JsonProperty("source_icon")
    private String sourceIcon;
    
    @JsonProperty("language")
    private String language;
    
    @JsonProperty("country")
    private List<String> country;
    
    @JsonProperty("category")
    private List<String> category;
    
    @JsonProperty("ai_tag")
    private String aiTag;
    
    @JsonProperty("sentiment")
    private String sentiment;
    
    @JsonProperty("sentiment_stats")
    private String sentimentStats;
    
    @JsonProperty("ai_region")
    private String aiRegion;
}

