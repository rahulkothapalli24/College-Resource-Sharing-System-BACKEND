
package com.college.backend.auth;

public record AuthResponse(
    String token,
    String tokenType,
    Long id,
    String name,
    String email,
    String role
) {}
