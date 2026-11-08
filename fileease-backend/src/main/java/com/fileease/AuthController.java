package com.fileease;


import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    public record Cred(@NotBlank @Email String email, @NotBlank @Size(min=6,max=100) String password){ }
    private final UserRepo users;
    private final PasswordEncoder enc;
    private final JwtService jwt;
    private final String adimEmail;


    public AuthController(UserRepo users, PasswordEncoder enc, JwtService jwt , @Value("${app.admin-email}")String adimEmail){
        this.users=users; this.enc=enc; this.jwt=jwt;this.adimEmail=adimEmail.trim().toLowerCase();

    }

    static Map<String, Object> view(Models.User u) {
        var m = new HashMap<String, Object>();
        m.put("email", u.email); m.put("plan", u.plan); m.put("role", u.role);
        m.put("proUntil", u.proUntil == null ? null : u.proUntil.toString());
        return m;
    }

    private Map<String,Object>out(Models.User u){
        return Map.of("token",jwt.make(u),"user",view(u));
    }

    @PostMapping("/register")
    public Map<String,Object>register(@Valid  @RequestBody Cred c){
        String email=c.email().trim().toLowerCase();
        if (users.findByEmail(email).isPresent())
            throw  new ResponseStatusException(HttpStatus.CONFLICT,"This email is already registered");
        var u=new Models.User();
        u.email=email;
        u.passwordHash=enc.encode(c.password());
        if (email.equals(adimEmail)) u.role="ADMIN";
        return out(users.save(u));
    }
    @PostMapping("/login")
    public Map<String,Object>login(@Valid @RequestBody Cred c){
        var u = users.findByEmail(c.email().trim().toLowerCase())
                .filter(x -> enc.matches(c.password(), x.passwordHash))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong email or password"));
        return out(u);
    }



}
