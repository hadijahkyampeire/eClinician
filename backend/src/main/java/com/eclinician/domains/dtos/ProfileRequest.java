package com.eclinician.domains.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProfileRequest(
        @NotBlank @Size(max = 150) String name,
        @Size(max = 700_000) String profileImage) {}
