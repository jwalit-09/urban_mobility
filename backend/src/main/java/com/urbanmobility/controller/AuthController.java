package com.urbanmobility.controller;

import com.urbanmobility.model.*;
import com.urbanmobility.repo.UserRepository;
import com.urbanmobility.security.JwtService;
import jakarta.validation.constraints.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(UserRepository users,PasswordEncoder encoder,JwtService jwt){
        this.users=users;this.encoder=encoder;this.jwt=jwt;
    }

    public record AuthRequest(@Email @NotBlank String email,@NotBlank String password){}
    public record RegisterRequest(@Email @NotBlank String email,@Size(min=6) String password){}

    @PostMapping("/register")
    public Map<String,Object> register(@RequestBody RegisterRequest r){
        if(users.findByEmail(r.email()).isPresent()) throw new IllegalArgumentException("Email already registered");
        User u=users.save(new User(r.email(),encoder.encode(r.password()),Role.USER));
        return Map.of("message","Registered successfully","userId",u.getId(),"email",u.getEmail());
    }

    @PostMapping("/login")
    public Map<String,Object> login(@RequestBody AuthRequest r){
        User u=users.findByEmail(r.email()).orElseThrow(()->new IllegalArgumentException("Invalid credentials"));
        if(!encoder.matches(r.password(),u.getPassword())) throw new IllegalArgumentException("Invalid credentials");
        String token=jwt.generate(u.getEmail(),u.getRole().name());
        return Map.of("token",token,"email",u.getEmail(),"role",u.getRole().name());
    }
}
