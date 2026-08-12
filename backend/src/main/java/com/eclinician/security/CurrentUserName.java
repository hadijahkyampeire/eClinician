package com.eclinician.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Injects the signed-in user's name from their token. Audit fields — who dispensed,
 * who resulted, who documented — are stamped from this rather than from the request
 * body, so a caller cannot record work under someone else's name.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUserName {}
