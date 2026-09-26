@sitemap
Feature: Sitemap
    As a search engine crawler
    I want a complete list of published perfume, brand and blog addresses
    So that every page of Aura Compare can be discovered and indexed

    Scenario: Retrieve the sitemap with perfume paths, brand slugs and blog slugs
        When I send a "GET" request to "Get Sitemap" endpoint
        Then the response status should be 200 and should match "Get Sitemap" response scheme

    Scenario: Every sitemap perfume path resolves to an existing perfume
        When I send a "GET" request to "Get Sitemap" endpoint
        Then the response status should be 200
        Given I save "requests[0].responseBody.perfumes.0.path" as "sitemapPath"
        Then the last segment of "sitemapPath" is used as perfume slug
        When I send a "GET" request to "Get Perfume Detail" endpoint
        Then the response status should be 200
        And I should verify "requests[1].responseBody.path" is equal to "sitemapPath"

    Scenario: Every sitemap brand slug resolves to an existing brand
        When I send a "GET" request to "Get Sitemap" endpoint
        Then the response status should be 200
        Given I save "requests[0].responseBody.brands.0.slug" as "brandSlug"
        When I send a "GET" request to "Get Brand Detail" endpoint
        Then the response status should be 200 and should match "Get Brand Detail" response scheme
