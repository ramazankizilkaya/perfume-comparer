@blog
Feature: Blog Management
    As a reader of Aura Compare
    I want to browse published blog posts and handle missing articles gracefully

    Scenario: Retrieve published blog posts list
        When I send a "GET" request to "Get Blogs" endpoint
        Then the response status should be 200 and should match "Get Blogs" response scheme

    Scenario: Return 404 when requesting a non-existent blog post
        Given blog slug is "non-existent-blog-slug-99999"
        When I send a "GET" request to "Get Blog Detail" endpoint
        Then the response status should be 404
