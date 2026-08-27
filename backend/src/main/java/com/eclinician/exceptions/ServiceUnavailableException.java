package com.eclinician.exceptions;

/** A feature that is configured off or cannot be reached right now — a 503, not a bug. */
public class ServiceUnavailableException extends RuntimeException {
    public ServiceUnavailableException(String message) {
        super(message);
    }
}
