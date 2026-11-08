package com.fileease;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

public class Models {
    @Document("users")
    public static class User {
        @Id public String id;
        @Indexed(unique = true) public String email;
        public String passwordHash;
        public String role = "USER";
        public String plan = "FREE";
        public Instant proUntil;
        public String convDay;
        public int convCount;
    }

    @Document("presets")
    public static class Preset {
        @Id public String id;
        @Indexed public String userId;
        public String name, format, fit;
        public Integer width, height;
        public Double minKB, maxKB;
    }

    @Document("payments")
    public static class Payment {
        @Id public String id;
        @Indexed public String userId;
        public String email;
        @Indexed(unique = true) public String txnId;
        public String status = "PENDING";
        public Instant createdAt = Instant.now();
    }
}
