
package com.college.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.college.backend.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Find a user by email, ignoring uppercase/lowercase differences
    Optional<User> findByEmailIgnoreCase(String email);

    // Check whether an email already exists
    boolean existsByEmailIgnoreCase(String email);
}
