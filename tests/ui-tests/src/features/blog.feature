@ui @blog
Feature: Blog and articles

    @smoke
    Scenario Outline: As a user on <device>, I should see published articles, When I navigate to blog page
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Blog" page
        Then element "Blog Title" should be displayed
        And element "Blog Article Card" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As a user on <device>, I should see my articles page, When I open the my articles page
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "My Articles" page
        Then element "My Articles Title" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |

    Scenario Outline: As an authenticated user on <device>, I should see character limits and WebP image upload on the article editor, When I open the write form
        Given I set screen size to "<width>"x"<height>" for "<device>"
        When I navigate to "Blog" page
        And I sign in with developer mock login
        And I click on "Blog Write Button"
        Then element "Blog Write Form Title" should be displayed
        And elements "Blog Title Input, Blog Cover Upload Button, Blog Body Textarea, Blog Char Limit Counter" should be displayed
        And no horizontal overflow should be detected on the page

        Examples:
            | device  | width | height |
            | desktop | 1440  | 900    |
            | mobile  | 375   | 812    |
