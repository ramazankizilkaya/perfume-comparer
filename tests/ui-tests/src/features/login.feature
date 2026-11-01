@ui @auth @dev-only
Feature: Login modal and session management
    # Giriş ayrı bir sayfa değil, açılır penceredir. Bu senaryolar "Geliştirici girişi (mock)"
    # düğmesine dayanır. Düğme yalnızca geliştirme sunucusunda (npm run dev) görünür;
    # production build'de (npm run build && next start) bilerek gizlidir.
    # Bu dosyayı yalnızca dev sunucuya karşı koşun.

    @smoke
    Scenario Outline: As a user on <device>, I should see the login modal with developer login, When I open it from the header
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        And I open the login modal from the header
        Then element "Login Modal" should be displayed
        And element "Login Developer Button" should be displayed
        And element "Login Modal Privacy Link" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should stay on the page, When I close the login modal
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        And I open the login modal from the header
        And I click on "Login Modal Close Button"
        Then element "Login Modal" should not be displayed
        And current page path should be "/tr"

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should activate session, When I click developer mock login
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Home" page
        And I open the login modal from the header
        And I sign in with developer mock login
        Then element "Login Modal" should not be displayed
        And user session should be active in header

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should stay on the brand page, When I sign in from the header
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "/tr/marka/dior" page
        And I open the login modal from the header
        And I sign in with developer mock login
        Then current page path should be "/tr/marka/dior"
        And user session should be active in header

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should land on the home page, When I open the removed login page address
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Old Login" page
        Then current page path should be "/tr"

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should see the article form, When I sign in from the new article login prompt
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Blog" page
        And I click on "Blog Write Button"
        And I click on "Login Prompt Link"
        And I sign in with developer mock login
        Then current page path should be "/tr/blog"
        And element "Blog Write Form Title" should be displayed

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should see the comment box, When I sign in from the comment login button
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Sample Perfume" page
        And I click on "Comment Login Link"
        And I sign in with developer mock login
        Then current page path should be "/tr/parfum/erkek/dior/dior-sauvage"
        And element "Comment Textarea" should be displayed

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should see the perfume advisor form, When I sign in from the advisor login button
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Sample Perfume" page
        And I toggle the mobile menu drawer
        And I click on "Header Advisor Button"
        And I click on "Modal Login Link"
        And I sign in with developer mock login
        Then current page path should be "/tr/parfum/erkek/dior/dior-sauvage"
        And element "Advisor Modal Content" should be displayed

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should see the review form, When I sign in from the review login button
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Sample Perfume" page
        And I click on "Perfume Review Open Button"
        And I click on "Modal Login Link"
        And I sign in with developer mock login
        Then current page path should be "/tr/parfum/erkek/dior/dior-sauvage"
        And element "Review Modal Form" should be displayed

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |
