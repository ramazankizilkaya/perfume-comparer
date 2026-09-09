@catalog
Feature: Catalog Management
    As a user of Aura Compare
    I want to browse perfumes, brands and catalog metadata with proper validations and error handling

    Scenario: Retrieve list of perfumes and get detail for the first perfume
        When I send a "GET" request to "Get Perfumes" endpoint
        Then the response status should be 200 and should match "Get Perfumes" response scheme
        Given I save "requests[0].responseBody.items.0.slug" as "perfumeSlug"
        When I send a "GET" request to "Get Perfume Detail" endpoint
        Then the response status should be 200 and should match "Get Perfume Detail" response scheme

    Scenario: Retrieve perfume detail with article and faq for enriched perfume
        Given perfume slug is "abercrombie-fitch-fierce-edp"
        When I send a "GET" request to "Get Perfume Detail" endpoint
        Then the response status should be 200 and should match "Get Perfume Detail With Article And Faq" response scheme

    Scenario: Return 404 when requesting a non-existent perfume detail
        Given perfume slug is "non-existent-perfume-slug-99999"
        When I send a "GET" request to "Get Perfume Detail" endpoint
        Then the response status should be 404

    Scenario: Retrieve perfume comments for an existing perfume
        When I send a "GET" request to "Get Perfumes" endpoint
        Then the response status should be 200
        Given I save "requests[0].responseBody.items.0.slug" as "perfumeSlug"
        When I send a "GET" request to "Get Perfume Comments" endpoint
        Then the response status should be 200 and should match "Get Perfume Comments" response scheme

    Scenario: Return 404 when requesting comments for a non-existent perfume
        Given perfume slug is "non-existent-perfume-slug-99999"
        When I send a "GET" request to "Get Perfume Comments" endpoint
        Then the response status should be 404
        And the response body should contain "Parfüm bulunamadı"

    Scenario: Submitting a perfume comment without authentication should be rejected
        Given I clear my authorization token
        When I send a "GET" request to "Get Perfumes" endpoint
        Given I save "requests[0].responseBody.items.0.slug" as "perfumeSlug"
        When I send a "POST" request to "Submit Perfume Comment" endpoint with "Submit Comment" payload
        Then the response status should be 401
        And the response body should contain "Yorum yapmak için giriş yapmalısınız"

    Scenario Outline: Submitting a comment with invalid payload should return validation error
        Given I am authenticated
        When I send a "GET" request to "Get Perfumes" endpoint
        Given I save "requests[1].responseBody.items.0.slug" as "perfumeSlug"
        When I send a "POST" request to "Submit Perfume Comment" endpoint with "<payload>" payload
        Then the response status should be 400
        And the response body should contain "Lütfen geçerli bir puan"

        Examples:
            | payload                     |
            | Invalid Comment Rating Low  |
            | Invalid Comment Rating High |
            | Empty Comment Content       |

    Scenario: Submitting a comment to a non-existent perfume should return 404
        Given I am authenticated
        Given perfume slug is "non-existent-perfume-slug-99999"
        When I send a "POST" request to "Submit Perfume Comment" endpoint with "Submit Comment" payload
        Then the response status should be 404
        And the response body should contain "Parfüm bulunamadı"

    Scenario: Recording usage with invalid age group should return validation error
        When I send a "GET" request to "Get Perfumes" endpoint
        Given I save "requests[0].responseBody.items.0.slug" as "perfumeSlug"
        When I send a "POST" request to "Record Usage" endpoint with "Invalid Usage AgeGroup" payload
        Then the response status should be 400
        And the response body should contain "Lütfen geçerli bir yaş grubu seçin"

    Scenario: Retrieve brands list and get detail for the first brand
        When I send a "GET" request to "Get Brands" endpoint
        Then the response status should be 200 and should match "Get Brands" response scheme
        Given I save "requests[0].responseBody.0.slug" as "brandSlug"
        When I send a "GET" request to "Get Brand Detail" endpoint
        Then the response status should be 200 and should match "Get Brand Detail" response scheme

    Scenario: Return 404 when requesting a non-existent brand detail
        Given brand slug is "non-existent-brand-slug-99999"
        When I send a "GET" request to "Get Brand Detail" endpoint
        Then the response status should be 404

    Scenario: Retrieve random brands for homepage
        When I send a "GET" request to "Get Random Brands" endpoint
        Then the response status should be 200 and should match "Get Random Brands" response scheme

    Scenario: Retrieve catalog filter metadata
        When I send a "GET" request to "Get Filter Meta" endpoint
        Then the response status should be 200 and should match "Get Filter Meta" response scheme
