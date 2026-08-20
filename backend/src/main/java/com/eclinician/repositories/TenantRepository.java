package com.eclinician.repositories;

import com.eclinician.domains.entities.Tenant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * The second repository that is not tenant-scoped, and for the same reason as
 * {@link UserRepository}: it is what the platform administrator manages, and no
 * hospital may read it.
 */
public interface TenantRepository extends JpaRepository<Tenant, String> {

    List<Tenant> findAllByOrderByNameAsc();

    long countByActive(boolean active);
}
