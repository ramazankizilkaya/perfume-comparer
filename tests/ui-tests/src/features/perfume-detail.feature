@ui @perfume-detail
Feature: Perfume detail page

    @smoke
    Scenario Outline: As a user on <device>, I should see perfume details and metrics, When I navigate to a perfume detail page
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Sample Perfume" page
        Then element "Perfume Detail Title" should be displayed
        And element "Perfume Notes Section" should be displayed
        And element "Perfume Accords Section" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should interact with compare and favorite buttons, When I inspect the hero actions
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Sample Perfume" page
        And I toggle compare button on perfume hero
        And I toggle favorite button on perfume hero
        Then element "Perfume Hero Compare Button" should be displayed

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should verify perfume state in a fresh browser launch, When I store the perfume url
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Sample Perfume" page
        And I store current url as "perfumeDetailUrl"
        And in a new browser launch I navigate to stored url "perfumeDetailUrl"
        Then element "Perfume Detail Title" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |
