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

    Scenario Outline: As a user on <device>, I should see only the menu button and a wide logo in the header, When I open the home page
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        Then header should show only the menu button
        And header logo should be at least 220 pixels wide
        And no horizontal overflow should be detected on the page

        Examples:
            | device | width | height |
            | mobile | 375   | 812    |

    Scenario Outline: As a user on <device>, I should see the same logo size in the header, When I open the home page
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        Then header logo should be 42 pixels high
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | tablet  | 930   | 876    |
            | tablet  | 773   | 736    |

    Scenario Outline: As a user on <device>, I should see the header menu in a single row next to the logo, When I open the home page
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        Then header menu should be in the same row as the logo
        And no horizontal overflow should be detected on the page

        Examples:
            | device         | width | height |
            | desktop        | 1440  | 900    |
            | narrow desktop | 980   | 800    |
            | narrow desktop | 915   | 800    |
            | narrow desktop | 890   | 876    |
            | tablet         | 850   | 900    |
            | tablet         | 800   | 900    |
            | tablet         | 773   | 736    |

    Scenario Outline: As a user on <device>, I should see no hamburger menu button when the whole menu fits, When I open the home page
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        Then hamburger menu button should be hidden

        Examples:
            | device         | width | height |
            | narrow desktop | 915   | 800    |
            | narrow desktop | 890   | 876    |
            | tablet         | 850   | 900    |

    Scenario Outline: As a user on <device>, I should find only the overflowing links in the hamburger menu, When I open the menu
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        And I remember the position of the header search bar
        And I toggle the mobile menu drawer
        Then hamburger menu should list only "Markalar, Rehber"
        And the header search bar should be in the same position

        Examples:
            | device | width | height |
            | tablet | 849   | 900    |
            | tablet | 773   | 736    |

    Scenario Outline: As a user on <device>, I should see the hamburger menu float over the page and close, When I click outside it or press Escape
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        And I remember the position of the header search bar
        And I toggle the mobile menu drawer
        Then element "Hamburger Menu Panel" should be displayed
        And the header search bar should be in the same position
        And hamburger menu should be at most 360 pixels wide
        When I click outside the hamburger menu
        Then hamburger menu should be closed
        When I toggle the mobile menu drawer
        And I press the "Escape" key
        Then hamburger menu should be closed

        Examples:
            | device | width | height |
            | mobile | 375   | 812    |
            | tablet | 800   | 900    |

    Scenario Outline: As a user on <device>, I should find gender, theme and login options in the menu, When I open the mobile menu
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        And I toggle the mobile menu drawer
        Then elements "Mobile Menu Gender Options, Theme Toggle Button, Mobile Menu Login Link" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device | width | height |
            | mobile | 375   | 812    |
