
package com.college.backend;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ResourceRepository
        extends JpaRepository<Resource, Long> {
}
