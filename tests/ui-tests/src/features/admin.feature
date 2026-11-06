@ui @admin
Feature: Admin management

    @smoke
    Scenario Outline: As a visitor on <device>, I should see the panel password form, When I navigate to admin page without signing in
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Admin" page
        Then element "Admin Title" should be displayed
        And element "Admin Login Prompt" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As an admin on <device>, I should see the user photos moderation tab, When I sign in to the admin panel
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Admin" page
        And I sign in to the admin panel with the configured password
        And I click on "Admin Photos Tab"
        Then element "Admin Photos Title" should be displayed
        And element "Admin Photos Pending Chip" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |
