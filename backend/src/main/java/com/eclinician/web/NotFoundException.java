package com.eclinician.web;

/** Thrown when a requested resource doesn't exist (or isn't in this tenant). */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
