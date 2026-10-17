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

    Scenario: Raw scrape data under /media should not be served
        When I send a "GET" request to "Media Raw JSON" endpoint
        Then the response status should be 404
        When I send a "GET" request to "Media Brand JSON" endpoint
        Then the response status should be 404

    Scenario: Perfume images under /media are served with nosniff and long cache headers
        When I send a "GET" request to "Media Perfume Image" endpoint
        Then the response status should be 200
        And the response header "Content-Type" should contain "image/webp"
        And the response header "X-Content-Type-Options" should contain "nosniff"
        And the response header "Cache-Control" should contain "max-age=31536000"

    Scenario: API responses carry the nosniff header
        When I send a "GET" request to "Get Random Brands" endpoint
        Then the response status should be 200
        And the response header "X-Content-Type-Options" should contain "nosniff"
