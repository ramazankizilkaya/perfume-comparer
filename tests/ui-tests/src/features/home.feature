@ui @home
Feature: Home page

    @smoke
    Scenario Outline: As a user on <device>, I should see key sections and no overflow, When I navigate to the home page
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        Then element "Home Kesfet Section" should be displayed
        And element "Home Populer Section" should be displayed
        And element "Home Markalar Section" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should see filtered perfumes, When I interact with the gender preference control
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        And I select gender preference as "Kadın"
        Then element "Perfume Card" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should navigate to brands page, When I click the Markalar view all link
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        And I click on "Home Markalar View All Link"
        Then element "Brands Search Input" should be displayed

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |
