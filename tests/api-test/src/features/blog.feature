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

    Scenario: Creating a blog post without authentication should be rejected with 401
        Given I clear my authorization token
        When I send a "POST" request to "Create Blog Post" endpoint with "Create Blog Post" payload
        Then the response status should be 401
        And the response body should contain "giriş yapmalısınız"

    Scenario: Creating a blog post with body longer than 50000 characters is rejected with 400
        Given I am authenticated
        When I send a "POST" request to "Create Blog Post" endpoint with "Create Blog Post Body Too Long" payload
        Then the response status should be 400
        And the response body should contain "50000 karakter"

    Scenario: Uploading a PNG blog image converts it to WebP
        Given I am authenticated
        When I upload a valid PNG image as "image" to "Upload Blog Image" endpoint
        Then the response status should be 200
        And the response body should contain ".webp"

    Scenario: Pending blog list requires an admin token
        Given I clear my authorization token
        When I send a "GET" request to "Get Pending Blogs" endpoint
        Then the response status should be 401
        Given I am authenticated
        When I send a "GET" request to "Get Pending Blogs" endpoint
        Then the response status should be 403

    Scenario: Admin can list pending blog posts
        Given I am authenticated as admin
        When I send a "GET" request to "Get Pending Blogs" endpoint
        Then the response status should be 200

    Scenario: Usage guide posts are published under the kullanim-rehberi category
        Given I am authenticated as admin
        When I send a "POST" request to "Admin Seed Blogs" endpoint
        Then the response status should be 200
        Given blog slug is "parfumetre-nasil-kullanilir"
        When I send a "GET" request to "Get Blog Detail" endpoint
        Then the response status should be 200
        And the response body path "category" should be "kullanim-rehberi"
