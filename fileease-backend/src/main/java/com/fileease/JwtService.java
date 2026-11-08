package com.fileease;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;


@Service
public class JwtService {
    private final SecretKey key;

    public JwtService(@Value("${app.jwt.secret}") String secret) {

        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));

    }
    public String make(Models.User u){
        return Jwts.builder().subject(u.id).claim("role",u.role)
                .issuedAt(new Date()).expiration(new Date(System.currentTimeMillis()+ 7L * 24 * 3600 * 1000))
                .signWith(key).compact();
    }
    public Claims read(String token){
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
