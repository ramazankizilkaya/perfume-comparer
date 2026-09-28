@ui @compare
Feature: Perfume comparison

    @smoke
    Scenario Outline: As a user on <device>, I should see comparison table, When I open a comparison URL
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Compare" page
        Then element "Compare Table" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should verify comparison state in a fresh browser launch, When I store comparison url
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Compare" page
        And I store current url as "compareUrl"
        And in a new browser launch I navigate to stored url "compareUrl"
        Then element "Compare Table" should be displayed

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |
