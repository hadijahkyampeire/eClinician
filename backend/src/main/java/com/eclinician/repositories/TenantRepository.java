package com.eclinician.repositories;

import com.eclinician.domains.entities.Tenant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * The second repository that is not tenant-scoped, and for the same reason as
 * {@link UserRepository}: it is what the platform administrator manages, and no
 * hospital may read it.
 */
public interface TenantRepository extends JpaRepository<Tenant, String> {

    List<Tenant> findAllByOrderByNameAsc();

    long countByActive(boolean active);

    /**
     * The console's one list query. An empty filter is skipped, so the same statement
     * serves "everything" and any combination of the three.
     *
     * <p>Empty string rather than null is deliberate. Postgres cannot infer the type of a
     * null parameter, so {@code LOWER(CONCAT('%', :search, '%'))} with a null bind fails
     * with "function lower(bytea) does not exist" — on Postgres only, which the H2 test
     * database will never reproduce. An empty string is always typed as text, so both
     * engines plan the same query and no CAST is needed to hold it together.
     *
     * <p>The search covers the identifier as well as the name: the slug is what appears in
     * every other table, so it is the thing you have when you are chasing a row.
     */
    @Query("""
            SELECT t FROM Tenant t
            WHERE (:search = ''
                   OR LOWER(t.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(t.id)   LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:country = '' OR t.country = :country)
              AND (:subdivision = '' OR LOWER(t.subdivision) = LOWER(:subdivision))
            ORDER BY t.name ASC
            """)
    List<Tenant> search(@Param("search") String search,
            @Param("country") String country,
            @Param("subdivision") String subdivision);

    /** The countries the filter can actually offer — the ones a hospital is in. */
    @Query("""
            SELECT DISTINCT t.country FROM Tenant t
            WHERE t.country IS NOT NULL AND t.country <> ''
            ORDER BY t.country
            """)
    List<String> findDistinctCountries();

    /**
     * Subdivisions — districts, states, provinces — narrowed to the country already
     * chosen, so the two filters can never contradict each other.
     */
    @Query("""
            SELECT DISTINCT t.subdivision FROM Tenant t
            WHERE t.subdivision IS NOT NULL AND t.subdivision <> ''
              AND (:country = '' OR t.country = :country)
            ORDER BY t.subdivision
            """)
    List<String> findDistinctSubdivisions(@Param("country") String country);
}
