
package com.college.backend;

import com.college.backend.entity.Role;
import com.college.backend.entity.User;
import com.college.backend.repository.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminBootstrap {

    @Bean
    CommandLineRunner createInitialAdmin(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.name}") String name,
            @Value("${app.admin.email}") String email,
            @Value("${app.admin.password}") String password) {

        return args -> {
            if (email.isBlank() || password.isBlank()) {
                System.out.println(
                    "Admin bootstrap skipped: credentials not configured."
                );
                return;
            }

            if (password.length() < 12) {
                throw new IllegalStateException(
                    "Initial admin password must be at least 12 characters."
                );
            }

            if (!userRepository.existsByEmailIgnoreCase(email.trim())) {
                User admin = new User(
                    name.trim(),
                    email.trim().toLowerCase(),
                    passwordEncoder.encode(password),
                    Role.ADMIN
                );

                userRepository.save(admin);

                System.out.println(
                    "Initial administrator account created."
                );
            }
        };
    }
}
