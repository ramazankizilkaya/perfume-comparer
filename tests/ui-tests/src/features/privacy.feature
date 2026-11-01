@ui @privacy
Feature: Privacy policy page
    # Google ve Facebook giriş ayarları bu sayfanın herkese açık adresini ister.

    @smoke
    Scenario Outline: As a user on <device>, I should read the privacy policy, When I open the privacy policy page
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Privacy Policy" page
        Then element "Privacy Policy Title" should be displayed
        And element "Privacy Policy Deletion Section" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should reach the privacy policy, When I click the footer privacy link
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        And I click on "Footer Privacy Link"
        Then current page path should be "/tr/gizlilik-politikasi"
        And element "Privacy Policy Title" should be displayed

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |
