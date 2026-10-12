
package com.college.backend;

import com.college.backend.entity.User;
import com.college.backend.repository.UserRepository;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;

    public AdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public record UserSummary(
        Long id,
        String name,
        String email,
        String role
    ) {}

    @GetMapping("/users")
    public List<UserSummary> getUsers() {
        return userRepository.findAll()
            .stream()
            .map(user -> new UserSummary(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name()
            ))
            .toList();
    }
}
