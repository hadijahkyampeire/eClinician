package com.eclinician.domains.dtos.response;

import com.eclinician.domains.entities.AppUser;

public record ProfileResponse(
        String name,
        String email,
        String role,
        String profileImage) {

    public static ProfileResponse from(AppUser user) {
        return new ProfileResponse(user.getName(), user.getEmail(), user.getRole().label(),
                user.getProfileImage());
    }
}
