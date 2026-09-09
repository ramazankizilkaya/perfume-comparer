@compare
Feature: Perfume Comparison
    As a user of Aura Compare
    I want to see popular perfume comparisons

    Scenario: Retrieve popular perfume comparisons
        When I send a "GET" request to "Get Popular Comparisons" endpoint
        Then the response status should be 200 and should match "Get Popular Comparisons" response scheme
