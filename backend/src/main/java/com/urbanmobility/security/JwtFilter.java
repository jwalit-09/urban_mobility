package com.urbanmobility.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtFilter extends OncePerRequestFilter {
    private final JwtService jwtService;

    public JwtFilter(JwtService jwtService){this.jwtService=jwtService;}

    @Override
    protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException,IOException {
        String auth=request.getHeader("Authorization");
        if(auth!=null && auth.startsWith("Bearer ")){
            String token=auth.substring(7);
            if(jwtService.valid(token)){
                String email=jwtService.extractEmail(token);
                String role=io.jsonwebtoken.Jwts.parser()
                        .verifyWith(getKeyFromService()).build()
                        .parseSignedClaims(token).getPayload().get("role",String.class);
                var authentication=new UsernamePasswordAuthenticationToken(
                        email,null,List.of(new SimpleGrantedAuthority("ROLE_"+role)));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        filterChain.doFilter(request,response);
    }

    // JwtService keeps the key private; role is read by a small helper in SecurityConfig instead.
    // This filter reuses a request attribute populated by SecurityConfig only when available.
    private javax.crypto.SecretKey getKeyFromService() {
        try {
            var f=JwtService.class.getDeclaredField("key");
            f.setAccessible(true);
            return (javax.crypto.SecretKey)f.get(jwtService);
        } catch (Exception e) {
            throw new IllegalStateException("JWT key unavailable",e);
        }
    }
}
