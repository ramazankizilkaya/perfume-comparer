@ui @shared
Feature: Shared UI behavior

    @smoke
    Scenario Outline: As a user on <device>, I should see suggestions and clear the input, When I type in the header search input
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        And I enter "sauvage" into "Header Search Input"
        Then search suggestions should contain at least 1 results
        When I click on "Header Search Clear Button"
        Then element "Header Search Input" should be displayed

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should toggle between dark and light themes, When I click the theme toggle button
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        And I toggle theme between light and dark mode
        Then element "Theme Toggle Button" should be displayed

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should open and close mobile navigation, When I click the mobile menu toggle
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        And I toggle the mobile menu drawer
        Then no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |
