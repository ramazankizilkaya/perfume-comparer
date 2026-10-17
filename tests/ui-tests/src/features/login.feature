@ui @auth @dev-only
Feature: Login and session management
    # Bu senaryolar "Geliştirici girişi (mock)" düğmesine dayanır. Düğme yalnızca geliştirme
    # sunucusunda (npm run dev) görünür; production build'de (npm run build && next start)
    # bilerek gizlidir. Bu dosyayı yalnızca dev sunucuya karşı koşun.

    @smoke
    Scenario Outline: As a user on <device>, I should see developer login option, When I navigate to login page
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Login" page
        Then element "Login Developer Button" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should activate session, When I click developer mock login
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Login" page
        And I sign in with developer mock login
        Then user session should be active in header

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |
