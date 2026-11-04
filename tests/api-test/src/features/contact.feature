@contact
Feature: Contact Form
    As a visitor of Parfümetre
    I want to send a message through the contact page
    So that the admin can read it in the admin panel, while bots are kept out

    Scenario: The contact form token is issued without logging in
        When I send a "GET" request to "Get Contact Form Token" endpoint
        Then the response status should be 200 and should match "Get Contact Form Token" response scheme

    Scenario: A visitor sends a message and the admin reads, marks and deletes it
        Given I obtain a contact form token
        And I wait long enough to fill the contact form
        When I submit the contact form with "Contact Message" payload
        Then the response status should be 200
        And the response body should contain "ulaştı"
        Given I am authenticated as admin
        Then the admin contact list "should" contain the last contact message
        When I send a "POST" request to the last contact message "read" admin endpoint
        Then the response status should be 200
        And the response body path "isRead" should be "true"
        When I send a "DELETE" request to the last contact message "delete" admin endpoint
        Then the response status should be 200
        When I send a "DELETE" request to the last contact message "delete" admin endpoint
        Then the response status should be 404

    Scenario: The same form token cannot be used twice
        Given I obtain a contact form token
        And I wait long enough to fill the contact form
        When I submit the contact form with "Contact Message" payload
        Then the response status should be 200
        And I save "lastContactMessage" as "savedContactMessage"
        When I submit the contact form with "Contact Message" payload
        Then the response status should be 400
        And the response body should contain "doğrulanamadı"
        Given I save "savedContactMessage" as "lastContactMessage"
        And I am authenticated as admin
        Then the admin contact list "should" contain the last contact message
        When I send a "DELETE" request to the last contact message "delete" admin endpoint
        Then the response status should be 200

    Scenario: A form sent right after it opens is rejected
        Given I obtain a contact form token
        When I submit the contact form with "Contact Message" payload
        Then the response status should be 400
        And the response body should contain "çok hızlı"

    Scenario: A form without a token or with a tampered token is rejected
        When I submit the contact form with "Contact Message" payload and no token
        Then the response status should be 400
        Given I obtain a contact form token
        And I wait long enough to fill the contact form
        When I submit the contact form with "Contact Message" payload and a tampered token
        Then the response status should be 400
        And the response body should contain "doğrulanamadı"

    Scenario: A bot that fills the hidden field gets a success answer but nothing is saved
        Given I obtain a contact form token
        And I wait long enough to fill the contact form
        When I submit the contact form with "Contact Message Honeypot" payload
        Then the response status should be 200
        Given I am authenticated as admin
        Then the admin contact list "should not" contain the last contact message

    Scenario: An invalid e-mail address or too many links are rejected
        Given I obtain a contact form token
        And I wait long enough to fill the contact form
        When I submit the contact form with "Contact Message Invalid Email" payload
        Then the response status should be 400
        And the response body should contain "e-posta"
        When I submit the contact form with "Contact Message Too Many Links" payload
        Then the response status should be 400
        And the response body should contain "bağlantı"

    Scenario: Contact messages are only visible to admins
        Given I clear my authorization token
        When I send a "GET" request to "Admin Contact Messages" endpoint
        Then the response status should be 401
        Given I am authenticated
        When I send a "GET" request to "Admin Contact Messages" endpoint
        Then the response status should be 403
