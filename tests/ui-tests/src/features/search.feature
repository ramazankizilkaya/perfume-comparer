@ui @search
Feature: Detailed search

    @smoke
    Scenario Outline: As a user on <device>, I should see search results, When I enter a query into search input
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Detailed Search" page
        And I enter "sauvage" into "Search Page Input"
        Then search result cards count should be greater than 0
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should reset all active filters, When I click the clear all button
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Detailed Search" page
        And I enter "dior" into "Search Page Input"
        And I click on "Search Clear All Button"
        Then element "Search Page Input" should be displayed

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |
