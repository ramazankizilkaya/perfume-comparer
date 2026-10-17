@ui @admin
Feature: Admin management

    @smoke
    Scenario Outline: As a visitor on <device>, I should see a login prompt instead of seed controls, When I navigate to admin page without signing in
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Admin" page
        Then element "Admin Title" should be displayed
        And element "Admin Login Prompt" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |
