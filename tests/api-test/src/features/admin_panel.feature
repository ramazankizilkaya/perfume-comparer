@admin @admin-panel
Feature: Admin Panel (password login, analytics, moderation)
    As the site owner
    I want a password protected admin panel with analytics, blog approval and comment moderation

    Scenario: Admin panel login with a wrong password is rejected with 401
        Given I clear my authorization token
        When I send a "POST" request to "Admin Login" endpoint with "Admin Login Wrong" payload
        Then the response status should be 401
        And the response body should contain "Şifre yanlış"

    Scenario: Admin panel login with an empty password is rejected with 401
        Given I clear my authorization token
        When I send a "POST" request to "Admin Login" endpoint with "Admin Login Empty" payload
        Then the response status should be 401

    Scenario: Admin panel login with the configured password returns an Admin token
        Given I am authenticated with the admin panel password
        When I send a "GET" request to "Me" endpoint
        Then the response status should be 200
        And the response body path "role" should be "Admin"

    Scenario: Analytics requires an admin token
        Given I clear my authorization token
        When I send a "GET" request to "Admin Analytics" endpoint
        Then the response status should be 401
        Given I am authenticated
        When I send a "GET" request to "Admin Analytics" endpoint
        Then the response status should be 403

    Scenario: Admin sees analytics for the last 30 days
        Given I am authenticated with the admin panel password
        When I send a "GET" request to "Admin Analytics" endpoint
        Then the response status should be 200 and should match "Admin Analytics" response scheme

    Scenario: Admin lists blog posts with their full body for review
        Given I am authenticated as admin
        When I send a "GET" request to "Admin Blogs" endpoint
        Then the response status should be 200 and should match "Admin Blogs" response scheme

    Scenario: Blog list with an unknown status is rejected with 400
        Given I am authenticated as admin
        When I send a "GET" request to "Admin Blogs Invalid Status" endpoint
        Then the response status should be 400

    Scenario: Admin lists perfume and comparison comments
        Given I am authenticated as admin
        When I send a "GET" request to "Admin Perfume Comments" endpoint
        Then the response status should be 200 and should match "Admin Comments" response scheme
        When I send a "GET" request to "Admin Comparison Comments" endpoint
        Then the response status should be 200 and should match "Admin Comments" response scheme

    Scenario: Comment list with an unknown kind is rejected with 400
        Given I am authenticated as admin
        When I send a "GET" request to "Admin Comments Invalid Kind" endpoint
        Then the response status should be 400

    Scenario: Hiding a comment that does not exist returns 404
        Given I am authenticated as admin
        When I send a "POST" request to "Admin Hide Missing Comment" endpoint
        Then the response status should be 404
        When I send a "POST" request to "Admin Hide Comment Invalid Kind" endpoint
        Then the response status should be 400

    Scenario: Hiding a comment requires an admin token
        Given I am authenticated
        When I send a "POST" request to "Admin Hide Missing Comment" endpoint
        Then the response status should be 403

    Scenario: Admin lists perfume advisor recommendations
        Given I am authenticated as admin
        When I send a "GET" request to "Admin Recommendations" endpoint
        Then the response status should be 200 and should match "Admin Recommendations" response scheme

    Scenario: Admin lists user uploaded photos for moderation
        Given I am authenticated as admin
        When I send a "GET" request to "Admin Photos" endpoint
        Then the response status should be 200 and should match "Admin Photos" response scheme

    Scenario: Photo list with an unknown status is rejected with 400
        Given I am authenticated as admin
        When I send a "GET" request to "Admin Photos Invalid Status" endpoint
        Then the response status should be 400

    Scenario: Approving a missing photo returns 404 and requires an admin token
        Given I am authenticated
        When I send a "POST" request to "Admin Approve Missing Photo" endpoint
        Then the response status should be 403
        Given I am authenticated as admin
        When I send a "POST" request to "Admin Approve Missing Photo" endpoint
        Then the response status should be 404
