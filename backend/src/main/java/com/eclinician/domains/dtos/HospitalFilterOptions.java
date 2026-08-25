package com.eclinician.domains.dtos;

import java.util.List;

/**
 * What the console's two location filters may offer: only values some hospital actually
 * has, so a filter can never be set to something that returns nothing. The subdivisions
 * are narrowed to the chosen country, so picking Uganda then a district cannot contradict.
 */
public record HospitalFilterOptions(List<String> countries, List<String> subdivisions) {}
