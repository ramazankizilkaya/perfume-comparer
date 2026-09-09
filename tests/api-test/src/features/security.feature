@security
Feature: Security Protections & Passive Controls
    As the Aura Compare Platform
    I want to passively enforce rate limiting, client header presence, and antiforgery token checks

    Scenario: Request without X-Requested-With header should be rejected with 400 Bad Request
        Given I omit the "X-Requested-With" header
        When I send a "GET" request to "Client Header Check" endpoint
        Then the response status should be 400
        And the response body should contain "X-Requested-With zorunludur"

    Scenario: Request with valid X-Requested-With header should succeed with 200 OK
        When I send a "GET" request to "Client Header Check" endpoint
        Then the response status should be 200
        And the response body should contain "İstemci başlığı doğrulandı"

    Scenario: Rapid requests exceeding rate limit should be rejected with 429 Too Many Requests
        When I send 7 rapid requests to "Rate Limit Check" endpoint
        Then the response status should be 429
        And the response body should contain "Çok fazla istek gönderildi"

    Scenario: State-changing request without antiforgery token should be rejected with 400 Bad Request
        When I send a "POST" request to "Verify AntiForgery Token" endpoint with invalid antiforgery token
        Then the response status should be 400
        And the response body should contain "Geçersiz veya eksik AntiForgery jetonu"

    Scenario: State-changing request with valid antiforgery token should succeed with 200 OK
        When I obtain an antiforgery token
        And I send a "POST" request to "Verify AntiForgery Token" endpoint with valid antiforgery token
        Then the response status should be 200
        And the response body should contain "Antiforgery doğrulaması başarılı"
