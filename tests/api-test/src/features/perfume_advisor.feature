@advisor
Feature: Perfume Advisor AI Recommendations
    As an authenticated user of Aura Compare
    I want to get personalized AI perfume recommendations with daily quota enforcement

    Scenario: Unauthenticated user should not be able to access perfume advisor status
        Given I clear my authorization token
        When I send a "GET" request to "Get Advisor Status" endpoint
        Then the response status should be 401

    Scenario: Unauthenticated user should not be able to request perfume recommendation
        Given I clear my authorization token
        When I send a "POST" request to "Get Perfume Recommendation" endpoint with "Perfume Advisor Request" payload
        Then the response status should be 401

    Scenario: Authenticated user should be able to check advisor status and get a recommendation
        When I send a "POST" request to "Dev Login" endpoint with "Dev Login" payload
        Then the response status should be 200
        Given I save "requests[0].responseBody.token" as "token"
        When I send a "GET" request to "Get Advisor Status" endpoint
        Then the response status should be 200 and should match "Get Advisor Status" response scheme
        When I send a "POST" request to "Get Perfume Recommendation" endpoint with "Perfume Advisor Request" payload
        Then the response status should be 200 and should match "Get Perfume Recommendation" response scheme
        When I send a "POST" request to "Get Perfume Recommendation" endpoint with "Perfume Advisor Request" payload
        Then the response status should be 200 and should match "Get Perfume Recommendation" response scheme
        When I send a "POST" request to "Get Perfume Recommendation" endpoint with "Perfume Advisor Request Too Long" payload
        Then the response status should be 400
