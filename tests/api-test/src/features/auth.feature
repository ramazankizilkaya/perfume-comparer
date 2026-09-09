@auth
Feature: Authentication & User Profile
    As a client of Aura Compare API
    I want to authenticate securely and handle authorization edge cases

    Scenario: Developer should be able to login with dev-login endpoint and get user profile
        When I send a "POST" request to "Dev Login" endpoint with "Dev Login" payload
        Then the response status should be 200 and should match "Dev Login" response scheme
        Given I save "requests[0].responseBody.token" as "token"
        When I send a "GET" request to "Me" endpoint
        Then the response status should be 200 and should match "Me" response scheme

    Scenario: Unauthenticated user should not be able to access profile endpoint
        Given I clear my authorization token
        When I send a "GET" request to "Me" endpoint
        Then the response status should be 401

    Scenario: User with invalid or tampered token should be rejected
        Given I have an invalid authorization token
        When I send a "GET" request to "Me" endpoint
        Then the response status should be 401

    Scenario: Google login with empty credential should return validation error
        When I send a "POST" request to "Google Login" endpoint with "Empty Google Credential" payload
        Then the response status should be 400
        And the response body should contain "credential zorunludur"

    Scenario: Google login with invalid credential format should return unauthorized
        When I send a "POST" request to "Google Login" endpoint with "Invalid Google Credential" payload
        Then the response status should be 401
        And the response body should contain "Google kimliği doğrulanamadı"
