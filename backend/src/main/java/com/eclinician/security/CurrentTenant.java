package com.eclinician.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Injects the tenant from the caller's token. Replaces the old
 * {@code @RequestHeader("X-Tenant-Id")} — same controller shape, but a value the
 * caller cannot choose.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentTenant {}
