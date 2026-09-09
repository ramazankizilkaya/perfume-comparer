@search
Feature: Search & Autocomplete
    As a user of Aura Compare
    I want to search perfumes and get autocomplete suggestions with edge cases handled gracefully

    Scenario: Search for perfumes with standard keyword
        Given search query is "sauvage"
        When I send a "GET" request to "Search Perfumes" endpoint
        Then the response status should be 200 and should match "Search Perfumes" response scheme

    Scenario: Search for non-existent keyword should return empty items without error
        Given search query is "xyz987completelynonexistentbrandorperfume"
        When I send a "GET" request to "Search Perfumes" endpoint
        Then the response status should be 200
        And the response body path "totalCount" should be "0"

    Scenario: Search with special characters should not trigger server error
        Given search query is "%^&*@'\"<>"
        When I send a "GET" request to "Search Perfumes" endpoint
        Then the response status should be 200

    Scenario: Search with empty query string should return validation error
        Given search query is ""
        When I send a "GET" request to "Search Perfumes" endpoint
        Then the response status should be 400
        And the response body should contain "Arama sorgusu boş olamaz"

    Scenario: Retrieve search autocomplete suggestions
        Given search query is "dior"
        When I send a "GET" request to "Autocomplete" endpoint
        Then the response status should be 200 and should match "Autocomplete" response scheme

    Scenario: Autocomplete with non-existent keyword should return empty results
        Given search query is "xyznonexistentbrand"
        When I send a "GET" request to "Autocomplete" endpoint
        Then the response status should be 200
