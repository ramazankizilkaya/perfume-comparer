@admin
Feature: Admin Endpoint Protection
    As the Aura Compare Platform
    I want admin endpoints to require an Admin-role bearer token

    Scenario: Admin seed status without token should be rejected with 401
        Given I clear my authorization token
        When I send a "GET" request to "Admin Seed Status" endpoint
        Then the response status should be 401
        And the response body should contain "giriş yapmalısınız"

    Scenario: Admin action without token should be rejected with 401
        Given I clear my authorization token
        When I send a "POST" request to "Admin AI Summaries" endpoint
        Then the response status should be 401

    Scenario: Admin seed status with a regular user token should be rejected with 403
        Given I am authenticated
        When I send a "GET" request to "Admin Seed Status" endpoint
        Then the response status should be 403
        And the response body should contain "yönetici yetkisi gerekir"

    Scenario: Admin seed status with an admin token should succeed
        Given I am authenticated as admin
        When I send a "GET" request to "Admin Seed Status" endpoint
        Then the response status should be 200
        And the response body should contain "items"

    Scenario: Dev login with admin flag returns Admin role in profile
        Given I am authenticated as admin
        When I send a "GET" request to "Me" endpoint
        Then the response status should be 200
        And the response body path "role" should be "Admin"

    Scenario: Admin AI status without token should be rejected with 401
        Given I clear my authorization token
        When I send a "GET" request to "Admin AI Status" endpoint
        Then the response status should be 401

    Scenario: Admin AI status with a regular user token should be rejected with 403
        Given I am authenticated
        When I send a "GET" request to "Admin AI Status" endpoint
        Then the response status should be 403

    Scenario: Admin AI status with an admin token lists the AI providers
        Given I am authenticated as admin
        When I send a "GET" request to "Admin AI Status" endpoint
        Then the response status should be 200
        And the response body should contain "enabled"
        And the response body should contain "providers"
