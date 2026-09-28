@ui @brands
Feature: Brand catalog

    @smoke
    Scenario Outline: As a user on <device>, I should filter brands and see results, When I type in the brand search input
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Brands" page
        And I enter "afnan" into "Brands Search Input"
        Then element "Brand Card" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should see brand details and official website link, When I open a brand page
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Sample Brand" page
        Then element "Brand Detail Title" should be displayed
        And element "Brand Official Website Link" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |
