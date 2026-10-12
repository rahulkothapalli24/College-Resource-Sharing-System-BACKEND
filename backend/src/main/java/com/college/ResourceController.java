
package com.college.backend;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.college.backend.entity.User;
import com.college.backend.repository.UserRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/resources")
@CrossOrigin(origins = "http://localhost:5173")
public class ResourceController {

    private final ResourceRepository repository;
    private final UserRepository userRepository;

    public ResourceController(
            ResourceRepository repository,
            UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    // READ: Get all resources
    @GetMapping
    public List<Resource> getAllResources() {
        return repository.findAll();
    }

    // READ: Get one resource
    @GetMapping("/{id}")
    public ResponseEntity<Resource> getResourceById(
            @PathVariable Long id) {

        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // CREATE: Add a resource
    @PostMapping
    public ResponseEntity<Resource> createResource(
            @Valid @RequestBody Resource resource,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Authenticated user not found"));

        // Generate a new ID and set the uploader from the logged-in user.
        resource.setId(null);
        resource.setUploadedBy(user.getName());

        Resource saved = repository.save(resource);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(saved);
    }

    // UPDATE: Edit a resource while preserving its uploader
    @PutMapping("/{id}")
    public ResponseEntity<Resource> updateResource(
            @PathVariable Long id,
            @Valid @RequestBody Resource updatedResource) {

        return repository.findById(id)
                .map(existing -> {
                    existing.setTitle(updatedResource.getTitle());
                    existing.setDescription(
                            updatedResource.getDescription());
                    existing.setCategory(
                            updatedResource.getCategory());
                    existing.setResourceUrl(
                            updatedResource.getResourceUrl());

                    // Do not copy uploadedBy from the request.
                    Resource saved = repository.save(existing);

                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE: Remove a resource
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResource(
            @PathVariable Long id) {

        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        repository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}
